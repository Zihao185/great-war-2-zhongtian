# 帝王剑成长与军需精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让军需商店只售卖护甲，并按 1000 金币、2000 金币、5 颗灵珠的路径将帝王剑成长限制为 3 阶，同时在 3 阶将龙血和帝气普攻吸血提高至 30 点。

**Architecture:** 服务端 `src/rules.mjs` 作为装备合法性、存档清洗与锻造资源的唯一可信来源。客户端 `public/rules.js` 镜像攻击与吸血显示规则，`public/game.js` 将其用于战斗，`public/ui.js` 只渲染服务端允许的护甲购买和锻造状态。

**Tech Stack:** Node.js 23 ESM、原生 HTTP、SQLite 存档、原生 Canvas、Node test runner。

## Global Constraints

- 帝王剑攻击表固定为 `[35, 45, 55, 60]`，最高 3 阶，第四阶及以上暂未开放。
- `0 -> 1` 消耗 1000 金币，`1 -> 2` 消耗 2000 金币，`2 -> 3` 消耗 5 颗子狗灵珠。
- 3 阶时，龙血三次普攻或帝气持续期间的普攻每次最多恢复 30 点；0 至 2 阶为 10 点；两种状态重叠时一次普攻仅恢复一次。
- 军需商店只允许购买城卫软甲、玄铁胸甲与破军铠；天犬甲继续通过首领掉落或 5 灵珠兑换取得。
- 旧存档的旧武器 ID 需保留在背包数组，但不能再装备；读取后应自动回退至帝王剑（若拥有）或赤手。
- 不新增第三方依赖；全部测试使用 `npm test`。

---

### Task 1: 服务端成长规则与旧存档兼容

**Files:**
- Modify: `src/rules.mjs:1-164`
- Modify: `test/rules.test.mjs:1-58`
- Modify: `test/api.test.mjs:1-61`

**Interfaces:**
- Consumes: `applyAction(saveRaw, { type: 'buy_item' | 'forge_sword' | 'equip_item' })` 与现有 JSON 存档。
- Produces: `IMPERIAL_SWORD_MAX_RANK`, `IMPERIAL_SWORD_ATTACK_BY_RANK`, `getWeaponAttack(save)` 和受服务器验证的 `forge_sword` 结果。

- [ ] **Step 1: 写入失败的服务端规则测试**

将现有商店和锻造测试替换为以下断言，并在 API 测试中把历史武器购买请求改为拒绝、护甲购买请求改为成功：

```js
test('shop accepts armor only and historical weapons cannot be equipped', () => {
  const initial = { ...createInitialSave(), gold: 330, inventory: ['guard_broadsword', 'imperial_sword'], equipped: { weapon: 'guard_broadsword', armor: null } };
  const sanitized = sanitizeSave(initial);
  assert.equal(sanitized.equipped.weapon, 'imperial_sword');
  assert.throws(() => applyAction(sanitized, { type: 'buy_item', itemId: 'guard_broadsword' }), /只能购买护甲/);
  const bought = applyAction(sanitized, { type: 'buy_item', itemId: 'iron_armor' }).save;
  assert.equal(bought.gold, 0);
  assert.ok(bought.inventory.includes('iron_armor'));
  assert.throws(() => applyAction(bought, { type: 'equip_item', itemId: 'guard_broadsword' }), /当前仅可使用帝王剑/);
});

test('imperial sword uses two gold upgrades then five-pearl breakthrough and stops at rank three', () => {
  const initial = { ...createInitialSave(), gold: 3000, pearls: 5, inventory: ['imperial_sword'], equipped: { weapon: 'imperial_sword', armor: null } };
  const rank1 = applyAction(initial, { type: 'forge_sword' }).save;
  assert.deepEqual([rank1.swordRank, rank1.gold, getWeaponAttack(rank1)], [1, 2000, 45]);
  const rank2 = applyAction(rank1, { type: 'forge_sword' }).save;
  assert.deepEqual([rank2.swordRank, rank2.gold, getWeaponAttack(rank2)], [2, 0, 55]);
  const rank3 = applyAction(rank2, { type: 'forge_sword' }).save;
  assert.deepEqual([rank3.swordRank, rank3.pearls, getWeaponAttack(rank3)], [3, 0, 60]);
  assert.throws(() => applyAction(rank3, { type: 'forge_sword' }), /第四阶暂未开放/);
});

test('save sanitation caps historical sword ranks at three', () => {
  const save = sanitizeSave({ ...createInitialSave(), swordRank: 99, inventory: ['imperial_sword'], equipped: { weapon: 'imperial_sword', armor: null } });
  assert.equal(save.swordRank, 3);
  assert.equal(getWeaponAttack(save), 60);
});
```

