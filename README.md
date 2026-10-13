# claude-mods

Claude Code mod 모음 저장소입니다. 저장소 전체가 하나의 마켓플레이스(`wonr-mods`)이고, 각 mod는 `plugins/` 아래에 있습니다.

## 설치

터미널의 Claude Code 프롬프트에서 원하는 mod 이름으로 설치합니다.

```
/plugin install <mod> --marketplace wonr-spec/claude-mods
```

처음 한 번은 `Add marketplace?`에 `y`로 답하고, 범위(user 권장)를 고릅니다.

## mod 목록

| mod | 설명 |
| --- | --- |
| [session-activity](plugins/session-activity) | 세션 도구 호출 현황 패널과 상태줄, `/activity` 명령 |
| [prompt-suggest](plugins/prompt-suggest) | 턴이 끝나면 다음 프롬프트 후보 3개를 제안, `/suggest` 명령 |
| [file-preview](plugins/file-preview) | Claude가 만든 이미지·문서 파일을 패널에서 미리보기, `/preview` 명령 |

## 새 mod 추가

1. `plugins/<mod>/` 폴더를 만들고 다음 파일을 넣습니다.
   - `.claude-plugin/plugin.json` — `name`은 폴더 이름과 같게
   - `hooks/hooks.json` — `{ "modules": ["./register.tsx"] }`
   - `hooks/register.tsx` — hooks 모듈
   - (`$.state`를 쓰면) `types/index.d.ts`, `plugin.json`의 `"types"`에 지정
   - `tests/*.test.ts` — 동작 테스트
   - `README.md` — 간단한 설명
2. `.claude-plugin/marketplace.json`의 `plugins`에 항목을 추가합니다.
   ```json
   { "name": "<mod>", "source": "./plugins/<mod>", "description": "<한 줄 설명>" }
   ```
3. 위 표에 한 줄을 추가합니다.
4. `scripts/check.sh`로 전체 검증과 테스트를 돌립니다.

## 개발 중 실행

```
claude --plugin-dir plugins/<mod>
```
