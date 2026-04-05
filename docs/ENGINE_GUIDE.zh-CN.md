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
  EngineTime,
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

- 应用与主循环：`EngineApp`、`GameEngine`、`GAME_STATE`、`EngineTime`
- 核心：`EventBus`、`GameEvents`、`EntityManager`、`Entity`、`EntityType`、`CollisionSystem`
- 场景树：`Scene`、`SceneManager`、`Node2D`、`SpriteNode`、`TextNode`、`TilemapNode`
- 输入：`InputHandler`、`InputActionContext`、`ActionMap`、`KeyMapping`、`getAction`、`matches`
- 渲染：`Renderer`、`COLORS`、`Layer`、`Camera2D`、`ScreenBuffer`、`Cell`
- 内容、布局与组件：`ResourceManager`、`AnimationPlayer`、`Tween`、`EASING`、`BORDER_STYLES`、`measureText`、`measureLines`、`PanelWidget`、`DialogWidget`、`TextWidget`、`BarWidget`、`MenuWidget`

## 4. 运行时架构

`EngineApp` 会把引擎运行时组装起来：

- `engine` 负责主循环与状态
- `time` 负责统一的游戏时钟与调度
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

### 时间与调度

`app.time` 是面向玩法层的统一时钟。它会跟踪缩放后的游戏时间、帧信息，以及应该遵守暂停 / 倍速规则的延时任务。

常用方法：

- `now()`
- `delta()`
- `unscaledDelta()`
- `after(ms, callback, options)`
- `every(ms, callback, options)`
- `nextFrame(callback, options)`
- `cancel(handle)`
- `cancelByOwner(owner)`

建议在 `Scene` 或类似 system 的对象里使用 `owner: this`，这样场景解绑时，相关任务可以自动清理。

```js
app.time.every(250, () => {
  this.cursorVisible = !this.cursorVisible;
}, { owner: this });

app.time.after(1200, () => {
  this.statusText = '';
}, { owner: this });
```

### 系统调度

`GameEngine` 现在同时扮演轻量系统调度器。系统本身就是普通对象，可以按需实现生命周期钩子和更新方法。

常用钩子：

- `onAttach(engine, info)`
- `onEnable(engine, info)`
- `fixedUpdate(dt, frameCount)`
- `update(dt, frameCount, meta)`
- `onDisable(engine, info)`
- `onDetach(engine, info)`

注册系统时可以附带元信息：

```js
app.engine.registerSystem(debugSystem, {
  owner: this,
  priority: 50,
  id: 'debug:overlay'
});
```

说明：

- `priority` 越小越早执行。
- `owner` 方便 scene 或模块一次性清理自己注册的系统。
- 依赖排序还没有成为稳定公共 API，所以当前更推荐少量系统 + 显式 priority。

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
- `systemPriority` 控制场景运行时系统在引擎系统列表中的位置

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
- `drawCell(x, y, char, color, bold, layer, bgColor)`
- `drawString(x, y, text, color, bold, layer, bgColor)`
- `drawText(x, y, lines, color, bold, layer, bgColor)`
- `drawArt(x, y, art, color, bold, layer, bgColor)`
- `fillRect(x, y, width, height, char = ' ', color, bold, layer, bgColor)`
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

### Entity 与 Node 的职责

`Node2D` 和 `Entity` 是有意分开的两套模型：

- `Node2D` 负责场景树组织、变换和渲染。
- `Entity` 负责玩法状态、碰撞数据、标签和生命周期。

也就是说，`Node2D` 更偏表现层，`Entity` 更偏玩法层。如果一个游戏对象两者都需要，优先考虑组合或适配层，而不是直接把两套模型硬合并。

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

## 14. API 参考

本节对照 `src/engine/index.js` 导出的公共符号进行说明。

### 14.1 运行时

#### `EngineApp`

