#!/bin/zsh
set -euo pipefail

ROOT="/Users/yangzihao/great-war-2"
TARGET="$HOME/Library/LaunchAgents"
UID_VALUE="$(/usr/bin/id -u)"

/bin/mkdir -p "$TARGET" "$HOME/Library/Logs"
/bin/cp "$ROOT/launchd/com.yangzihao.greatwar2.server.plist" "$TARGET/"
/bin/cp "$ROOT/launchd/com.yangzihao.greatwar2.tunnel.plist" "$TARGET/"
/bin/chmod +x "$ROOT/scripts/run-server.sh" "$ROOT/scripts/run-tunnel.sh"

/bin/launchctl bootout "gui/$UID_VALUE" "$TARGET/com.yangzihao.greatwar2.server.plist" 2>/dev/null || true
/bin/launchctl bootout "gui/$UID_VALUE" "$TARGET/com.yangzihao.greatwar2.tunnel.plist" 2>/dev/null || true
/bin/launchctl bootstrap "gui/$UID_VALUE" "$TARGET/com.yangzihao.greatwar2.server.plist"
/bin/launchctl bootstrap "gui/$UID_VALUE" "$TARGET/com.yangzihao.greatwar2.tunnel.plist"
/bin/launchctl kickstart -k "gui/$UID_VALUE/com.yangzihao.greatwar2.server"
/bin/launchctl kickstart -k "gui/$UID_VALUE/com.yangzihao.greatwar2.tunnel"

echo "后台服务已安装。公网地址会写入：$HOME/Library/Logs/great-war-2-tunnel.log"
