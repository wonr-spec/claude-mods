# session-activity

도구 사용 중 **실패한 것**과 **보안상 위험해 보이는 것**만 골라 보여주는 mod입니다. 평범하게 성공한 호출은 표시하지 않습니다. 위험한 호출을 막지는 않고 알리기만 합니다.

- **알림(toast)**: 위험해 보이는 호출이 시작될 때 도구와 이유를 띄웁니다.
- **상태줄**: `도구 위험 N · 실패 M`. 둘 다 0이면 비웁니다.
- **"도구 주의 알림" 패널**: 위험한 호출이 생기면 열리고, 위험·실패 항목을 최근 순으로 보여줍니다. `목록 비우기`로 초기화합니다.
- **`/activity`**: 패널 다시 열기

## 위험으로 보는 경우

- Bash: `rm -rf`, `sudo`, `curl … | sh`, `chmod 777`, `git push --force`, `git reset --hard`, `git clean -f`, `gh repo delete`, `dd`·`mkfs`·`diskutil erase`, `/usr/bin/security`(키체인), `~/.ssh`·`~/.aws` 등 인증 정보 경로, 토큰·credentials 파일, 환경 변수를 외부로 보내는 파이프, 샌드박스 해제 실행
- Write·Edit·Read: `.env`, `~/.ssh`·`~/.aws` 등 인증 정보 폴더·파일, `/etc`, 셸 시작 설정(`.zshrc` 등), `.git/hooks`, `~/Library/LaunchAgents`

규칙은 `hooks/risk.ts`에 있습니다. 명령 문장을 패턴으로 보는 방식이라 모든 위험을 잡지는 못하고, 가끔 안전한 명령을 위험으로 표시할 수 있습니다.
