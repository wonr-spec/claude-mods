import { expect, test } from 'claude-code/testing'

import { headerBytes, kindOf, pathsInCommand, pngSize, rasterSvg, tableMarkdown } from '../hooks/files'

// 1x1 PNG
const PNG_1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

test('확장자로 종류를 고른다', () => {
  expect(kindOf('/a/b/chart.PNG')).toBe('image')
  expect(kindOf('report.md')).toBe('markdown')
  expect(kindOf('deck.pptx')).toBe('document')
  expect(kindOf('Makefile')).toBeUndefined()
})

test('Bash 명령에서 결과 파일 경로를 뽑는다', () => {
  expect(
    pathsInCommand('python3 plot.py --out=out/chart.png && convert "a b.jpg" x.webp; ls *.png'),
  ).toEqual(['plot.py', 'out/chart.png', 'a b.jpg', 'x.webp'])
})

test('PNG 크기를 읽고 SVG로 감싼다', () => {
  const size = pngSize(headerBytes(PNG_1x1))
  expect(size).toEqual({ width: 1, height: 1 })
  const svg = rasterSvg(PNG_1x1, 'image/png', size)
  expect(svg).toContain('viewBox="0 0 1 1"')
  expect(svg).toContain('data:image/png;base64,')
})

test('CSV를 마크다운 표로 만든다', () => {
  expect(tableMarkdown('a,b\n1,2\n3', ',')).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 |  |')
})

test('"/preview <경로>" 프롬프트는 턴 없이 처리한다', async ($, on) => {
  on('fs.exists', () => ({ value: false }) as never)
  const r = await $.prompt.submit({ text: '/preview 없는파일.png' } as never)
  expect(r).toEqual({ drop: '파일이 없습니다: 없는파일.png' })
})
