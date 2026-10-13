import { expect, test } from 'claude-code/testing'

test('도구 호출 수와 실패 수를 상태줄에 보여준다', async ($, on) => {
  const lines: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    lines.push(e.text)
    return { value: undefined }
  })
  on('tool.call', (_$, e) =>
    e.tool === 'Bash'
      ? { result: null, text: 'boom', isError: true as const }
      : { result: null, text: 'ok' },
  )

  await $.tool.call({ tool: 'Read', file_path: 'a.md' })
  await $.tool.call({ tool: 'Bash', command: 'false' })

  expect(lines).toContain('도구 2회 · 실행 중: Bash')
  expect(lines.at(-1)).toBe('도구 2회 · 실패 1')
})
