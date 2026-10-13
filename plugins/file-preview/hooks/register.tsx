import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PreviewFile } from '../types'
import { MIME, baseName, headerBytes, extOf, formatSize, kindOf, pathsInCommand, pngSize, rasterSvg, tableMarkdown } from './files'

const PANE = 'file-preview'
const TITLE = '파일 미리보기'
const STORE_AUTO = 'isAuto'
const SVG_LIMIT = 131072
const TEXT_LIMIT = 20000
const TERMINAL_IMAGE_LIMIT = 2 * 1024 * 1024

const files = atom({ plugin: 'file-preview', key: 'files' } as const, [] as PreviewFile[])
const selected = atom({ plugin: 'file-preview', key: 'selected' } as const, null as string | null)
const isAuto = atom({ plugin: 'file-preview', key: 'isAuto' } as const, true)

async function track($: EngineInterface, path: string) {
  const kind = kindOf(path)
  if (kind === undefined) return
  const stat = await $.fs.stat(path).catch(() => undefined)
  if (stat?.kind !== 'file') return
  const at = await $.clock.now()
  await update($, files, list => [{ path, kind, at }, ...list.filter(f => f.path !== path)].slice(0, 30))
  await update($, selected, () => path)
  if (await read($, isAuto)) await $.ui.open({ id: PANE, title: TITLE })
}

async function openExternally($: EngineInterface, path: string) {
  const mac = await $.process.run(['open', path]).catch(() => undefined)
  if (mac?.exitCode === 0) return
  const linux = await $.process.run(['xdg-open', path]).catch(() => undefined)
  if (linux?.exitCode !== 0) $.ui.toast(`열 수 없습니다: ${baseName(path)}`)
}

