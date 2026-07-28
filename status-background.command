#!/bin/zsh
set -u

ROOT="/Users/yangzihao/great-war-2"
source "$ROOT/scripts/public-url.sh"
UID_VALUE="$(/usr/bin/id -u)"
/bin/launchctl print "gui/$UID_VALUE/com.yangzihao.greatwar2.server" 2>&1
/bin/launchctl print "gui/$UID_VALUE/com.yangzihao.greatwar2.tunnel" 2>&1
echo ""
echo "固定公网地址：$GREAT_WAR_2_PUBLIC_URL"
echo "隧道日志：$HOME/Library/Logs/great-war-2-tunnel.log"
echo "隧道错误日志：$HOME/Library/Logs/great-war-2-tunnel-error.log"
