export type Suggestion = string

declare module 'claude-code' {
  interface PluginState {
    'prompt-suggest': { suggestions: Suggestion[]; isEnabled: boolean; isLoading: boolean }
  }
}