`new EngineApp(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `width` | number | `80` | 渲染器和相机使用的终端宽度。 |
| `height` | number | `32` | 渲染器和相机使用的终端高度。 |
| `frameRate` | number | `50` | 主循环间隔，单位为毫秒。 |
| `stdout` | stream | `process.stdout` | 终端输出流。 |
| `eventBus` | `EventBus` | 新建实例 | 共享事件总线。 |
| `engine` | `GameEngine` | 新建实例 | 自定义引擎实例。 |
| `time` | `EngineTime` | `engine.time` | 共享的游戏时钟与调度器。 |
| `entities` | `EntityManager` | 新建实例 | 场景和系统共用的实体容器。 |
| `renderer` | `Renderer` | 新建实例 | ASCII 渲染器。 |
| `input` | `InputHandler` | 新建实例 | 键盘输入处理器。 |
| `resources` | `ResourceManager` | 新建实例 | 资源缓存。 |
| `animations` | `AnimationPlayer` | 新建实例 | Tween 动画管理器。 |
| `physics` | `PhysicsWorld` | 新建实例 | 轻量碰撞与查询世界。 |

返回值：`EngineApp`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `getRuntime()` | 无 | object | 返回当前运行时对象，包含 `width`、`height`、`stdout`、`engine`、`time`、`entities`、`renderer`、`input`、`resources`、`animations`、`physics`。 |
| `addScene(name, scene)` | `name: string`，`scene: Scene` | `this` | 注册场景并自动绑定 app。 |
| `start(sceneName)` | `sceneName: string` | `this` | 初始化终端输入、绑定清理逻辑、启动场景并进入主循环。 |
| `switchScene(name)` | `name: string` | `this` | 切换到已注册的其他场景。 |
| `stop()` | 无 | `void` | 停止当前场景、停止引擎并恢复终端输入状态。 |

#### `GameEngine`

`new GameEngine(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `width` | number | `80` | 供系统使用的逻辑宽度。 |
| `height` | number | `32` | 供系统使用的逻辑高度。 |
| `frameRate` | number | `50` | 兼容旧写法的间隔值，单位为毫秒。 |
| `frameDuration` | number | `frameRate` | 帧调度间隔，单位为毫秒。 |
| `fixedDelta` | number | `frameDuration` | 固定步进更新间隔。 |
| `maxDelta` | number | `250` | 最大 delta 限制，防止帧跳变过大。 |
| `timeScale` | number | `1` | 全局时间缩放倍率。 |
| `initialState` | string | `GAME_STATE.BOOT` | 初始状态。 |
| `eventBus` | `EventBus` | 新建实例 | 共享事件总线。 |
| `time` | `EngineTime` | 新建实例 | 共享的游戏时钟与调度器。 |

返回值：`GameEngine`

`GAME_STATE` 枚举：

| 值 | 含义 |
|---|---|
| `BOOT` | 启动状态，主循环尚未进入交互。 |
| `RUNNING` | 启动后使用的活动状态。 |
| `STOPPED` | 已停止，主循环不再运行。 |
| `MENU` | 主菜单状态。 |
| `SHIP_SELECT` | 战机选择状态。 |
| `INSTRUCTIONS` | 说明 / 教学状态。 |
| `PLAYING` | 游戏进行中状态。 |
| `PAUSED` | 暂停状态。 |
| `GAME_OVER` | 失败状态。 |
| `VICTORY` | 胜利状态。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `onRender(callback)` | `callback(dt, frameCount, alpha)` | `void` | 注册每帧渲染回调。 |
| `init()` | 无 | `void` | 启动循环计时，并派发 `GameEvents.GAME_START`。 |
| `stop()` | 无 | `void` | 停止循环、清理定时器并清空事件总线。 |
| `pause()` | 无 | `void` | 将 `PLAYING` 或 `RUNNING` 切换到 `PAUSED`。 |
| `resume()` | 无 | `void` | 从暂停状态恢复到之前的状态。 |
| `togglePause()` | 无 | `void` | 在暂停与继续之间切换。 |
| `setState(newState)` | `newState: string` | `string` | 设置状态并返回旧状态。 |
| `registerSystem(system, options)` | `system: { onAttach?, onEnable?, update?, fixedUpdate?, onDisable?, onDetach? }`，`options?: { priority?, owner?, id?, enabled? }` | `system` | 注册一个系统进入更新列表，并附加可选调度元信息。 |
| `unregisterSystem(system)` | `system: object` | `void` | 从更新列表移除一个系统。 |
| `unregisterSystemsByOwner(owner)` | `owner: any` | `number` | 批量移除某个 owner 注册的全部系统。 |
| `setSystemEnabled(system, enabled)` | `system: object`，`enabled?: boolean` | `boolean` | 启用或禁用一个已注册系统。 |
| `setEntityManager(entityManager)` | `entityManager: EntityManager` | `void` | 绑定实体管理器。 |
| `setTimeScale(scale)` | `scale: number` | `void` | 设置全局模拟速度。 |
| `setFixedDelta(delta)` | `delta: number` | `void` | 设置固定步进。 |
| `loop()` | 无 | `void` | 执行一帧并安排下一次 tick。 |
| `startLoop()` | 无 | `void` | 必要时先初始化，再进入主循环。 |
| `getState()` | 无 | `string` | 获取当前状态。 |
| `isInteractive()` | 无 | `boolean` | 判断当前是否处于菜单类可交互状态。 |
| `isPaused()` | 无 | `boolean` | 判断当前是否暂停。 |
| `isPlaying()` | 无 | `boolean` | 判断当前是否处于 `PLAYING`。 |

### 14.2 场景系统

#### `Scene`

`new Scene(name = 'scene', options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `name` | string | `'scene'` | 场景标识。 |
| `options.camera` | `Camera2D` | 新建实例 | 用于渲染的相机。 |
| `options.managed` | boolean | `true` | 是否自动绑定到引擎运行时。 |
| `options.autoClear` | boolean | `true` | 是否每帧自动清屏。 |
| `options.autoPresent` | boolean | `true` | 是否每帧自动输出到 `stdout`。 |
| `options.systemPriority` | number | `0` | 场景运行时系统注册到引擎时使用的优先级。 |

返回值：`Scene`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `attach(app)` | `app: EngineApp` | `void` | 绑定场景到 app。 |
| `detach()` | 无 | `void` | 解除 app 绑定。 |
| `enter()` | 无 | `void` | 标记场景激活，必要时绑定运行时，并调用 `onEnter(app)`。 |
| `exit()` | 无 | `void` | 调用 `onExit(app)`，解绑运行时并标记场景失活。 |
| `onEnter()` | 钩子 | `void` | 场景进入时的初始化逻辑。 |
| `onExit()` | 钩子 | `void` | 场景退出时的清理逻辑。 |
| `onUpdate()` | 钩子 | `void` | 每帧游戏逻辑。 |
| `onFixedUpdate()` | 钩子 | `void` | 固定步进逻辑。 |
| `onRender()` | 钩子 | `void` | 渲染时的额外 UI 或叠层逻辑。 |
| `onInput()` | 钩子 | `void` | 原始输入处理。 |

场景钩子签名：

- `onEnter(app)`
- `onExit(app)`
- `onUpdate(dt, frameCount, meta, app)`
- `onFixedUpdate(dt, frameCount, app)`
- `onRender({ app, renderer, dt, frameCount, alpha })`
- `onInput(key, keyInfo, app)`

#### `SceneManager`

`new SceneManager(app)`

| 输入 | 类型 | 说明 |
|---|---|---|
| `app` | `EngineApp` | 所有场景共享的 app 实例。 |

返回值：`SceneManager`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `add(name, scene)` | `name: string`，`scene: Scene` | `Scene` | 注册并绑定一个场景。 |
| `get(name)` | `name: string` | `Scene \| null` | 获取场景，找不到时返回 `null`。 |
| `start(name)` | `name: string` | `Scene` | 退出当前场景并进入指定场景，若不存在则抛错。 |
| `switchTo(name)` | `name: string` | `Scene` | `start(name)` 的别名。 |
| `stop()` | 无 | `void` | 退出当前场景。 |

### 14.3 输入系统

#### `InputHandler`

`new InputHandler(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.releaseTimeoutMs` | number | `180` | 如果按键在指定时间内没有重复输入，就认为已经释放。 |

返回值：`InputHandler`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `init()` | 无 | `void` | 创建 readline 接口并开始监听按键。 |
| `initTerminal()` | 无 | `void` | 切换到备用终端缓冲区并隐藏光标。 |
| `cleanup()` | 无 | `void` | 恢复终端状态，并清空监听和按键缓存。 |
| `onKey(callback)` | `callback(key, keyInfo)` | `() => void` | 注册按键监听，返回取消监听函数。 |
| `isPressed(key)` | `key: string` | `boolean` | 判断按键当前是否按下。 |
| `isJustPressed(key)` | `key: string` | `boolean` | 判断按键是否在本帧刚按下。 |
| `isJustReleased(key)` | `key: string` | `boolean` | 判断按键是否在本帧刚释放。 |
| `afterFrame(now)` | `now?: number` | `void` | 清理一帧级状态，并让过期按键释放。 |
| `createContext(actionMap)` | `actionMap: ActionMap` | `InputActionContext` | 创建动作缓冲上下文。 |
| `removeContext(context)` | `context: InputActionContext` | `void` | 移除动作上下文。 |
| `getPressedKeys()` | 无 | `Set<string>` | 返回当前按下的按键集合。 |
| `releaseKey(key)` | `key: string` | `void` | 手动移除某个按键。 |
| `clearPressedKeys()` | 无 | `void` | 清空按键和状态缓存。 |

#### `InputActionContext`

由 `InputHandler.createContext(actionMap)` 返回。

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `_handleKey(key)` | `key: string` | `void` | 内部使用，向动作缓冲区写入一次输入。 |
| `consume(action)` | `action: string` | `boolean` | 消耗一次动作输入。 |
| `peek(action)` | `action: string` | `boolean` | 查看动作是否还在缓冲区。 |
| `clear()` | 无 | `void` | 清空缓冲区。 |
| `destroy()` | 无 | `void` | 从输入处理器注销该上下文。 |

#### `ActionMap`

`new ActionMap(bindings = {})`

| 输入 | 类型 | 说明 |
|---|---|---|
| `bindings` | object | 动作名到单个按键或按键数组的映射。 |

返回值：`ActionMap`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `bind(action, keys)` | `action: string`，`keys: string \| string[]` | `this` | 将一个动作绑定到一个或多个按键。 |
| `getKeys(action)` | `action: string` | `string[]` | 获取某个动作绑定的按键。 |
| `getAction(key)` | `key: string` | `string \| null` | 获取某个按键对应的动作。 |
| `matches(key, action)` | `key: string`，`action: string` | `boolean` | 判断按键是否属于某个动作。 |

#### `KeyMapping`

`KeyMapping` 是内置的“动作 -> 按键”映射表。

| 动作 | 按键 |
|---|---|
| `MOVE_UP` | `ArrowUp`，`w`，`W` |
| `MOVE_DOWN` | `ArrowDown`，`s`，`S` |
| `MOVE_LEFT` | `ArrowLeft`，`a`，`A` |
| `MOVE_RIGHT` | `ArrowRight`，`d`，`D` |
| `SHOOT` | ` `，`space` |
| `POWER` | `q`，`Q` |
| `SHIELD` | `e`，`E` |
| `PAUSE` | `p`，`Escape`，`esc` |
| `MENU_UP` | `ArrowUp`，`w`，`W` |
| `MENU_DOWN` | `ArrowDown`，`s`，`S` |
| `CONFIRM` | `Enter`，`return`，` ` |
| `EXIT` | `Escape`，`esc` |
| `LEFT` | `ArrowLeft`，`a`，`A` |
| `RIGHT` | `ArrowRight`，`d`，`D` |

工具函数：

| 函数 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `getAction(key)` | `key: string` | `string \| null` | 获取按键对应的动作。 |
| `matches(key, action)` | `key: string`，`action: string` | `boolean` | 判断按键是否匹配某个动作。 |

### 14.4 核心玩法

#### `EventBus`

`new EventBus()`

返回值：`EventBus`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `on(event, callback)` | `event: string`，`callback(data)` | `() => void` | 订阅事件并返回取消订阅函数。 |
| `off(event, callback)` | `event: string`，`callback: Function` | `void` | 取消某个事件回调。 |
| `emit(event, data)` | `event: string`，`data: any` | `void` | 向所有监听者派发事件。 |
| `once(event, callback)` | `event: string`，`callback(data)` | `void` | 仅订阅一次。 |
| `clear()` | 无 | `void` | 清除所有监听。 |

#### `GameEvents`

| 事件 | 含义 |
|---|---|
| `BULLET_HIT_ENEMY` | 玩家子弹命中敌人。 |
| `BULLET_HIT_BOSS` | 玩家子弹命中 Boss。 |
| `BULLET_HIT_PLAYER` | 敌方子弹命中玩家。 |
| `ENEMY_DESTROYED` | 敌人被销毁。 |
| `BOSS_DESTROYED` | Boss 被销毁。 |
| `PLAYER_DAMAGED` | 玩家受到伤害。 |
| `PLAYER_DESTROYED` | 玩家被销毁。 |
| `PLAYER_COLLISION_ENEMY` | 玩家与敌人碰撞。 |
| `PLAYER_COLLISION_BOSS` | 玩家与 Boss 碰撞。 |
| `POWERUP_COLLECTED` | 收集到道具。 |
| `WAVE_START` | 波次开始。 |
| `WAVE_CLEAR` | 波次清空。 |
| `BOSS_SPAWN` | Boss 出现。 |
| `GAME_START` | 游戏开始。 |
| `GAME_PAUSE` | 游戏暂停。 |
| `GAME_RESUME` | 游戏继续。 |
| `GAME_OVER` | 游戏失败。 |
| `VICTORY` | 游戏胜利。 |
| `EXPLOSION` | 请求爆炸特效。 |
| `PLAY_SOUND` | 请求播放音效。 |

#### `Entity`

`new Entity(type, data = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `type` | string | 必填 | 实体类别。 |
| `data.x` / `data.y` | number | `0` | 位置。 |
| `data.width` / `data.height` | number | `1` | 碰撞盒尺寸。 |
| `data.art` | array | `[]` | ASCII 贴图。 |
| `data.color` | string | `#ffffff` | 渲染颜色。 |
| `data.life` | number | `Infinity` | 剩余生命周期。 |
| `data.maxLife` | number | `life` | 生命周期上限。 |
| `data.speed` | number | `1` | 基础速度。 |
| `data.vx` / `data.vy` | number | `0` | 速度分量。 |
| `data.isEnemy` | boolean | 省略 | 子弹专用标记。 |
| `data.damage` | number | 省略 | 子弹伤害。 |
| `data.pierce` | boolean | 省略 | 穿透标记。 |
| `data.char` | string | 省略 | 单字符表示。 |

返回值：`Entity`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `getBounds()` | 无 | `{ left, right, top, bottom }` | 返回实体 AABB。 |
| `collidesWith(other)` | `other: Entity` | `boolean` | 判断是否与另一个实体碰撞。 |
| `update(dt)` | `dt: number` | `void` | 更新位置和生命周期。 |
| `destroy()` | 无 | `void` | 将实体标记为失活。 |

#### `EntityType`

| 值 | 含义 |
|---|---|
| `PLAYER` | 玩家实体。 |
| `ENEMY` | 普通敌人实体。 |
| `BOSS` | Boss 实体。 |
| `BULLET` | 子弹实体。 |
| `POWERUP` | 可拾取道具。 |
| `PARTICLE` | 粒子实体。 |

#### `EntityManager`

`new EntityManager(eventBus)`

| 输入 | 类型 | 说明 |
|---|---|---|
| `eventBus` | `EventBus` | 可选共享总线；省略时会创建新实例。 |

返回值：`EntityManager`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `create(type, data)` | `type: string`，`data: object \| Entity` | `Entity` | 创建新实体，或直接存储已有实体实例。 |
| `setPlayer(player)` | `player: Entity` | `void` | 设置当前玩家实体。 |
| `destroy(entity)` | `entity: Entity` | `void` | 销毁实体并从分类和标签中移除。 |
| `addTag(entity, tag)` | `entity: Entity`，`tag: string` | `void` | 给实体添加标签。 |
| `getByTag(tag)` | `tag: string` | `Entity[]` | 返回所有拥有该标签的实体。 |
| `getEnemies()` | 无 | `Entity[]` | 返回敌人数组。 |
| `getEnemyBullets()` | 无 | `Entity[]` | 返回 `isEnemy` 为真的子弹。 |
| `getPlayerBullets()` | 无 | `Entity[]` | 返回 `isEnemy` 为假的子弹。 |
| `getPlayer()` | 无 | `Entity \| null` | 返回玩家实体。 |
| `getBoss()` | 无 | `Entity \| null` | 返回 Boss 实体。 |
| `getPowerups()` | 无 | `Entity[]` | 返回所有道具。 |
| `getParticles()` | 无 | `Entity[]` | 返回所有粒子。 |
| `getBullets()` | 无 | `Entity[]` | 返回所有子弹。 |
| `update(dt)` | `dt: number` | `void` | 更新并清理所有实体分类。 |
| `clear()` | 无 | `void` | 清空除玩家外的所有实体。 |
| `clearAll()` | 无 | `void` | 清空所有实体，包括玩家。 |
| `getStats()` | 无 | object | 返回敌人、子弹、道具、粒子计数，以及 Boss / 玩家是否存在。 |

#### `CollisionSystem`

`new CollisionSystem()`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `checkCollision(a, b, margin)` | `a`、`b` 具备 `x/y/width/height`，`margin?: number` | `boolean` | AABB 碰撞检测。 |
| `pointInRect(px, py, rect)` | `px: number`，`py: number`，`rect: { x, y, width, height }` | `boolean` | 点是否在矩形内。 |
| `circleCollision(a, b)` | `a`、`b` 具备 `x/y/radius` | `boolean` | 圆形碰撞检测。 |
| `checkPlayerBulletsVsEnemies(playerBullets, enemies, margin)` | 数组 | `{ bullet, enemy }[]` | 玩家子弹与敌人碰撞结果。 |
| `checkPlayerBulletsVsBoss(playerBullets, boss, margin)` | 数组 / 对象 | `{ bullet, boss }[]` | 玩家子弹与 Boss 碰撞结果。 |
| `checkEnemyBulletsVsPlayer(enemyBullets, player, margin)` | 数组 / 对象 | `{ bullet }[]` | 敌方子弹与玩家碰撞结果。 |
| `checkEnemiesVsPlayer(enemies, player, margin)` | 数组 / 对象 | `{ enemy }[]` | 敌人与玩家碰撞结果。 |
| `checkBossVsPlayer(boss, player, margin)` | 对象 / 对象 | `boolean` | Boss 与玩家是否重叠。 |
| `checkPowerupsVsPlayer(powerups, player, margin)` | 数组 / 对象 | `{ powerup }[]` | 道具拾取结果。 |
| `isOnScreen(entity, screenWidth, screenHeight, margin)` | 实体 + 屏幕边界 | `boolean` | 判断实体是否仍在屏幕范围内。 |

#### `PhysicsWorld`

`new PhysicsWorld(collision = new CollisionSystem())`

| 输入 | 类型 | 说明 |
|---|---|---|
| `collision` | `CollisionSystem` | 内部使用的碰撞辅助器。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `add(groupName, entity, options)` | `groupName: string`，`entity: object`，`options.layer?`，`options.mask?` | `entity` | 将实体注册到一个碰撞分组。 |
| `remove(groupName, entity)` | `groupName: string`，`entity: object` | `void` | 从分组和 body 注册表中移除实体。 |
| `getGroup(groupName)` | `groupName: string` | array | 返回某个分组中的所有实体。 |
| `setLayerRule(layerA, layerB, enabled)` | `layerA: string`，`layerB: string`，`enabled?: boolean` | `void` | 开启或关闭某对 layer 的碰撞规则。 |
| `canCollide(entityA, entityB)` | 两个实体 | `boolean` | 检查 mask 和显式 layer 规则。 |
| `testGroup(groupA, groupB, callback, margin)` | 分组名 + 回调 | `void` | 遍历两组实体并对重叠对调用回调。 |
| `queryRect(rect, options)` | `rect: object`，`options.groupName?`，`options.layer?`，`options.margin?` | array | 返回与查询矩形重叠的实体。 |
| `raycast(start, end, options)` | `start`，`end`，`options.steps?`，`options.groupName?`，`options.layer?`，`options.first?` | 命中结果 | 默认返回第一个命中；`first === false` 时返回全部命中。 |

### 14.5 渲染系统

#### `Renderer`

`new Renderer(width, height, stdout = process.stdout)`

| 输入 | 类型 | 说明 |
|---|---|---|
| `width` | number | 渲染宽度。 |
| `height` | number | 渲染高度。 |
| `stdout` | stream | 终端输出流。 |

返回值：`Renderer`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `setCamera(camera)` | `camera: Camera2D \| null` | `void` | 设置当前相机。 |
| `getCamera()` | 无 | `Camera2D \| null` | 获取当前相机。 |
| `worldToScreen(x, y)` | `x: number`，`y: number` | `{ x, y }` | 将世界坐标投影到屏幕坐标。 |
| `drawCell(...)` | `x, y, char, color?, bold?, layer?, bgColor?` | `void` | 向缓冲区绘制一个单元格。 |
| `drawString(...)` | `x, y, text, color?, bold?, layer?, bgColor?` | `void` | 绘制支持 ANSI 宽度计算的字符串。 |
| `drawText(...)` | `x, y, lines, color?, bold?, layer?, bgColor?` | `void` | 绘制多行文本。 |
| `drawArt(...)` | `x, y, art, color?, bold?, layer?, bgColor?` | `void` | 绘制 ASCII 艺术行。 |
| `fillRect(...)` | `x, y, width, height, char?, color?, bold?, layer?, bgColor?` | `void` | 填充矩形区域。 |
| `clear()` | 无 | `void` | 清空后缓冲区。 |
| `renderBackground(layer)` | `layer?: number` | `void` | 生成星空背景。 |
| `scrollBackground()` | 无 | `void` | 推进星空滚动偏移。 |
| `renderPlayer(player, shipArt, invincibleTimer, layer)` | 玩家 + 贴图 | `void` | 渲染战机与无敌闪烁。 |
| `renderShield(player, maxWidth, layer)` | 玩家 + 宽度 | `void` | 渲染护盾轮廓。 |
| `renderEnemy(enemy, layer)` | 敌人 | `void` | 渲染敌机。 |
| `renderBoss(boss, layer)` | Boss | `void` | 渲染 Boss。 |
| `renderBullet(bullet, layer)` | 子弹 | `void` | 渲染单颗或块状子弹。 |
| `renderPowerup(powerup, layer)` | 道具 | `void` | 渲染道具及其光晕。 |
| `renderParticle(particle, layer)` | 粒子 | `void` | 按生命周期渲染粒子颜色。 |
| `present()` | 无 | `void` | 清屏并写出当前缓冲区。 |
| `getBuffer()` | 无 | `ScreenBuffer` | 返回底层缓冲区。 |
| `toString()` | 无 | `string` | 返回当前 ANSI 帧字符串。 |

`COLORS` 是 ANSI 样式映射，不是玩法枚举。常用键包括 `reset`、`bold`、`dim`、前景色、背景色，以及 `selected`、`inactive`、`border`、`title`、`warning` 等 UI 别名。

`Layer` 枚举：

| 值 | 含义 |
|---|---|
| `BACKGROUND` | 背景层。 |
| `PARTICLES` | 粒子特效层。 |
| `POWERUPS` | 道具层。 |
| `ENEMIES` | 敌机层。 |
| `BOSS` | Boss 层。 |
| `BULLETS` | 子弹层。 |
| `PLAYER` | 玩家层。 |
| `SHIELD` | 护盾叠层。 |
| `CURSOR` | 最高优先级光标 / 选中层。 |

工具函数：`Layer.compare(a, b)` 返回 `a - b`。

像 HUD、横幅、弹窗栈这类项目级覆盖层，建议由具体游戏或示例自行定义层级，而不是放在引擎核心里。

#### `Camera2D`

`new Camera2D(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.x` / `options.y` | number | `0` | 相机位置。 |
| `options.viewportWidth` / `options.viewportHeight` | number \| null | `null` | 视口尺寸。 |
| `options.target` | object \| null | `null` | 跟随目标，通常通过 `follow()` 赋值。 |
| `options.deadZone` | object \| null | `null` | 可选死区矩形。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `setPosition(x, y)` | 数字 | `this` | 设置相机位置。 |
| `setViewport(width, height)` | 数字 | `this` | 设置相机视口。 |
| `follow(target, options)` | `target: object`，`options.deadZone?` | `this` | 让相机跟随目标。 |
| `unfollow()` | 无 | `this` | 取消跟随。 |
| `update()` | 无 | `void` | 根据目标和死区更新相机位置。 |

#### `ScreenBuffer`

`new ScreenBuffer(width, height)`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `clear()` | 无 | `void` | 清空整个缓冲区。 |
| `setCell(x, y, char, color, bold, layer, bgColor)` | 坐标 + 样式 | `void` | 按层级写入单个单元格。 |
| `getCell(x, y)` | 坐标 | `Cell \| null` | 返回单元格，越界时返回 `null`。 |
| `fillRect(x, y, w, h, char, color, bold, layer, bgColor)` | 矩形区域 | `void` | 用同一单元格填充区域。 |
| `drawString(x, y, str, color, bold, layer, bgColor)` | 字符串 | `void` | 绘制支持 ANSI 与全角字符宽度的字符串。 |
| `drawText(x, y, lines, color, bold, layer, bgColor)` | 字符串数组 | `void` | 绘制多行文本。 |
| `drawArt(x, y, art, color, bold, layer, bgColor)` | ASCII 数组 | `void` | 逐行绘制 ASCII 图案。 |
| `drawArtCentered(y, art, color, bold, layer)` | `y` + 图案 | `void` | 将图案水平居中绘制。 |
| `render()` | 无 | `string` | 返回 ANSI 输出字符串。 |
| `debugRender()` | 无 | `string` | 返回用于调试的层级视图。 |

#### `Cell`

`new Cell(char = ' ', color = null, bold = false, bgColor = null)`

方法：

| 方法 | 输出 | 说明 |
|---|---|---|
| `clone()` | `Cell` | 返回单元格副本。 |
| `isEmpty()` | `boolean` | 判断单元格是否没有可见内容或样式。 |

`rendering/ScreenBuffer` 导出的辅助函数：

| 函数 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `isFullWidth(c)` | `c: string` | `boolean` | 判断字符是否应占据两个终端宽度。 |
| `strWidth(str)` | `str: string` | `number` | 计算显示宽度，忽略 ANSI 序列。 |
| `stripAnsi(str)` | `str: string` | `string` | 移除 ANSI 转义序列。 |
| `padEndDisplay(str, width)` | `str: string`，`width: number` | `string` | 按视觉宽度补齐或截断。 |
| `getCenterPadding(str, width)` | `str: string`，`width: number` | `{ left, right }` | 计算居中填充。 |
| `center(str, width)` | `str: string`，`width: number` | `string` | 返回居中文本。 |
| `repeatChar(char, width)` | `char: string`，`width: number` | `string` | 重复字符指定次数。 |

### 14.6 场景树节点

#### `Node2D`

`new Node2D(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `name` | string | `'Node2D'` | 节点名称。 |
| `x` / `y` | number | `0` | 本地坐标。 |
| `rotation` | number | `0` | 旋转值，主要用于玩法数据保存。 |
| `scaleX` / `scaleY` | number | `1` | 本地缩放。 |
| `anchorX` / `anchorY` | number | `0` | 锚点。 |
| `visible` | boolean | `true` | 是否渲染。 |
| `active` | boolean | `true` | 是否更新。 |
| `layer` | number | `0` | 渲染层级。 |
| `tags` | string[] | `[]` | 初始标签。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `setPosition(x, y)` | 数字 | `this` | 设置本地坐标。 |
| `translate(dx, dy)` | 数字 | `this` | 在本地坐标上偏移。 |
| `addChild(node)` | `Node2D` | `node` | 添加子节点。 |
| `removeChild(node)` | `Node2D` | `node` | 移除子节点。 |
| `getWorldPosition()` | 无 | `{ x, y }` | 沿父级链计算世界坐标。 |
| `addTag(tag)` | `string` | `this` | 添加标签。 |
| `hasTag(tag)` | `string` | `boolean` | 判断是否拥有标签。 |
| `updateTree(dt, frameCount)` | 数字 | `void` | 调用自身与子节点的 `update()`。 |
| `renderTree(renderer)` | `Renderer` | `void` | 调用自身与子节点的 `render()`。 |
| `update()` | 钩子 | `void` | 节点更新逻辑。 |
| `render()` | 钩子 | `void` | 节点渲染逻辑。 |

#### `SpriteNode`

`new SpriteNode(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `art` | string[] | `['?']` | 要渲染的 ASCII 图案。 |
| `color` | string | `null` | 渲染颜色。 |
| `bold` | boolean | `false` | 是否加粗。 |

返回值：`SpriteNode`

方法：

| 方法 | 输出 | 说明 |
|---|---|---|
| `render(renderer)` | `void` | 使用世界坐标和节点层级绘制图案。 |

#### `TextNode`

`new TextNode(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `text` | string | `''` | 文本内容。 |
| `color` | string | `null` | 渲染颜色。 |
| `bold` | boolean | `false` | 是否加粗。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `setText(text)` | `text: string` | `this` | 替换文本内容。 |
| `render(renderer)` | `Renderer` | `void` | 在节点位置绘制字符串。 |

#### `TilemapNode`

`new TilemapNode(options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `tiles` | array | `[]` | 二维瓦片矩阵。 |
| `palette` | object | `{}` | 字符到单元格的调色板映射。 |
| `layer` | number | `0` | 默认瓦片层级。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `setTiles(tiles)` | `tiles: array` | `this` | 替换瓦片网格。 |
| `setPalette(palette)` | `palette: object` | `this` | 替换调色板。 |
| `render(renderer)` | `Renderer` | `void` | 逐格绘制瓦片网格。 |

### 14.7 资源与动画

#### `ResourceManager`

`new ResourceManager()`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `register(name, value, metadata)` | `name: string`，`value: any`，`metadata?: object` | `value` | 将资源存入缓存。 |
| `has(name)` | `name: string` | `boolean` | 判断资源是否存在。 |
| `get(name, fallback)` | `name: string`，`fallback?: any` | `any` | 返回缓存值或兜底值。 |
| `getMetadata(name)` | `name: string` | `object \| null` | 返回资源元数据。 |
| `unload(name)` | `name: string` | `void` | 删除单个资源。 |
| `clear(prefix)` | `prefix?: string \| null` | `void` | 清空所有资源，或按前缀批量清理。 |
| `loadTextSync(name, filePath, options)` | 文件路径 + 选项 | `string` | 同步加载并注册文本。 |
| `loadJsonSync(name, filePath, options)` | 文件路径 + 选项 | `any` | 同步加载并注册 JSON。 |
| `loadText(name, filePath, options)` | 文件路径 + 选项 | `Promise<string>` | 异步加载并注册文本。 |
| `loadJson(name, filePath, options)` | 文件路径 + 选项 | `Promise<any>` | 异步加载并注册 JSON。 |

这些 loader 方法创建的元数据包含 `type`（`text` 或 `json`）和 `filePath`。

#### `EngineTime`

`new EngineTime()`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `initialize(now)` | `now?: number` | `void` | 在主循环启动时重置帧级状态。已注册任务会保留。 |
| `now()` | 无 | `number` | 返回缩放后的游戏时间，单位为毫秒。 |
| `realNow()` | 无 | `number` | 返回引擎主循环最近一次看到的真实时间戳。 |
| `delta()` | 无 | `number` | 返回当前帧的缩放后 delta。 |
| `unscaledDelta()` | 无 | `number` | 返回当前帧在时间缩放前的 delta。 |
| `fixedDelta()` | 无 | `number` | 返回最近一帧使用的固定步进值。 |
| `alpha()` | 无 | `number` | 返回最近一帧的插值 alpha。 |
| `frame()` | 无 | `number` | 返回当前帧编号。 |
| `isPaused()` | 无 | `boolean` | 返回最近一帧是否处于暂停推进。 |
| `after(delay, callback, options)` | `delay: number`、`callback(ctx)`、`options?: { owner?, scaled? }` | 任务句柄 | 延时执行一次回调。 |
| `every(interval, callback, options)` | `interval: number`、`callback(ctx)`、`options?: { owner?, scaled? }` | 任务句柄 | 周期执行回调；回调返回 `false` 时停止。 |
| `nextFrame(callback, options)` | `callback(ctx)`、`options?: { owner? }` | 任务句柄 | 下一帧执行一次回调。 |
| `cancel(handle)` | 任务句柄或 id | `boolean` | 取消单个任务。 |
| `cancelByOwner(owner)` | `owner: any` | `number` | 取消某个 owner 关联的全部任务。 |
| `clear()` | 无 | `void` | 清空所有调度任务。 |

#### `AnimationPlayer`

`new AnimationPlayer()`

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `tween(target, property, to, duration, options)` | 目标对象 + 属性 + 目标值 | `Tween` | 创建并跟踪一个 tween。 |
| `update(dt)` | `dt: number` | `void` | 更新活动 tween，并移除已完成项。 |
| `stopTweensFor(target, property)` | `target: object`，`property?: string \| null` | `void` | 停止某个目标的 tween，可限定某个属性。 |
| `clear()` | 无 | `void` | 清空所有 tween。 |

#### `Tween`

`new Tween(target, property, to, duration, options = {})`

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `target` | object | 必填 | 被动画化的目标对象。 |
| `property` | string | 必填 | 要动画化的属性名。 |
| `to` | number | 必填 | 最终数值。 |
| `duration` | number | 必填 | 动画时长，单位为毫秒。 |
| `options.from` | number | 当前属性值 | 起始值。 |
| `options.easing` | function \| string | `'linear'` | 缓动函数或 `EASING` 中的名称。 |
| `options.onComplete` | function | `null` | 完成回调。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `update(dt)` | `dt: number` | `boolean` | 推进 tween，完成时返回 `true`。 |

`EASING` 枚举：

| 值 | 含义 |
|---|---|
| `linear` | 线性插值。 |
| `easeInQuad` | 二次加速曲线。 |
| `easeOutQuad` | 二次减速曲线。 |
| `easeInOutQuad` | 平滑的二次进出曲线。 |

### 14.8 布局与组件

引擎现在在 widget 组合和终端绘制之间提供了一层轻量的 layout API。

这一层默认感知“视觉宽度”：

- 宽度计算会忽略 ANSI 转义序列。
- 全角字符，例如很多中文字符，会占用 2 列终端宽度。
- 本节中所有 `width` 都指终端显示宽度，不是 JavaScript 字符串长度。

引擎不再内置顶层 `ui` 包。像 HUD、横幅、弹窗流程这样的更高层覆盖层，应当由具体游戏基于 widgets 自行组合。

#### `BORDER_STYLES`

预设边框字符映射。

边框样式枚举：

| 值 | 含义 |
|---|---|
| `none` | 无边框。 |
| `single` | 单线框。 |
| `double` | 双线框。 |
| `rounded` | 圆角边框。 |
| `ascii` | 仅使用 `+`、`-`、`\|` 的 ASCII 边框。 |

`BORDER_STYLES` 对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `topLeft` | string | 左上角字符。 |
| `topRight` | string | 右上角字符。 |
| `bottomLeft` | string | 左下角字符。 |
| `bottomRight` | string | 右下角字符。 |
| `horizontal` | string | 水平边框字符。 |
| `vertical` | string | 垂直边框字符。 |
| `leftDivider` | string | 分隔线左侧连接字符。 |
| `rightDivider` | string | 分隔线右侧连接字符。 |

对于 `none`，对应值为 `null`。

#### `normalizeLines`

`normalizeLines(lines)`

输入：

| 输入 | 类型 | 说明 |
|---|---|---|
| `lines` | `string \| number \| boolean \| null \| undefined \| Array<any>` | 把任意输入归一化为字符串数组。 |

输出：`string[]`

行为说明：

- `null` 和 `undefined` 会变成 `[]`。
- 单个标量会变成单行数组。
- 数组会逐项转成字符串。

#### `resolveBorder`

`resolveBorder(border)`

输入：

| 输入 | 类型 | 说明 |
|---|---|---|
| `border` | `boolean \| string \| { style?: BorderStyle } \| null \| undefined` | 边框配置。 |

输出：`object | null`

可接受值：

| 值 | 结果 |
|---|---|
| `false`、`null`、`undefined`、`'none'` | 无边框，返回 `null`。 |
| `true` | 使用 `single`。 |
| `BorderStyle` 字符串 | 使用对应预设边框。 |
| `{ style }` | 使用对象内指定的样式。 |

未知字符串或未知 `style` 会回退到 `single`。

#### `borderThickness`

`borderThickness(border)`

输入：与 `resolveBorder(border)` 相同

输出：`number`

返回值：

| 值 | 含义 |
|---|---|
| `0` | 无边框。 |
| `1` | 有边框，每一侧占 1 个单元。 |

#### `measureText`

`measureText(text)`

输入：

| 输入 | 类型 | 说明 |
|---|---|---|
| `text` | `any` | 先转成字符串再测量。 |

输出：`number`

返回单行文本的视觉宽度，会忽略 ANSI 转义序列。

#### `measureLines`

`measureLines(lines)`

输入：

| 输入 | 类型 | 说明 |
|---|---|---|
| `lines` | 与 `normalizeLines` 输入相同 | 要测量的文本块。 |

输出：`{ width: number, height: number }`

返回字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `width` | number | 归一化后所有行中的最大视觉宽度。 |
| `height` | number | 归一化后的总行数。 |

#### `styleText`

`styleText(text, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `text` | any | 必填 | 要附加 ANSI 样式的文本。 |
| `options.color` | string | `''` | ANSI 颜色前缀。 |
| `options.bold` | boolean | `false` | 是否附加 ANSI 粗体。 |

输出：`string`

只要应用了样式，就会在末尾补上 `\x1b[0m`。

#### `alignText`

`alignText(text, width, align = 'left')`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `text` | any | 必填 | 要对齐的文本。 |
| `width` | number | 必填 | 目标视觉宽度。 |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | 水平对齐方式。 |

输出：`string`

行为说明：

- 当 `width <= 0` 时，返回 `''`。
- 当文本宽于目标宽度时，会按视觉宽度安全地裁切或补齐。
- 对齐计算基于终端显示宽度，不是字符串长度。

#### `padBlock`

`padBlock(lines, width, align = 'left')`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `lines` | 与 `normalizeLines` 输入相同 | 必填 | 文本块。 |
| `width` | number | 必填 | 每行的目标宽度。 |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | 应用于每一行的对齐方式。 |

输出：`string[]`

#### `stackBlocks`

`stackBlocks(blocks, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `blocks` | `Array<string \| string[]>` | 必填 | 要按垂直方向拼接的多个文本块。 |
| `options.gap` | number | `0` | 块与块之间插入的空行数。 |

输出：`string[]`

#### `frameLines`

`frameLines(lines, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `lines` | 与 `normalizeLines` 输入相同 | 必填 | 内容文本块。 |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `single` 行为 | 边框配置。 |
| `options.paddingX` | number | `0` | 左右内边距。 |
| `options.paddingY` | number | `0` | 上下内边距。 |
| `options.borderColor` | string | `''` | 边框字符使用的 ANSI 颜色前缀。 |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | 内容行对齐方式。 |
| `options.contentWidth` | number | 自动测量 | 在加 padding 和边框前的内容宽度。 |

输出：`string[]`

#### `dividerLine`

`dividerLine(width, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `width` | number | 必填 | 分隔线主体宽度。 |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `single` 行为 | 边框配置。 |
| `options.borderColor` | string | `''` | 分隔线字符的 ANSI 颜色前缀。 |

输出：`string`

当 `border` 解析为 `null` 时，返回纯 `─` 组成的横线。

#### `frameMetrics`

`frameMetrics(contentWidth, contentHeight, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `contentWidth` | number | 必填 | 内容区宽度。 |
| `contentHeight` | number | 必填 | 内容区高度。 |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `single` 行为 | 边框配置。 |
| `options.paddingX` | number | `0` | 水平 padding。 |
| `options.paddingY` | number | `0` | 垂直 padding。 |

输出：`{ width: number, height: number }`

返回尺寸包含 padding 和边框厚度。

#### `resolvePosition`

`resolvePosition(containerWidth, containerHeight, boxWidth, boxHeight, options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `containerWidth` | number | 必填 | 外部容器宽度。 |
| `containerHeight` | number | 必填 | 外部容器高度。 |
| `boxWidth` | number | 必填 | box 宽度。 |
| `boxHeight` | number | 必填 | box 高度。 |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | 水平锚点。 |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | 垂直锚点。 |
| `options.offsetX` | number | `0` | 锚点计算后的水平偏移。 |
| `options.offsetY` | number | `0` | 锚点计算后的垂直偏移。 |

输出：`{ x: number, y: number }`

返回坐标会被钳制到不小于 `0`。

#### `Widget`

所有 widgets 的基类。

`new Widget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options` | object | `{}` | 原始组件配置，会原样保存在 `this.options`。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure()` | 无 | `{ width, height }` | 返回组件尺寸。基础实现返回 `{ width: 0, height: 0 }`。 |
| `render()` | 无 | `string[]` | 返回渲染后的文本行。基础实现返回 `[]`。 |

#### `TextWidget`

`new TextWidget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.text` | string | `''` | 单段文本；如果传了 `lines` 则忽略。 |
| `options.lines` | `string \| string[]` | `options.text` | 显式指定文本行。 |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | 在渲染宽度内的对齐方式。 |
| `options.color` | string | `null` | ANSI 颜色前缀。 |
| `options.bold` | boolean | `false` | 是否启用 ANSI 粗体。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure()` | 无 | `{ width, height }` | 测量归一化后的文本块大小。 |
| `render(width)` | `width?: number \| null` | `string[]` | 渲染对齐后的文本行；未传时使用自然宽度。 |

#### `BarWidget`

`new BarWidget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.width` | number | `10` | 进度条视觉宽度，最小为 `1`。 |
| `options.value` | number | 未设置 | 直接传入 `[0, 1]` 的归一化比值。 |
| `options.current` | number | 未设置 | 当未提供 `value` 时使用的当前值。 |
| `options.max` | number | 未设置 | 与 `current` 配合使用的最大值。 |
| `options.color` | string | `null` | 已填充部分的 ANSI 颜色。 |
| `options.emptyColor` | string | `null` | 未填充部分的 ANSI 颜色。 |
| `options.bold` | boolean | `false` | 是否启用 ANSI 粗体。 |
| `options.filledChar` | string | `'█'` | 已填充单元使用的字符。 |
| `options.emptyChar` | string | `'░'` | 未填充单元使用的字符。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure()` | 无 | `{ width, height }` | 返回 `{ width: options.width, height: 1 }`。 |
| `render()` | 无 | `string[]` | 返回一行样式化后的进度条。 |

比值规则：

- `value` 优先级高于 `current` / `max`。
- 比值会被钳制到 `[0, 1]`。
- `current` / `max` 无效时会渲染为空条。

#### `MenuWidget`

`new MenuWidget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.items` | `string \| string[]` | `[]` | 菜单项文本。 |
| `options.selectedIndex` | number | `0` | 当前选中项索引。 |
| `options.selectedPrefix` | string | `' ▸ '` | 选中项前缀。 |
| `options.unselectedPrefix` | string | `'   '` | 未选中项前缀。 |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | 菜单项行对齐方式。 |
| `options.itemColor` | string | `null` | 未选中项 ANSI 颜色。 |
| `options.selectedColor` | string | `itemColor` | 选中项 ANSI 颜色。 |
| `options.selectedBold` | boolean | `true` | 选中项是否加粗。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure()` | 无 | `{ width, height }` | 测量带前缀后的最大项宽度和总行数。 |
| `render(width)` | `width?: number \| null` | `string[]` | 按行渲染菜单项。 |

说明：

- `selectedIndex` 只会被钳制到不小于 `0`，不会自动限制到当前菜单长度。
- 只有索引正好命中的一项会应用选中样式。

#### `PanelWidget`

带边框、标题、padding、子块堆叠能力的容器组件。

`new PanelWidget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.width` | number | `null` | 期望的内部内容宽度。 |
| `options.minWidth` | number | `0` | 最小内部宽度。 |
| `options.maxWidth` | number | `null` | 最大内部宽度。 |
| `options.paddingX` | number | `1` | 边框内左右 padding。 |
| `options.paddingY` | number | `0` | 边框内上下 padding。 |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` | 边框配置。 |
| `options.borderColor` | string | `null` | 边框字符 ANSI 颜色。 |
| `options.title` | string | `null` | 可选标题。 |
| `options.titleAlign` | `'left' \| 'center' \| 'right'` | `'center'` | 标题对齐方式。 |
| `options.titleColor` | string | `null` | 标题 ANSI 颜色。 |
| `options.titleBold` | boolean | `true` | 标题是否加粗。 |
| `options.titleDivider` | boolean | `true` | 标题下方是否绘制分隔线。 |
| `options.gap` | number | `0` | 子块之间插入的空行数。 |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | 非 widget 子块以及最终内容行的对齐方式。 |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | 放置时的水平锚点。 |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | 放置时的垂直锚点。 |
| `options.offsetX` | number | `0` | 放置时的水平偏移。 |
| `options.offsetY` | number | `0` | 放置时的垂直偏移。 |
| `options.children` | `Array<Widget \| string \| string[]>` | `[]` | 从上到下堆叠的子内容块。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure(availableWidth)` | `availableWidth?: number \| null` | `{ width, height }` | 测量包含边框后的整体尺寸。 |
| `render(options)` | `options?: { availableWidth?: number \| null }` | `string[]` | 返回渲染后的 panel 文本行。 |
| `resolvePlacement(containerWidth, containerHeight, availableWidth)` | 数字 | `{ x, y }` | 根据 panel 实际尺寸计算锚点放置位置。 |

尺寸规则：

- `width`、`minWidth`、`maxWidth` 作用的是“内部内容宽度”，不是最终带边框后的总宽度。
- 传入 `availableWidth` 时，会先扣除边框和 padding 再约束内部宽度。
- 子 widget 会收到解析后的内部宽度，调用形式是 `child.render(innerWidth)`。

#### `DialogWidget`

用于常见对话框结构的快捷组合。内部会构造一个 `PanelWidget`，并按需加入一个 `TextWidget` 内容块和一个 `MenuWidget` 菜单块。

`new DialogWidget(options = {})`

输入：

| 输入 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `options.width` | number | `null` | 传给内部 `PanelWidget`。 |
| `options.minWidth` | number | `24` | 最小内部宽度。 |
| `options.maxWidth` | number | `null` | 最大内部宽度。 |
| `options.paddingX` | number | `1` | 左右内边距。 |
| `options.paddingY` | number | `0` | 上下内边距。 |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` | 边框配置。 |
| `options.borderColor` | string | `null` | 边框 ANSI 颜色。 |
| `options.title` | string | `''` | 对话框标题。 |
| `options.titleAlign` | `'left' \| 'center' \| 'right'` | `'center'` | 标题对齐方式。 |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | 放置时的水平锚点。 |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | 放置时的垂直锚点。 |
| `options.offsetX` | number | `0` | 放置时的水平偏移。 |
| `options.offsetY` | number | `0` | 放置时的垂直偏移。 |
| `options.gap` | number | `1` | 内容块和菜单块之间的空行数。 |
| `options.content` | `string \| string[]` | `[]` | 正文文本块。 |
| `options.contentAlign` | `'left' \| 'center' \| 'right'` | `'left'` | 正文对齐方式。 |
| `options.contentColor` | string | `null` | 正文 ANSI 颜色。 |
| `options.contentBold` | boolean | `false` | 正文是否加粗。 |
| `options.items` | `string \| string[]` | `[]` | 菜单项。 |
| `options.selectedIndex` | number | `0` | 当前选中菜单索引。 |
| `options.selectedPrefix` | string | 菜单默认值 | 选中项前缀。 |
| `options.unselectedPrefix` | string | 菜单默认值 | 未选中项前缀。 |
| `options.menuAlign` | `'left' \| 'center' \| 'right'` | `'left'` | 菜单项对齐方式。 |
| `options.itemColor` | string | `null` | 未选中菜单项 ANSI 颜色。 |
| `options.selectedColor` | string | `null` | 选中菜单项 ANSI 颜色。 |
| `options.selectedBold` | boolean | `true` 行为 | 选中菜单项是否加粗。 |

方法：

| 方法 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `measure(availableWidth)` | `availableWidth?: number \| null` | `{ width, height }` | 转发给内部 panel 的测量逻辑。 |
| `render(options)` | `options?: { availableWidth?: number \| null }` | `string[]` | 转发给内部 panel 的渲染逻辑。 |
| `resolvePlacement(containerWidth, containerHeight, availableWidth)` | 数字 | `{ x, y }` | 转发给内部 panel 的放置逻辑。 |

## 15. 开发建议

- 构造函数只做静态配置，不要塞入每局状态。
- 每局重置状态放在 `onEnter()`。
- 用 `EntityManager` 统一管理实体生命周期，不要到处维护临时数组。
- `Node2D` 负责表现树，`Entity` 负责玩法状态；默认优先桥接而不是直接合并模型。
- 游戏动作建议通过 `ActionMap` 或 `KeyMapping` 表达，不要到处硬写原始按键。
- 渲染优先级尽量使用 `Layer`，不要散落硬编码数字。
- 跨系统或跨场景的玩法消息，优先通过 `EventBus` 解耦。
- 玩法调度优先通过 `app.time` 实现，不要直接散落 `setTimeout()` 或 `Date.now()`。
- 注册系统时优先显式填写 `owner` 和 `priority`，让清理和执行顺序更清楚。
- 实时逻辑放在 `onUpdate`
- 固定步进逻辑放在 `onFixedUpdate`
- 临时 UI 和覆盖层放在 `onRender`
- 输入映射优先放在 `ActionMap` 或 `KeyMapping`

## 16. 发布清单

发布到 GitHub 和 npm 之前建议确认：

- 运行 `npm test`
- 验证示例游戏
- 检查 `README.md` 和 `docs/ENGINE_GUIDE.md`
- 确认 `package.json` 元信息，尤其是 npm 包名
