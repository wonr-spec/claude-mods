export type ToolEvent = {
  id: string
  tool: string
  /** 무엇을 했는지: Bash 명령 앞부분, 파일 경로 등 */
  summary: string
  /** 보안상 위험하다고 본 이유. 위험하지 않으면 없음 */
  risk?: string
  /** 실패 사유. 성공했거나 아직 실행 중이면 없음 */
  failure?: string
  isDone: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'session-activity': { events: ToolEvent[]; risky: number; failed: number }
  }
}
