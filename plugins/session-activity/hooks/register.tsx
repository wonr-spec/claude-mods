import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ToolEvent } from '../types'
import { failureOf, riskOf, summaryOf } from './risk'

const PANE = 'session-activity'
const TITLE = '도구 주의 알림'
const events = atom({ plugin: 'session-activity', key: 'events' } as const, [] as ToolEvent[])
const risky = atom({ plugin: 'session-activity', key: 'risky' } as const, 0)
const failed = atom({ plugin: 'session-activity', key: 'failed' } as const, 0)

async function showStatus($: EngineInterface) {
  const r = await read($, risky)
  const f = await read($, failed)
  const parts = [r > 0 ? `위험 ${r}` : '', f > 0 ? `실패 ${f}` : ''].filter(p => p !== '')
  $.ui.status(parts.length > 0 ? `도구 ${parts.join(' · ')}` : undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'activity', description: '실패하거나 위험한 도구 사용 목록 열기' })
    await showStatus($)
    return next(e)
  })

  on('command.run', { command: 'activity' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: '도구 주의 알림 패널을 열었습니다.' }
  })

  // 슬래시 명령이 command.run으로 오지 않고 프롬프트로 들어올 때의 대체 처리: "/activity"
  on('prompt.submit', async ($, e, next) => {
    if (!/^\s*\/activity\s*$/.test(e.text)) return next(e)
    await $.ui.open({ id: PANE, title: TITLE })
    return { drop: '도구 주의 알림 패널을 열었습니다.' }
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    const risk = riskOf(e.tool, input)
    const summary = summaryOf(e.tool, input)

    if (risk !== undefined) {
      const event: ToolEvent = { id: e.tool_use_id, tool: e.tool, summary, risk, isDone: false }
      await update($, events, list => [...list, event].slice(-100))
      await update($, risky, n => n + 1)
      $.ui.toast(`위험할 수 있는 도구 사용: ${e.tool} — ${risk}`)
      await showStatus($)
      void $.ui.open({ id: PANE, title: TITLE })
    }

    const ran = await next(e)
    const failure = failureOf(ran)

    if (risk !== undefined || failure !== undefined) {
      await update($, events, list => {
        const known = list.some(one => one.id === e.tool_use_id)
        const done = { id: e.tool_use_id, tool: e.tool, summary, risk, failure, isDone: true }
        return known ? list.map(one => (one.id === e.tool_use_id ? done : one)) : [...list, done].slice(-100)
      })
      if (failure !== undefined) {
        await update($, failed, n => n + 1)
        await showStatus($)
      }
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, events)
    const r = await read($, risky)
    const f = await read($, failed)
    const rows = e.viewport?.rows ?? 24
    const room = Math.max(1, Math.floor((rows - 4) / 2))

    return (
      <Box flexDirection="column">
        <Text bold>
          위험 {r}회 · 실패 {f}회
        </Text>
        {list.length === 0 && <Text dimColor>실패하거나 위험한 도구 사용이 아직 없습니다.</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(one => (
            <Box flexDirection="column">
              <Text color={one.risk !== undefined ? 'yellow' : 'red'}>
                {[one.risk !== undefined ? '위험' : '', one.failure !== undefined ? '실패' : ''].filter(s => s !== '').join('·')}{' '}
                {one.tool}
                {!one.isDone ? ' (실행 중)' : ''}: {one.risk ?? one.failure}
              </Text>
              <Text dimColor>
                {'  '}
                {one.summary}
                {one.risk !== undefined && one.failure !== undefined ? ` — ${one.failure}` : ''}
              </Text>
            </Box>
          ))}
        {list.length > 0 && (
          <Button
            key="clear"
            label="목록 비우기"
            onPress={async () => {
              await update($, events, () => [])
              await update($, risky, () => 0)
              await update($, failed, () => 0)
              await showStatus($)
            }}
          />
        )}
      </Box>
    )
  })
}
