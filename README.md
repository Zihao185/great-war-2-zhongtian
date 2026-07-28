# 伟大的战争 2：中天争霸

本项目包含网页游戏、本机账号服务、SQLite 存档和公网隧道启动脚本。第一代游戏文件不会被修改。

## 启动方式

双击 `start.command` 只在本机运行，然后访问：

```text
http://127.0.0.1:3100
```

双击 `start-public.command` 会同时启动游戏和公网隧道。脚本优先使用 Cloudflare；若当前网络无法连接 Cloudflare，会自动切换至 Serveo，最后才尝试 localhost.run。终端出现 `https://...trycloudflare.com`、`https://...serveousercontent.com` 或 `https://...lhr.life` 地址后，任何人都可以通过该地址注册和游玩。关闭终端或按 `Control+C` 后，公网地址停止服务。

## 后台常驻

双击 `install-background.command` 一次，会将游戏服务与 Serveo 隧道注册为当前 macOS 用户的 LaunchAgent。此后用户登录时会自动启动；进程意外退出会在短暂间隔后自动重试。双击 `status-background.command` 可以查看服务状态和最新公网地址。

临时隧道的公网域名会在重连、电脑重启或网络切换后变化，最新地址记录在：

```text
~/Library/Logs/great-war-2-tunnel.log
```

要使用永不变化的地址，需要用户提供 Cloudflare 账号和自己的域名，以创建命名隧道。

## 存档

账号、密码哈希和存档保存在：

```text
data/zhongtian.db
```

备份该文件即可备份全部玩家。不要公开发送数据库文件。密码不会以明文保存。

## 操作

- `WASD`：移动
- `Space`：普攻
- `Q`：突进
- `E`：升龙
- `R`：帝气
- `F`：与 NPC、楼门、传送阵、商店和锻造台交互

## 内容

- 注册、登录与独立账号存档
- 中天帝都大地图与多个区域跳转
- 王子毅任务“神的开始”与 30 秒反弹弹幕试炼
- 杨子豪完整技能和帝王剑
- 2 号楼三段副本与最终首领子狗
- 普通装备商店、金币、天犬甲双路径掉落、子狗灵珠与九阶锻造

## 测试

```bash
npm test
```
