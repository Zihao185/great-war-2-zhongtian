#!/bin/zsh
set -u

UID_VALUE="$(/usr/bin/id -u)"
/bin/launchctl print "gui/$UID_VALUE/com.yangzihao.greatwar2.server" 2>&1
/bin/launchctl print "gui/$UID_VALUE/com.yangzihao.greatwar2.tunnel" 2>&1
echo ""
echo "最近的公网地址："
/usr/bin/grep -Eo 'https://[^[:space:]]+' "$HOME/Library/Logs/great-war-2-tunnel.log" 2>/dev/null | /usr/bin/tail -n 1
