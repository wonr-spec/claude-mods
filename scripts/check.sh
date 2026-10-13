#!/usr/bin/env bash
# 모든 mod를 검증하고 테스트하며, marketplace.json 목록과 plugins/ 폴더가 일치하는지 확인한다.
set -euo pipefail
cd "$(dirname "$0")/.."

listed=$(python3 -c 'import json;print("\n".join(sorted(p["name"] for p in json.load(open(".claude-plugin/marketplace.json"))["plugins"])))')
present=$(ls plugins | sort)
if [ "$listed" != "$present" ]; then
  echo "marketplace.json 목록과 plugins/ 폴더가 다릅니다."
  diff <(echo "$listed") <(echo "$present") || true
  exit 1
fi

claude plugin validate .
for dir in plugins/*/; do
  echo "== ${dir%/}"
  claude plugin validate "$dir"
  if ls "$dir"tests/*.test.ts* >/dev/null 2>&1; then
    claude plugin test "$dir"
  fi
done
