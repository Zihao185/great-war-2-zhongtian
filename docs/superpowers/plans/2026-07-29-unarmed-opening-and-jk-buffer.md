# 空手开场与 J-K 连招缓冲 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让保安处前的杨子豪空手出现，并消除 J 后 K 的站桩硬直。

**Architecture:** 在玩家临时状态增加 `queuedRise`，由突进位移完成事件调用抽出的升龙执行函数；绘制函数以 `hasSword()` 为唯一武器可见条件。

**Tech Stack:** 原生 Canvas、ESM、Node test runner。

## Global Constraints

- 未装备帝王剑时不得绘制剑，也不得使用普攻、J、K、L。
- J 位移期间只缓存一次 K；位移结束同帧执行连招升龙。
- 不更改 J、K 的伤害、冷却、龙血或无双数值。

### Task 1: 战斗缓冲与空手渲染

**Files:**
- Modify: `public/game.js`
- Test: `test/client-rules.test.mjs`

- [ ] 增加 `queuedRise`，在 `castRisingDragon()` 的突进分支缓存输入。
- [ ] 将当前升龙逻辑抽为 `performRisingDragon(combo)`，在 `dashMotion` 结束时调用。
- [ ] 以 `hasSword()` 包住剑的 Canvas 绘制分支。
- [ ] 执行 `npm test`、`node --check public/game.js`，提交并部署。
