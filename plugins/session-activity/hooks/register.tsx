import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ToolCall } from '../types'

const PANE = 'session-activity'
const TITLE = '세션 활동'
const calls = atom({ plugin: 'session-activity', key: 'calls' } as const, [])
const total = atom({ plugin: 'session-activity', key: 'total' } as const, 0)
const failed = atom({ plugin: 'session-activity', key: 'failed' } as const, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'activity', description: '세션 활동 패널 열기' })
    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('command.run', { command: 'activity' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: '세션 활동 패널을 열었습니다.' }
  })

  on('tool.call', async ($, e, next) => {
    const call: ToolCall = { id: e.tool_use_id, tool: e.tool, isDone: false, isError: false }
    await update($, calls, list => [...list, call].slice(-200))
    const count = await update($, total, n => n + 1)
    $.ui.status(`도구 ${count}회 · 실행 중: ${e.tool}`)

    const ran = await next(e)
    const isError = ran.deny !== undefined || ran.isError === true
    await update($, calls, list =>
      list.map(one => (one.id === call.id ? { ...one, isDone: true, isError } : one)),
    )
    const fails = isError ? await update($, failed, n => n + 1) : await read($, failed)
    $.ui.status(`도구 ${count}회${fails > 0 ? ` · 실패 ${fails}` : ''}`)

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, calls)
    const count = await read($, total)
    const fails = await read($, failed)

    const byTool = new Map<string, number>()
    for (const one of list) byTool.set(one.tool, (byTool.get(one.tool) ?? 0) + 1)
    const top = [...byTool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    const rows = e.viewport?.rows ?? 24
    const room = Math.max(1, rows - 6 - top.length)

    return (
      <Box flexDirection="column">
        <Text bold>
          전체 {count}회 · 실패 {fails}회
        </Text>
        {top.map(([tool, n]) => (
          <Text dimColor>
            {tool} {n}
          </Text>
        ))}
        <Text bold>최근 호출</Text>
        {list.length === 0 && <Text dimColor>아직 도구 호출이 없습니다.</Text>}
        {list.slice(-room).map(call => (
          <Text dimColor={call.isDone && !call.isError} color={call.isError ? 'red' : undefined}>
            {call.isDone ? (call.isError ? '실패' : '완료') : '실행'} {call.tool}
          </Text>
        ))}
      </Box>
    )
  })
}
