import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Suggestion } from '../types'
import { ASK, parseSuggestions } from './parse'

const suggestions = atom({ plugin: 'prompt-suggest', key: 'suggestions' } as const, [] as Suggestion[])
const isEnabled = atom({ plugin: 'prompt-suggest', key: 'isEnabled' } as const, true)
const isLoading = atom({ plugin: 'prompt-suggest', key: 'isLoading' } as const, false)

const STORE_KEY = 'isEnabled'

async function refresh($: EngineInterface) {
  await update($, isLoading, () => true)
  try {
    const reply = await $.model.fork({ prompt: ASK })
    const list = reply.isAnswered ? parseSuggestions(reply.text) : []
    await update($, suggestions, () => list)
    const first = list[0]
    if (first !== undefined) await $.prompt.suggest({ text: first })
  } finally {
    await update($, isLoading, () => false)
  }
}

async function runSuggest($: EngineInterface, args: string): Promise<string> {
  const arg = args.trim().toLowerCase()
  if (arg === 'on' || arg === 'off') {
    const value = arg === 'on'
    await $.store.set(STORE_KEY, value)
    await update($, isEnabled, () => value)
    if (!value) await update($, suggestions, () => [])

    return `자동 프롬프트 제안을 ${value ? '켰' : '껐'}습니다.`
  }
  await refresh($)

  return '다음 프롬프트 후보를 입력창 위에 표시했습니다.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'suggest',
      description: '프롬프트 제안: 인자 없으면 지금 제안, on/off로 자동 제안 켜기/끄기',
    })
    const stored = await $.store.get(STORE_KEY)
    await update($, isEnabled, () => stored !== false)

    return next(e)
  })

  on('command.run', { command: 'suggest' }, async ($, e) => ({ text: await runSuggest($, e.args) }))

  on('prompt.submit', async ($, e, next) => {
    // 슬래시 명령이 command.run으로 오지 않고 프롬프트로 들어올 때의 대체 처리: "/suggest [on|off]"
    const m = /^\s*\/suggest(?:\s+(on|off))?\s*$/i.exec(e.text)
    if (m !== null) return { drop: await runSuggest($, m[1] ?? '') }
    await update($, suggestions, () => [])

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.reason === 'answer' && (await read($, isEnabled))) void refresh($)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, suggestions)
    const loading = await read($, isLoading)
    if (e.props.hasSurvey || (list.length === 0 && !loading)) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)

    if (list.length === 0) {
      return (
        <Box>
          <Text dimColor>다음 프롬프트 후보를 만드는 중…</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>다음 프롬프트 제안 (누르면 입력창에 채움)</Text>
        {list.map((text, i) => (
          <Button key={`s${i}`} label={text} onPress={() => $.prompt.fill({ text })} />
        ))}
        <Button key="close" label="닫기" onPress={() => update($, suggestions, () => [])} />
      </Box>
    )
  })
}
