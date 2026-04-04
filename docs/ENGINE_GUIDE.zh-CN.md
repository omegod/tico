[English](./ENGINE_GUIDE.md) | 简体中文

# tico 引擎开发指南

本文说明 `tico` 当前可用的公共 API 以及本仓库推荐的开发方式。

## 1. 目标

`tico` 面向终端和 CLI 游戏。它强调清晰的场景管理、轻量的引擎系统，以及 ASCII 优先的渲染方式。

适合以下项目：

- ASCII 动作游戏
- 格子制与回合制游戏
- 快速玩法原型
- 教学与实验项目

## 2. 安装与导入

```bash
npm install @omgod/tico
```

```js
const {
  EngineApp,
  Scene,
  Node2D,
  SpriteNode,
  TextNode,
  TilemapNode,
  ActionMap,
  InputHandler,
  Renderer,
  ResourceManager,
  AnimationPlayer,
  PhysicsWorld,
  COLORS,
  Layer
} = require('@omgod/tico');
```

本仓库本地开发时也可以直接从 `./src` 引入：

```js
const { EngineApp, Scene } = require('./src');
```

## 3. 公共 API 概览

包入口会转出 `src/engine/index.js` 中的公共 API。

- 应用与主循环：`EngineApp`、`GameEngine`、`GAME_STATE`
- 核心：`EventBus`、`GameEvents`、`EntityManager`、`Entity`、`EntityType`、`CollisionSystem`
- 场景树：`Scene`、`SceneManager`、`Node2D`、`SpriteNode`、`TextNode`、`TilemapNode`
- 输入：`InputHandler`、`InputActionContext`、`ActionMap`、`KeyMapping`、`getAction`、`matches`
- 渲染：`Renderer`、`COLORS`、`Layer`、`Camera2D`、`ScreenBuffer`、`Cell`
- 内容与 UI：`ResourceManager`、`AnimationPlayer`、`Tween`、`EASING`、`HUD`、`Banner`、`Modal`

## 4. 运行时架构

`EngineApp` 会把引擎运行时组装起来：

- `engine` 负责主循环与状态
- `renderer` 负责终端绘制
- `input` 负责按键输入
- `resources` 负责资源缓存
- `animations` 负责补间更新
- `physics` 负责轻量查询
- `entities` 负责实体存储
- `sceneManager` 负责场景切换

常用方法：

- `addScene(name, scene)`
- `start(sceneName)`
- `switchScene(name)`
- `stop()`
- `getRuntime()`

## 5. 场景生命周期

`Scene` 是玩法代码的主要入口。每个场景都拥有根节点和相机。

生命周期钩子：

- `onEnter(app)`
- `onExit(app)`
- `onUpdate(dt, frameCount, meta, app)`
- `onFixedUpdate(dt, frameCount, app)`
- `onRender({ app, renderer, dt, frameCount, alpha })`
- `onInput(key, keyInfo, app)`

可选项：

- `managed` 控制场景是否自动绑定引擎运行时
- `autoClear` 控制每帧是否自动清屏
- `autoPresent` 控制是否自动写入 stdout

示例：

```js
class BootScene extends Scene {
  constructor() {
    super('boot');
    this.root.addChild(new TextNode({
      x: 3,
      y: 2,
      text: 'Booting...'
    }));
  }

  onEnter(app) {
    app.engine.setState('running');
  }
}
```

## 6. 输入

`InputHandler` 会归一化终端按键，并记录帧级输入状态。

常用方法：

- `init()`
- `initTerminal()`
- `cleanup()`
- `onKey(callback)`
- `isPressed(key)`
- `isJustPressed(key)`
- `isJustReleased(key)`
- `afterFrame()`
- `createContext(actionMap)`

`ActionMap` 可以把游戏动作映射到多个按键：

```js
const actions = new ActionMap({
  LEFT: ['ArrowLeft', 'a', 'A'],
  RIGHT: ['ArrowRight', 'd', 'D'],
  CONFIRM: ['Enter', ' ']
});

const inputContext = app.input.createContext(actions);
if (inputContext.consume('LEFT')) {
  this.moveLeft();
}
```

内置 `KeyMapping` 提供了移动、射击、暂停和确认等常用动作映射。

## 7. 渲染

`Renderer` 先绘制到 `ScreenBuffer`，再统一刷新到终端。

常用方法：

- `setCamera(camera)`
- `clear()`
- `drawCell(x, y, char, color, bold, layer)`
- `drawString(x, y, text, color, bold, layer)`
- `drawText(x, y, lines, color, bold, layer)`
- `drawArt(x, y, art, color, bold, layer)`
- `fillRect(x, y, width, height, char, color, bold, layer)`
- `renderBackground(layer)`
- `scrollBackground()`

使用 `Layer` 控制绘制优先级，使用 `COLORS` 进行 ANSI 样式控制。

## 8. 节点

`Node2D` 是场景树的基础节点。

常用方法：

- `setPosition(x, y)`
- `translate(dx, dy)`
- `addChild(node)`
- `removeChild(node)`
- `getWorldPosition()`
- `addTag(tag)`
- `hasTag(tag)`
- `updateTree(dt, frameCount)`
- `renderTree(renderer)`

常见节点：

- `SpriteNode`：ASCII 图形精灵
- `TextNode`：文本标签
- `TilemapNode`：格子地图

## 9. 资源

`ResourceManager` 提供文本和 JSON 的轻量缓存。

常用方法：

- `register(name, value, metadata)`
- `get(name, fallback)`
- `has(name)`
- `getMetadata(name)`
- `unload(name)`
- `clear(prefix)`
- `loadTextSync(name, filePath)`
- `loadJsonSync(name, filePath)`
- `loadText(name, filePath)`
- `loadJson(name, filePath)`

建议使用命名空间式 key，例如 `game:ui:title`，这样可以用 `clear('game:ui:')` 批量回收。

## 10. 动画

`AnimationPlayer` 管理补间动画，`Tween` 提供轻量数值动画能力。

示例：

```js
app.animations.tween(this, 'displayedScore', 1000, 180, {
  easing: 'easeOutQuad'
});
```

## 11. 物理

`PhysicsWorld` 刻意保持轻量，更适合碰撞、查询和玩法判定，而不是完整刚体物理。

适合使用场景：

- 子弹命中
- 范围伤害
- 范围查询
- 简单障碍检测

## 12. 推荐项目结构

```text
my-game/
  assets/
    levels/
    ui/
  src/
    scenes/
      BootScene.js
      GameScene.js
      GameOverScene.js
    entities/
      Player.js
      Enemy.js
    systems/
      CombatSystem.js
      SpawnSystem.js
    index.js
```

## 13. 开发流程

推荐做法：

- 构造函数里初始化静态节点和常量
- 每局重置放在 `onEnter`
- 实时逻辑放在 `onUpdate`
- 固定步进逻辑放在 `onFixedUpdate`
- 临时 UI 和覆盖层放在 `onRender`
- 输入映射优先放在 `ActionMap` 或 `KeyMapping`

## 14. 发布清单

发布到 GitHub 和 npm 之前建议确认：

- 运行 `npm test`
- 验证示例游戏
- 检查 `README.md` 和 `docs/ENGINE_GUIDE.md`
- 确认 `package.json` 元信息，尤其是 npm 包名
