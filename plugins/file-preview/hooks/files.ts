import type { PreviewKind } from '../types'

const KINDS: Record<string, PreviewKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  svg: 'svg',
  md: 'markdown', markdown: 'markdown',
  csv: 'table', tsv: 'table',
  json: 'code', yaml: 'code', yml: 'code', txt: 'code', log: 'code', xml: 'code',
  swift: 'code', ts: 'code', tsx: 'code', js: 'code', py: 'code', kt: 'code', sh: 'code',
  html: 'html', htm: 'html',
  pdf: 'document', docx: 'document', pptx: 'document', xlsx: 'document',
  key: 'document', pages: 'document', numbers: 'document',
}

export const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
}

export const extOf = (path: string): string => {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot < 1 ? '' : name.slice(dot + 1).toLowerCase()
}

export const baseName = (path: string): string => path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)

export const kindOf = (path: string): PreviewKind | undefined => KINDS[extOf(path)]

/** Bash 명령에 등장하는, 미리보기 가능한 확장자의 경로 후보들. */
export function pathsInCommand(command: string): string[] {
  const found = new Set<string>()
  for (const m of command.matchAll(/"([^"]+)"|'([^']+)'|([^\s;|&<>()'"]+)/g)) {
    const token = (m[1] ?? m[2] ?? m[3] ?? '').replace(/^-[a-zA-Z-]+=/, '')
    if (token.length > 0 && !token.startsWith('-') && !token.includes('*') && kindOf(token) !== undefined) found.add(token)
  }
  return [...found]
}

/** PNG 헤더에서 가로·세로 픽셀. PNG가 아니면 undefined. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const sig = [0x89, 0x50, 0x4e, 0x47]
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return undefined
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

/** 래스터 이미지를 Svg 요소가 그릴 수 있는 SVG 문서로 감싼다. */
export function rasterSvg(base64: string, mime: string, size?: { width: number; height: number }): string {
  const w = size?.width ?? 800
  const h = size?.height ?? 600
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><image width="${w}" height="${h}" href="data:${mime};base64,${base64}" xlink:href="data:${mime};base64,${base64}"/></svg>`
}

/** CSV/TSV 앞부분을 마크다운 표로. */
export function tableMarkdown(text: string, separator: string, maxRows = 20): string {
  const rows = text.split(/\r?\n/).filter(r => r.length > 0).slice(0, maxRows + 1)
  if (rows.length === 0) return '_빈 파일_'
  const cells = rows.map(r => r.split(separator).map(c => c.trim().replace(/^"|"$/g, '').replace(/\|/g, '\\|')))
  const width = Math.max(...cells.map(c => c.length))
  const pad = (c: string[]) => `| ${[...c, ...Array(width - c.length).fill('')].join(' | ')} |`
  const [head = [], ...body] = cells
  return [pad(head), `| ${Array(width).fill('---').join(' | ')} |`, ...body.map(pad)].join('\n')
}

export const formatSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** base64 앞부분만 풀어 헤더 바이트를 얻는다(이미지 크기 판별용). */
export function headerBytes(base64: string, count = 32): Uint8Array {
  const binary = atob(base64.slice(0, Math.ceil(count / 3) * 4))
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}
