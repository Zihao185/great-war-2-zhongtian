#!/bin/zsh
set -euo pipefail

readonly ROOT="/Users/yangzihao/great-war-2"
readonly CLOUDFLARED_BIN="/opt/homebrew/bin/cloudflared"

while ! /usr/bin/curl --silent --fail --max-time 3 http://127.0.0.1:3100/api/health >/dev/null; do
  /bin/sleep 3
done

if [[ ! -x "$CLOUDFLARED_BIN" ]]; then
  echo "未找到 Cloudflare Tunnel 客户端：$CLOUDFLARED_BIN" >&2
  exit 1
fi

cd "$ROOT"
exec "$CLOUDFLARED_BIN" tunnel --url http://127.0.0.1:3100 --no-autoupdate
