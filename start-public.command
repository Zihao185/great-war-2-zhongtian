#!/bin/zsh
set -e
cd "$(dirname "$0")"

node server.mjs &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1
echo ""
echo "服务已启动。下面将生成公网 HTTPS 地址："
if ! /opt/homebrew/bin/cloudflared tunnel --url http://127.0.0.1:3100; then
  echo ""
  echo "Cloudflare 当前不可用，正在切换 Serveo 公网隧道……"
  if ! ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:3100 serveo.net; then
    echo ""
    echo "Serveo 当前不可用，正在尝试最后的备用公网隧道……"
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:3100 nokey@localhost.run
  fi
fi
