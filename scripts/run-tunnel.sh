#!/bin/zsh
set -euo pipefail

readonly ROOT="/Users/yangzihao/great-war-2"
readonly NGROK_BIN="/Users/yangzihao/.local/bin/ngrok"

while ! /usr/bin/curl --silent --fail --max-time 3 http://127.0.0.1:3100/api/health >/dev/null; do
  /bin/sleep 3
done

if [[ ! -x "$NGROK_BIN" ]]; then
  echo "未找到 ngrok 客户端：$NGROK_BIN" >&2
  exit 1
fi

cd "$ROOT"
exec "$NGROK_BIN" http 3100 --inspect=false --log stdout --log-format logfmt
