#!/bin/zsh
set -u

while ! /usr/bin/curl --silent --fail --max-time 3 http://127.0.0.1:3100/api/health >/dev/null; do
  /bin/sleep 3
done

exec /usr/bin/ssh \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -R 80:127.0.0.1:3100 \
  serveo.net
