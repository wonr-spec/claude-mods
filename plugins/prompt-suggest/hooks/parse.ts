const MAX = 3

export const ASK = [
  '지금까지의 대화를 보고, 사용자가 다음에 보낼 만한 프롬프트 후보를 3개 제안해.',
  '- 사용자 입장에서 쓴 한국어 지시문, 각 40자 이내',
  '- 서로 다른 방향(이어서 진행, 검증/테스트, 개선/정리 등)',
  '- 한 줄에 하나씩, 번호·기호·따옴표·설명 없이 후보 3줄만 출력',
].join('\n')

export function parseSuggestions(text: string): string[] {
  return text
    .split('\n')
    .map(line =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/^["'“]|["'”]$/g, '')
        .trim(),
    )
    .filter(line => line.length > 0 && line.length <= 120)
    .slice(0, MAX)
}
