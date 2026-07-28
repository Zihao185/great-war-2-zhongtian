#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
source ./scripts/public-url.sh

SERVER_PID=""
if ! /usr/bin/curl --silent --fail --max-time 3 http://127.0.0.1:3100/api/health >/dev/null; then
  /opt/homebrew/bin/node server.mjs &
  SERVER_PID="$!"
fi

cleanup() {
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "固定公网地址：$GREAT_WAR_2_PUBLIC_URL"
./scripts/run-tunnel.sh
