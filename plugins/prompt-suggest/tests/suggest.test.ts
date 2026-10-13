import { expect, test } from 'claude-code/testing'

import { parseSuggestions } from '../hooks/parse'

const run = (args: string) => ({
  command: 'suggest',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('모델 답에서 후보 3개를 뽑는다', () => {
  expect(parseSuggestions('1. 테스트 작성해줘\n- "PR 올려줘"\n\n• 리팩터링 해줘\n네 번째')).toEqual([
    '테스트 작성해줘',
    'PR 올려줘',
    '리팩터링 해줘',
  ])
})

test('/suggest 는 fork 답으로 후보를 만들고 첫 후보를 제안한다', async ($, on) => {
  const shown: string[] = []
  on('session.start', () => ({}) as never)
  on('command.register', () => ({ value: { command: 'suggest' } }) as never)
  on('model.fork', () =>
    ({ value: { isAnswered: true, text: '테스트 돌려줘\n커밋해줘\nREADME 갱신해줘', usage } }) as never,
  )
  on('prompt.suggest', (_$, e) => {
    shown.push(e.text)
    return { isShown: true } as never
  })

  const r = await $.command.run(run('') as never)
  expect(r.text).toBe('다음 프롬프트 후보를 입력창 위에 표시했습니다.')
  expect(shown).toEqual(['테스트 돌려줘'])
})

test('/suggest off 는 자동 제안을 끄고 저장한다', async ($, on) => {
  const saved: unknown[] = []
  on('session.start', () => ({}) as never)
  on('command.register', () => ({ value: { command: 'suggest' } }) as never)
  on('store.set', (_$, e) => {
    saved.push(e)
    return { value: undefined } as never
  })
  const r = await $.command.run(run('off') as never)
  expect(r.text).toBe('자동 프롬프트 제안을 껐습니다.')
  expect(JSON.stringify(saved)).toContain('false')
})