async function runPreview($: EngineInterface, args: string): Promise<string> {
  const arg = args.trim()
  if (arg === 'on' || arg === 'off') {
    const value = arg === 'on'
    await $.store.set(STORE_AUTO, value)
    await update($, isAuto, () => value)

    return `새 파일 자동 미리보기를 ${value ? '켰' : '껐'}습니다.`
  }
  if (arg !== '') {
    const path = arg.replace(/^['"]|['"]$/g, '')
    if (kindOf(path) === undefined) return `미리보기를 지원하지 않는 형식입니다: ${baseName(path)}`
    if (!(await $.fs.exists(path))) return `파일이 없습니다: ${path}`
    await track($, path)
  }
  const { isPlaced } = await $.ui.open({ id: PANE, title: TITLE })

  return isPlaced
    ? '파일 미리보기 패널을 열었습니다.'
    : '파일 미리보기 패널을 열려고 했지만, 지금 화면(앱)이 mod 패널을 표시하지 않습니다.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'preview',
      description: '파일 미리보기: /preview <경로>로 열기, /preview on|off로 자동 열기 켜기/끄기',
    })
    const stored = await $.store.get(STORE_AUTO)
    await update($, isAuto, () => stored !== false)

    return next(e)
  })

  on('command.run', { command: 'preview' }, async ($, e) => ({ text: await runPreview($, e.args) }))

  // 슬래시 명령이 command.run으로 오지 않고 프롬프트로 들어올 때의 대체 처리: "/preview <경로>"
  on('prompt.submit', async ($, e, next) => {
    const m = /^\s*\/preview(?:\s+([\s\S]*))?$/.exec(e.text)
    if (m === null) return next(e)
    return { drop: await runPreview($, m[1] ?? '') }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) await track($, e.file_path)
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) await track($, e.file_path)
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      for (const path of pathsInCommand(e.command)) await track($, path)
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text, Button, Markdown, Code, Link } = table
    const Svg = 'Svg' in table ? table.Svg : undefined
    const list = await read($, files)
    const chosen = (await read($, selected)) ?? list[0]?.path ?? null
    const file = list.find(f => f.path === chosen)
    const columns = e.props.bodyColumns

    if (file === undefined) {
      return (
        <Box flexDirection="column">
          <Text dimColor>아직 미리볼 파일이 없습니다.</Text>
          <Text dimColor>Claude가 이미지·문서를 만들면 여기에 나타납니다. /preview 경로 로 직접 열 수도 있습니다.</Text>
        </Box>
      )
    }

    const stat = await $.fs.stat(file.path).catch(() => undefined)
    const ext = extOf(file.path)
    let body: JSX.Element

    if (stat === undefined) {
      body = <Text color="red">파일이 없어졌습니다.</Text>
    } else if (file.kind === 'image') {
      const tooBig = stat.size > 4 * 1024 * 1024
      const bytes = tooBig ? undefined : await $.fs.read(file.path, { as: 'bytes' }).catch(() => undefined)
      if (bytes === undefined) {
        body = <Text dimColor>이미지가 너무 커서 미리보기를 생략했습니다. 아래 버튼으로 여세요.</Text>
      } else if (e.surface === 'terminal') {
        const { Image } = $.ui.resolve(e as typeof e & { surface: 'terminal' })
        body =
          ext === 'png' && stat.size <= TERMINAL_IMAGE_LIMIT ? (
            <Image source={{ png: bytes.base64 }} columns={Math.min(columns, 120)} rows={24} alt={baseName(file.path)} />
          ) : (
            <Text dimColor>터미널에서는 PNG만 그립니다. 아래 버튼으로 여세요.</Text>
          )
      } else {
        const size = ext === 'png' ? pngSize(headerBytes(bytes.base64)) : undefined
        const svg = rasterSvg(bytes.base64, MIME[ext] ?? 'image/png', size)
        body =
          Svg !== undefined && svg.length <= SVG_LIMIT ? (
            <Svg source={svg} alt={baseName(file.path)} />
          ) : (
            <Text dimColor>이미지가 커서({formatSize(stat.size)}) 패널에 그리지 못했습니다. 아래 버튼으로 여세요.</Text>
          )
      }
    } else if (file.kind === 'svg') {
      const text = await $.fs.read(file.path).catch(() => '')
      body =
        Svg !== undefined && text.length <= SVG_LIMIT ? (
          <Svg source={text} alt={baseName(file.path)} />
        ) : (
          <Code source={text.slice(0, TEXT_LIMIT)} language="xml" />
        )
    } else if (file.kind === 'markdown') {
      const text = await $.fs.read(file.path).catch(() => '')
      body = <Markdown text={text.slice(0, TEXT_LIMIT)} />
    } else if (file.kind === 'table') {
      const text = await $.fs.read(file.path).catch(() => '')
      body = <Markdown text={tableMarkdown(text.slice(0, TEXT_LIMIT), ext === 'tsv' ? '\t' : ',')} />
    } else if (file.kind === 'code' || file.kind === 'html') {
      const text = await $.fs.read(file.path).catch(() => '')
      body = <Code source={text.slice(0, TEXT_LIMIT)} language={ext === 'htm' ? 'html' : ext} path={file.path} />
    } else {
      body = <Text dimColor>{ext.toUpperCase()} 문서는 패널에서 그리지 않습니다. 아래 버튼으로 기본 앱에서 여세요.</Text>
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap">
          {list.slice(0, 8).map((f, i) => (
            <Button
              key={`f${i}`}
              label={baseName(f.path)}
              variant={f.path === file.path ? 'primary' : 'secondary'}
              onPress={() => update($, selected, () => f.path)}
            />
          ))}
        </Box>
        <Text bold>{baseName(file.path)}</Text>
        <Text dimColor>
          {file.path}
          {stat !== undefined ? ` · ${formatSize(stat.size)}` : ''}
        </Text>
        {body}
        <Box flexDirection="row">
          <Button key="open" label="기본 앱으로 열기" onPress={() => openExternally($, file.path)} />
          {file.kind === 'html' && <Link href={`file://${file.path}`} label="브라우저로 열기" />}
          <Button
            key="remove"
            label="목록에서 빼기"
            onPress={async () => {
              await update($, files, l => l.filter(f => f.path !== file.path))
              await update($, selected, () => null)
            }}
          />
        </Box>
      </Box>
    )
  })
}
