export type ToolCall = { id: string; tool: string; isDone: boolean; isError: boolean }

declare module 'claude-code' {
  interface PluginState {
    'session-activity': { calls: ToolCall[]; total: number; failed: number }
  }
}
