# 1 号楼黑化院长战役 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增由子狗首杀解锁的 1 号楼五层副本、阁楼钥匙隐藏路线、院长奖励和全局死亡回台子规则。

**Architecture:** `src/rules.mjs` 与 `src/http.mjs` 保存所有永久进度和奖励结算；`public/world.js` 定义区域、墙、陷阱、交互和敌人；`public/game.js` 驱动碰撞、机关、首领结算和死亡流转。

**Tech Stack:** Node.js ESM、SQLite、原生 HTTP、原生 Canvas、Node test runner。

## Global Constraints

- 首次子狗结算给信并解锁 1 号楼；尤恺钥匙概率为 `random < 0.5`；院长每次胜利为 500 金币；院长失败扣 200 金币且不为负。
- 所有死亡返回台子；只有阁楼死亡触发服务器扣款。
- 1 号楼必须有真实墙体碰撞、射手压力、地刺、喷火和清场门禁。
- 不增加第三方依赖，完整回归使用 `npm test`。

---

### Task 1: 服务端战役状态与结算

**Files:** `src/rules.mjs`, `src/http.mjs`, `test/rules.test.mjs`, `test/api.test.mjs`

- [ ] 增加存档字段、区域白名单和四个服务端动作：子狗/小胖/尤恺/院长结算、激活祭坛、院长失败。
- [ ] 编写断言：子狗仅首杀给信，尤恺 `0.4999` 给钥匙而 `0.5` 不给，祭坛扣一钥匙，院长可重复给 500，失败时金币下限为 0。
- [ ] 在 `/api/boss-clear` 根据 `bossId` 仅注入服务器随机数；增加 `/api/dean-failure`。
- [ ] 运行 `node --test test/rules.test.mjs test/api.test.mjs`。

### Task 2: 1 号楼世界、障碍和陷阱定义

**Files:** `public/world.js`, `test/client-rules.test.mjs`

- [ ] 新增 1F 至 5F 和阁楼区域、出口、4F 祭坛与 5F 条件旋涡门。
- [ ] 定义 `getRegionWalls(regionId)` 和 `createRegionHazards(regionId)`，每个要求的楼层至少有墙和对应机关。
- [ ] 添加小胖、尤恺、院长与高密度射手配置；验证区域、出口条件和 50% 祭坛可见条件。
- [ ] 运行客户端规则测试。

### Task 3: 战斗、碰撞、首领和死亡流转

**Files:** `public/game.js`, `public/api.js`, `public/ui.js`, `public/index.html`

- [ ] 将普通移动、J 突进和敌人位移接入矩形墙体碰撞。
- [ ] 实现周期地刺和喷火的预警、命中和绘制。
- [ ] 根据首领类型实现小胖耐久、尤恺高速冲刺、院长高伤，并传递正确的 `bossId` 结算。
- [ ] 更新信件、钥匙、祭坛、旋涡门和首领结算弹窗。
- [ ] 将死亡按钮改为异步返回台子；阁楼死亡调用服务器扣款。

### Task 4: 完整验证与部署

**Files:** 所有变动文件及文档

- [ ] 运行 `npm test`、`node --check public/game.js public/world.js src/rules.mjs` 与 `git diff --check`。
- [ ] 在停服后删除 `data/zhongtian.db`，清空所有账号与存档；重启后台服务，验证本机和公网根页面均为 HTTP 200。
- [ ] 提交 1 号楼战役、推送 GitHub。