在 `test/rules.test.mjs` 的 `src/rules.mjs` 导入列表中补上 `sanitizeSave`。在 `test/api.test.mjs` 中将 `guard_broadsword` 的购买请求改为期望 `400`，再购买 `guard_armor` 并断言其进入背包。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/rules.test.mjs test/api.test.mjs`

Expected: FAIL，原因包括当前仍允许购买武器、仍要求 3 灵珠且允许锻造到 9 阶。

- [ ] **Step 3: 实现服务端常量、存档清洗与资源校验**

在 `src/rules.mjs` 中新增常量和函数，并用它们替换线性攻击计算与九阶限制：

```js
export const IMPERIAL_SWORD_MAX_RANK = 3;
export const IMPERIAL_SWORD_ATTACK_BY_RANK = Object.freeze([35, 45, 55, 60]);
const SWORD_FORGE_COSTS = Object.freeze([
  { gold: 1000, pearls: 0 },
  { gold: 2000, pearls: 0 },
  { gold: 0, pearls: 5 }
]);

export function getWeaponAttack(save) {
  if (save.equipped?.weapon !== 'imperial_sword') return 0;
  const rank = Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Math.floor(Number(save.swordRank) || 0)));
  return IMPERIAL_SWORD_ATTACK_BY_RANK[rank];
}
```

将 `sanitizeSave` 的等级上限改为 `IMPERIAL_SWORD_MAX_RANK`。在装备清洗后追加：

```js
if (clean.equipped.weapon !== 'imperial_sword') {
  clean.equipped.weapon = clean.inventory.includes('imperial_sword') ? 'imperial_sword' : null;
}
```

将 `buy_item` 分支的首个校验改为 `if (!item || item.slot !== 'armor' || item.price === null) throw new RuleError('军需商店只能购买护甲');`，并在 `equip_item` 分支中拒绝所有 `item.slot === 'weapon' && item.id !== 'imperial_sword'` 的请求。

将 `forge_sword` 分支替换为：

```js
if (!next.inventory.includes('imperial_sword')) throw new RuleError('尚未获得帝王剑');
if (next.swordRank >= IMPERIAL_SWORD_MAX_RANK) throw new RuleError('帝王剑第四阶暂未开放');
const cost = SWORD_FORGE_COSTS[next.swordRank];
if (next.gold < cost.gold) throw new RuleError(`金币不足，还差 ${cost.gold - next.gold}`);
if (next.pearls < cost.pearls) throw new RuleError(`灵珠不足，还差 ${cost.pearls - next.pearls}`);
next.gold -= cost.gold;
next.pearls -= cost.pearls;
next.swordRank += 1;
result = { message: `帝王剑锻造至 ${next.swordRank} 阶`, swordRank: next.swordRank, cost };
```

- [ ] **Step 4: 运行服务端测试并确认通过**

Run: `node --test test/rules.test.mjs test/api.test.mjs`

Expected: PASS，包含护甲限定、旧武器回退、三段升级资源扣除与三阶封顶。

- [ ] **Step 5: 提交服务端规则**

```bash
git add src/rules.mjs test/rules.test.mjs test/api.test.mjs
git commit -m "feat: limit imperial sword progression to rank three"
```

### Task 2: 客户端数值与战斗吸血

**Files:**
- Modify: `public/rules.js:1-25`
- Modify: `public/game.js:1-281`
- Modify: `test/client-rules.test.mjs:1-28`

**Interfaces:**
- Consumes: `save.swordRank`, `player.dragonBlood`, `player.aura`。
- Produces: `weaponAttack(save)`、`lifeStealAmount(save)`；普攻命中后的单次吸血行为。

- [ ] **Step 1: 写入失败的客户端数值测试**

在 `test/client-rules.test.mjs` 中从 `public/rules.js` 导入 `lifeStealAmount`，将九阶攻击断言替换为：

```js
test('client mirrors the three-rank imperial sword attack table and lifesteal bonus', () => {
  const equipped = rank => ({ swordRank: rank, equipped: { weapon: 'imperial_sword', armor: null } });
  assert.equal(weaponAttack(equipped(0)), 35);
  assert.equal(weaponAttack(equipped(1)), 45);
  assert.equal(weaponAttack(equipped(2)), 55);
  assert.equal(weaponAttack(equipped(3)), 60);
  assert.equal(weaponAttack(equipped(9)), 60);
  assert.equal(lifeStealAmount(equipped(2)), 10);
  assert.equal(lifeStealAmount(equipped(3)), 30);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test test/client-rules.test.mjs`

Expected: FAIL，因为客户端仍然为九阶线性攻击，且未导出 `lifeStealAmount`。

- [ ] **Step 3: 镜像帝王剑表并让普攻只结算一次吸血**

在 `public/rules.js` 中定义和服务端一致的 `IMPERIAL_SWORD_MAX_RANK`、`IMPERIAL_SWORD_ATTACK_BY_RANK`，并实现：

```js
export function lifeStealAmount(save) {
  return Math.min(IMPERIAL_SWORD_MAX_RANK, Math.max(0, Number(save.swordRank) || 0)) >= 3 ? 30 : 10;
}
```

在 `public/game.js` 的导入中加入 `lifeStealAmount`。把 `basicAttack()` 中两个独立的 `healPlayer(10, ...)` 条件替换为：

```js
const dragonBloodActive = p.dragonBlood > 0;
const imperialAuraActive = p.aura > 0;
if (dragonBloodActive) p.dragonBlood -= 1;
if (dragonBloodActive || imperialAuraActive) {
  this.healPlayer(lifeStealAmount(this.save), dragonBloodActive ? '龙血' : '帝气');
}
```

这会保留龙血的三次消耗和帝气五秒持续逻辑；两者重叠时同一次命中只恢复一次。

- [ ] **Step 4: 运行客户端规则测试并确认通过**

Run: `node --test test/client-rules.test.mjs`

Expected: PASS，攻击表为 35/45/55/60，三阶及以上的吸血值为 30。

- [ ] **Step 5: 提交客户端战斗规则**

```bash
git add public/rules.js public/game.js test/client-rules.test.mjs
git commit -m "feat: boost rank three imperial sword lifesteal"
```

### Task 3: 护甲商店、锻造提示与完整回归

**Files:**
- Modify: `public/ui.js:94-115`
- Test: `test/rules.test.mjs`
- Test: `test/client-rules.test.mjs`
- Test: `test/api.test.mjs`

**Interfaces:**
- Consumes: `ITEMS`, `weaponAttack(save)`, `IMPERIAL_SWORD_MAX_RANK`, `swordRank`, `gold`, `pearls`。
- Produces: 只包含护甲的军需商店和可准确禁用的锻造按钮。

- [ ] **Step 1: 更新商店与锻造界面**

在 `public/ui.js` 的导入中加入 `IMPERIAL_SWORD_MAX_RANK`。在 `renderShop(save)` 中将商品来源限定为：

```js
const products = Object.values(ITEMS).filter(item => item.slot === 'armor' && item.price !== null);
```

将商店物品图标固定为 `甲`，并把弹窗副标题改为“台子 · 护甲军需”。在 `renderInventory(save)` 中仅渲染 `imperial_sword` 和所有护甲，阶位标签改为 `${save.swordRank} / ${IMPERIAL_SWORD_MAX_RANK}`。

在 `renderForge(save)` 中基于当前阶位选择：

```js
const forgeCosts = [{ gold: 1000, pearls: 0 }, { gold: 2000, pearls: 0 }, { gold: 0, pearls: 5 }];
const cost = forgeCosts[save.swordRank] || null;
const max = !cost;
const affordable = cost && save.gold >= cost.gold && save.pearls >= cost.pearls;
```

使用 `weaponAttack(save)` 显示当前攻击；非封顶时显示下一阶攻击和以下按钮文案之一：`消耗 1000 金币`、`消耗 2000 金币`、`消耗 5 灵珠`。封顶时显示“第三阶已成 · 第四阶暂未开放”和“龙血、帝气普攻吸血 30 点”，并禁用锻造按钮。保留第二个“消耗 5 灵珠兑换天犬甲”卡片与现有直接掉落逻辑。

- [ ] **Step 2: 运行完整测试并进行浏览器验收**

Run: `npm test`

Expected: PASS，所有 Node 测试通过。

使用已登录的测试账号进行以下手动验收：

1. 与台子军需互动，只显示三件普通护甲，且旧武器没有购买按钮。
2. 帝王剑 0 阶时显示攻击 35、下一阶 45、1000 金币材料；金币不足时锻造按钮禁用。
3. 依次将剑升到 1、2、3 阶，检查攻击为 45、55、60，第三次仅扣 5 灵珠。
4. 3 阶时确认显示“第四阶暂未开放”，没有第四次升级入口。
5. 对敌人完成 `J -> K` 后连续普攻，前三次命中浮字为 `+30 龙血`；积满无双开启 `L` 后，每次命中浮字为 `+30 帝气`。

- [ ] **Step 3: 提交界面与回归结果**

```bash
git add public/ui.js test/rules.test.mjs test/client-rules.test.mjs test/api.test.mjs
git commit -m "feat: simplify armory and show imperial sword breakthrough"
git push
```

## Self-Review

- 规格覆盖：任务 1 实现并验证金币、灵珠、3 阶封顶和商店购买限制；任务 2 实现并验证攻击与吸血；任务 3 实现界面提示与全量回归。
- 完整性检查：所有数值、错误文案、文件路径、接口名称和测试命令均已明确给出。
- 类型一致性：服务端只使用 `applyAction` 的现有动作名称；客户端导出的 `lifeStealAmount(save)` 由 `game.js` 与客户端测试共同消费；UI 使用已有 `data-action="forge"`，无需新增 API。
