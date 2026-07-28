# 中天争霸角色视觉设计

## 目标

将《伟大的战争 2：中天争霸》的简化 Canvas 几何角色替换为原创、高细节的 2D 动作角色。角色采用真人比例、日系 2D 线稿与厚涂金属质感相结合的表现；整体具有地下城式横版动作 RPG 的力量感，但不复制任何现有游戏角色、盔甲、武器或素材。

## 参考边界

- 用户提供的黑白人物图仅作为清爽日系 2D 比例、发型层次与线稿气质参考，不作为可识别人物或可复制角色设计。
- 用户提供的骑士图仅作为高密度盔甲、金属高光、肩甲分层和全盔压迫感参考，不复制其具体盔甲结构、徽章、场景或角色外形。
- 本项目的所有产物使用原创“中天帝都”设定：冷青、枪灰、银白与帝王金；不出现原作品名称、Logo、文字、水印或可识别角色元素。

## 角色设定

### 杨子豪：帝锋行者

- **身份与气质**：可操作主角；英气、沉稳、带有压迫性的前冲力量。
- **头部**：全封闭帝王面甲，战斗中不露出真人脸。狭窄 T 形观察缝透出冷白反光，顶部有一条低调金色帝纹。
- **盔甲**：深青枪灰主甲，银白边缘；分层肩甲、胸甲和前臂甲以金色细纹固定。后方短披风在跑动、突进和升龙时延迟摆动。
- **帝王剑**：细长、真实窄刃的双刃长剑，高度超过角色肩线；冷白金属刃面、中央细长金线、短横护手和暗色缠柄。不可设计成宽大巨剑。
- **动作**：待机呼吸、四向跑动、普攻、突进、升龙、帝气、受击和倒地。跑动必须表现出躯干前倾、腿部交替、披风与剑鞘滞后摆动。

### 王子毅：笑面守备官

- **身份与气质**：台子 NPC 与任务引导者；圆滑、克制、始终保留谈判余地。
- **外观**：露脸，暖褐色披肩与墨青守备制服，金边领口和简洁金属肩扣；五官柔和但眼神清醒。
- **姿态**：略微前倾，单手压住披肩或背在身后，微笑不夸张。待机时衣摆轻摆；对话时有点头、抬手和收手动作。

### 子狗：犬神余孽

- **身份与气质**：2 号楼最终首领；邪恶、不稳定、危险。
- **外观**：苍白露脸，黑红不对称破损长甲与撕裂外套；一侧赤红瞳光，另一侧陷于阴影。不能复用杨子豪的盔甲轮廓。
- **阶段变化**：第一阶段动作冷静且压抑；半血后暗红裂光沿盔甲和地面扩散，披风碎片与阴影拖尾增强，但面部始终清晰可读。

## 资产层级

1. **角色设定图**：一张三人全身场景式设定图，用于确认角色比例、面部可见性、服装、材质与色彩。
2. **游戏立绘**：杨子豪、王子毅和子狗各一张全身正面角色图，用于对话和角色信息界面。
3. **游戏精灵**：杨子豪使用一致比例的四向动作图；王子毅使用待机和对话手势；子狗使用待机、追击、攻击、受击和二阶段爆发。

首轮只生成角色设定图，确认视觉后再生成各角色独立精灵，避免跨姿态形象漂移。

## 首轮生成提示规范

```text
Use case: stylized-concept
Asset type: web action RPG character key art
Primary request: original high-detail 2D concept art for three characters in the fantasy world Zhongtian Imperial City
Input images: Image 1: style reference for clean Japanese 2D figure proportions and linework; Image 2: reference for dense layered armor materials and full helmet presence
Scene/backdrop: moonlit imperial cathedral hall with cold teal haze, no readable signs or text
Subject: centered full-body Yang Zihao in fully closed deep teal gunmetal imperial armor, a long narrow cold-silver Emperor Sword; Wang Ziyi at left in a warm brown cloak and blue-black guard uniform with a controlled diplomatic smile; Zigu at right in asymmetric broken black-red armor with one red glowing eye
Style/medium: original 2D action-RPG concept art, detailed hand-painted metal with clean anime linework, realistic human anatomy, no photoreal faces
Composition/framing: vertical full-body three-character lineup, Yang Zihao dominant center, all silhouettes and feet visible
Lighting/mood: cinematic rim light, cold teal atmosphere, restrained imperial gold highlights, ominous but heroic
Color palette: deep teal, gunmetal, cold silver, imperial gold, controlled dark crimson
Materials/textures: layered brushed metal, engraved gold trim, cloth cape, worn leather, subtle scuffs
Text (verbatim): ""
Constraints: Yang Zihao helmet closed and face hidden; Emperor Sword must be slim and long, not a broad sword; Wang Ziyi face visible and smooth; Zigu face visible and evil; original design only
Avoid: copied game characters, western knight heraldry, logos, watermark, readable text, giant sword, chibi proportions, exposed Yang Zihao face
```

## 验收标准

1. 杨子豪全盔遮脸，仍能通过体态和武器展现英气。
2. 帝王剑为细长窄刃，剑身与角色比例可信。
3. 王子毅显得圆滑而非邪恶；子狗明显邪恶，且与主角轮廓区分清晰。
4. 三人使用统一的中天冷青、银白、帝王金视觉体系；子狗只以受控暗红作为反差。
5. 图中没有可识别的第三方角色、Logo、水印或文字。
6. 设定图获确认后，后续精灵能保持角色头盔、武器、服装和颜色的一致性。
