export type PreviewKind = 'image' | 'svg' | 'markdown' | 'table' | 'code' | 'html' | 'document'

export type PreviewFile = { path: string; kind: PreviewKind; at: number }

declare module 'claude-code' {
  interface PluginState {
    'file-preview': { files: PreviewFile[]; selected: string | null; isAuto: boolean }
  }
}
