type Rule = { pattern: RegExp; reason: string }

const BASH_RULES: Rule[] = [
  { pattern: /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*[rR]|--recursive\s+--force|--force\s+--recursive)\b/, reason: '강제 재귀 삭제(rm -rf)' },
  { pattern: /(^|[\s;&|(])sudo\s/, reason: '관리자 권한 실행(sudo)' },
  { pattern: /\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z)?sh\b/, reason: '내려받은 스크립트 바로 실행' },
  { pattern: /\bchmod\s+(-R\s+)?0?777\b/, reason: '파일 권한 전체 개방(chmod 777)' },
  { pattern: /\bgit\s+push\b[^;&|]*(\s--force(-with-lease)?\b|\s-f\b)/, reason: 'git 강제 push' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: '변경 사항 버리기(git reset --hard)' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/, reason: '추적 안 되는 파일 삭제(git clean)' },
  { pattern: /\bgh\s+repo\s+delete\b/, reason: 'GitHub 저장소 삭제' },
  { pattern: /\b(dd\s+if=|mkfs(\.\w+)?\s|diskutil\s+(erase|partition))/, reason: '디스크 직접 쓰기' },
  { pattern: /(\/usr\/bin\/security\b|(^|[\s;&|(])security\s+(find|dump|export|delete)-)/, reason: '키체인 접근(security)' },
  { pattern: /(~|\$HOME|\/Users\/[^/\s]+|\/root)\/\.(ssh|aws|gnupg|kube)\b|\bid_(rsa|ed25519|ecdsa)\b|\.netrc\b/, reason: '인증 정보 경로 접근' },
  { pattern: /(_token|\.token|credentials?)(\.json)?\b/i, reason: '토큰·자격 증명 파일 접근' },
  { pattern: /\b(printenv|env)\b[^;&]*\|\s*(curl|wget|nc)\b/, reason: '환경 변수 외부 전송' },
]

const SENSITIVE_PATH: Rule[] = [
  { pattern: /(^|\/)\.env(\.[\w-]+)?$/, reason: '환경 변수 파일(.env)' },
  { pattern: /(^|\/)\.(ssh|aws|gnupg|kube)\//, reason: '인증 정보 폴더' },
  { pattern: /(^|\/)(id_(rsa|ed25519|ecdsa)|\.netrc|credentials?(\.json)?|[^/]*_token)$/i, reason: '인증 정보 파일' },
  { pattern: /^\/etc\//, reason: '시스템 설정(/etc)' },
  { pattern: /(^|\/)\.(zshrc|bashrc|bash_profile|profile|zprofile)$/, reason: '셸 시작 설정' },
  { pattern: /(^|\/)\.git\/hooks\//, reason: 'git hook' },
  { pattern: /(^|\/)Library\/LaunchAgents\//, reason: '자동 실행 등록(LaunchAgents)' },
]

const firstMatch = (rules: Rule[], text: string): string | undefined => rules.find(r => r.pattern.test(text))?.reason

/** 도구 호출이 보안상 위험해 보이면 그 이유를, 아니면 undefined. */
export function riskOf(tool: string, input: Record<string, unknown>): string | undefined {
  if (tool === 'Bash') {
    const command = typeof input.command === 'string' ? input.command : ''
    if (input.dangerouslyDisableSandbox === true) return '샌드박스 해제 실행'
    return firstMatch(BASH_RULES, command)
  }
  const path = [input.file_path, input.notebook_path, input.path].find((v): v is string => typeof v === 'string')
  if (path === undefined) return undefined
  const reason = firstMatch(SENSITIVE_PATH, path)
  if (reason === undefined) return undefined
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') return `${reason} 수정`
  if (tool === 'Read') return `${reason} 읽기`
  return undefined
}

/** 목록에 보여줄 한 줄 요약. */
export function summaryOf(tool: string, input: Record<string, unknown>): string {
  const pick = [input.command, input.file_path, input.notebook_path, input.url, input.pattern, input.path]
  const text = pick.find((v): v is string => typeof v === 'string') ?? ''
  const line = text.split('\n')[0] ?? ''
  return line.length > 80 ? `${line.slice(0, 79)}…` : line
}

/** 실패 결과에서 사유 한 줄. */
export function failureOf(result: { deny?: string; isError?: boolean; text?: string }): string | undefined {
  if (result.deny !== undefined) return `거부됨: ${result.deny.split('\n')[0]}`
  if (result.isError !== true) return undefined
  const line = (result.text ?? '').split('\n').find(l => l.trim() !== '') ?? '오류'
  return line.length > 120 ? `${line.slice(0, 119)}…` : line
}
