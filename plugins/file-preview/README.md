# file-preview

Claude가 만들거나 고친 이미지·문서 파일을 "파일 미리보기" 패널에서 바로 보여주는 mod입니다.

- **자동 감지**: `Write`·`Edit`로 쓴 파일과, `Bash` 명령에 나온 경로 중 실제로 있는 파일을 목록에 올리고 패널을 엽니다.
- **형식별 미리보기**
  - 이미지(png, jpg, gif, webp): 데스크톱·VS Code·모바일은 패널에 그림으로 표시(약 95KB까지), 터미널은 PNG를 kitty·Ghostty 등에서 그림으로 표시
  - SVG: 그대로 표시
  - Markdown: 렌더링해서 표시
  - CSV·TSV: 앞 20행을 표로 표시
  - JSON·YAML·코드·HTML·텍스트: 코드 블록으로 표시
  - PDF·Office(docx, pptx, xlsx)·Keynote 등: 정보만 표시하고 `기본 앱으로 열기` 버튼 제공
- **목록**: 최근 파일 8개를 버튼으로 전환, `목록에서 빼기`로 정리
- **`/preview <경로>`**: 원하는 파일을 직접 미리보기
- **`/preview on` · `/preview off`**: 새 파일이 생길 때 패널 자동 열기 켜기/끄기(기본 켬, 세션이 바뀌어도 유지)
