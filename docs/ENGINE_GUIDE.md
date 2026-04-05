English | [简体中文](./ENGINE_GUIDE.zh-CN.md)

# tico Engine Guide

This document describes the current public surface of `tico` and the patterns used in this repository.

## 1. Purpose

`tico` is built for terminal and CLI games. It favors explicit scene management, small engine systems, and ASCII-first rendering.

Good fits:

- ASCII action games
- Grid and turn-based games
- Fast gameplay prototypes
- Teaching and experiments

## 2. Install and Import

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

In this repository during local development:

```js
const { EngineApp, Scene } = require('./src');
```

## 3. Public API Snapshot

The package root re-exports the engine surface from `src/engine/index.js`.

- App and loop: `EngineApp`, `GameEngine`, `GAME_STATE`, `EngineTime`
- Core: `EventBus`, `GameEvents`, `EntityManager`, `Entity`, `EntityType`, `CollisionSystem`
- Scene graph: `Scene`, `SceneManager`, `Node2D`, `SpriteNode`, `TextNode`, `TilemapNode`
- Input: `InputHandler`, `InputActionContext`, `ActionMap`, `KeyMapping`, `getAction`, `matches`
- Rendering: `Renderer`, `COLORS`, `Layer`, `Camera2D`, `ScreenBuffer`, `Cell`
- Content, layout, and widgets: `ResourceManager`, `AnimationPlayer`, `Tween`, `EASING`, `BORDER_STYLES`, `measureText`, `measureLines`, `PanelWidget`, `DialogWidget`, `TextWidget`, `BarWidget`, `MenuWidget`

## 4. Runtime Architecture

`EngineApp` assembles the runtime:

- `engine` for the game loop and state
- `time` for a unified gameplay clock and scheduler
- `renderer` for terminal drawing
- `input` for keyboard events
- `resources` for cached content
- `animations` for tween updates
- `physics` for lightweight queries
- `entities` for entity storage
- `sceneManager` for scene switching

Important methods:

- `addScene(name, scene)`
- `start(sceneName)`
- `switchScene(name)`
- `stop()`
- `getRuntime()`

### Time and Scheduling

`app.time` is the engine-facing gameplay clock. It tracks scaled time, frame metadata, and delayed work that should follow the engine pause/time-scale rules.

Common methods:

- `now()`
- `delta()`
- `unscaledDelta()`
- `after(ms, callback, options)`
- `every(ms, callback, options)`
- `nextFrame(callback, options)`
- `cancel(handle)`
- `cancelByOwner(owner)`

Use `owner: this` from a `Scene` or system-like object so the engine can clean up those tasks when the scene unbinds.

```js
app.time.every(250, () => {
  this.cursorVisible = !this.cursorVisible;
}, { owner: this });

app.time.after(1200, () => {
  this.statusText = '';
}, { owner: this });
```

### Systems

`GameEngine` also acts as a lightweight system scheduler. Systems are plain objects with optional lifecycle hooks and update methods.

Common hooks:

- `onAttach(engine, info)`
- `onEnable(engine, info)`
- `fixedUpdate(dt, frameCount)`
- `update(dt, frameCount, meta)`
- `onDisable(engine, info)`
- `onDetach(engine, info)`

Register systems with optional metadata:

```js
app.engine.registerSystem(debugSystem, {
  owner: this,
  priority: 50,
  id: 'debug:overlay'
});
```

Notes:

- Lower `priority` runs earlier.
- `owner` lets scenes or modules clean up their systems in one call.
- Explicit dependency ordering is not part of the public engine surface yet, so prefer a small number of systems with clear priorities.

## 5. Scene Lifecycle

`Scene` is the main entry point for gameplay code. Each scene owns a root node and a camera.

Lifecycle hooks:

- `onEnter(app)`
- `onExit(app)`
- `onUpdate(dt, frameCount, meta, app)`
- `onFixedUpdate(dt, frameCount, app)`
- `onRender({ app, renderer, dt, frameCount, alpha })`
- `onInput(key, keyInfo, app)`

Options:

- `managed` controls whether the scene binds itself to the engine runtime
- `autoClear` controls whether the renderer clears each frame
- `autoPresent` controls whether the frame is written to stdout automatically
- `systemPriority` controls where the scene runtime sits inside the engine system list

Example:

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

## 6. Input

`InputHandler` normalizes terminal keypresses and tracks per-frame state.

Common methods:

- `init()`
- `initTerminal()`
- `cleanup()`
- `onKey(callback)`
- `isPressed(key)`
- `isJustPressed(key)`
- `isJustReleased(key)`
- `afterFrame()`
- `createContext(actionMap)`

`ActionMap` lets you map game actions to multiple keys:

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

The built-in `KeyMapping` helper covers common actions such as movement, shooting, pause, and confirm.

## 7. Rendering

`Renderer` draws into a `ScreenBuffer` and then flushes the buffer to the terminal.

Main methods:

- `setCamera(camera)`
- `clear()`
- `drawCell(x, y, char, color, bold, layer, bgColor)`
- `drawString(x, y, text, color, bold, layer, bgColor)`
- `drawText(x, y, lines, color, bold, layer, bgColor)`
- `drawArt(x, y, art, color, bold, layer, bgColor)`
- `fillRect(x, y, width, height, char = ' ', color, bold, layer, bgColor)`
- `renderBackground(layer)`
- `scrollBackground()`

Use `Layer` to control draw priority and `COLORS` for ANSI styling.

## 8. Nodes

`Node2D` is the base scene-graph node.

Common methods:

- `setPosition(x, y)`
- `translate(dx, dy)`
- `addChild(node)`
- `removeChild(node)`
- `getWorldPosition()`
- `addTag(tag)`
- `hasTag(tag)`
- `updateTree(dt, frameCount)`
- `renderTree(renderer)`

Specialized nodes:

- `SpriteNode` for ASCII art sprites
- `TextNode` for text labels
- `TilemapNode` for grid maps

### Entity and Node Roles

`Node2D` and `Entity` intentionally serve different jobs:

- Use `Node2D` for scene-tree composition, transforms, and rendering.
- Use `Entity` for gameplay state, collision data, tags, and lifetime.

In other words, `Node2D` is presentation-first while `Entity` is gameplay-first. If a gameplay object needs both, prefer composition or a small adapter layer instead of merging the two models directly.

## 9. Resources

`ResourceManager` provides a small cache for text and JSON data.

Methods:

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

Use namespace-style keys such as `game:ui:title` so `clear('game:ui:')` can release a whole group.

## 10. Animation

`AnimationPlayer` manages tweens, and `Tween` provides a lightweight value animation primitive.

Typical usage:

```js
app.animations.tween(this, 'displayedScore', 1000, 180, {
  easing: 'easeOutQuad'
});
```

## 11. Physics

`PhysicsWorld` is intentionally lightweight. It is designed for collisions, queries, and gameplay checks rather than full rigid-body simulation.

Use it for:

- Bullet hits
- Area damage
- Proximity queries
- Simple obstacle checks

## 12. Recommended Project Layout

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

## 13. Development Workflow

Recommended workflow:

- Keep scene initialization in constructors
- Reset per-run state in `onEnter`

## 14. API Reference

This section documents the public symbols exported by `src/engine/index.js`.

### 14.1 Runtime

#### `EngineApp`

`new EngineApp(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `width` | number | `80` | Terminal width used by the renderer and scene camera. |
| `height` | number | `32` | Terminal height used by the renderer and scene camera. |
| `frameRate` | number | `50` | Loop interval in milliseconds. |
| `stdout` | stream | `process.stdout` | Destination for terminal output. |
| `eventBus` | `EventBus` | new instance | Shared event bus. |
| `engine` | `GameEngine` | new instance | Custom engine instance. |
| `time` | `EngineTime` | `engine.time` | Shared gameplay clock and scheduler. |
| `entities` | `EntityManager` | new instance | Entity container used by scenes and systems. |
| `renderer` | `Renderer` | new instance | ASCII renderer. |
| `input` | `InputHandler` | new instance | Keyboard handler. |
| `resources` | `ResourceManager` | new instance | Asset cache. |
| `animations` | `AnimationPlayer` | new instance | Tween manager. |
| `physics` | `PhysicsWorld` | new instance | Lightweight collision/query world. |

Returns: `EngineApp`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `getRuntime()` | none | object | Returns the current runtime bundle (`width`, `height`, `stdout`, `engine`, `time`, `entities`, `renderer`, `input`, `resources`, `animations`, `physics`). |
| `addScene(name, scene)` | `name: string`, `scene: Scene` | `this` | Registers a scene and attaches the app to it. |
| `start(sceneName)` | `sceneName: string` | `this` | Initializes terminal input, binds cleanup handlers, starts the scene, and starts the engine loop. |
| `switchScene(name)` | `name: string` | `this` | Switches to another registered scene. |
| `stop()` | none | `void` | Stops the active scene, stops the engine, and restores terminal input state. |

#### `GameEngine`

`new GameEngine(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `width` | number | `80` | Logical width used by systems. |
| `height` | number | `32` | Logical height used by systems. |
| `frameRate` | number | `50` | Legacy interval value, measured in milliseconds. |
| `frameDuration` | number | `frameRate` | Frame scheduling interval in milliseconds. |
| `fixedDelta` | number | `frameDuration` | Fixed-step update interval. |
| `maxDelta` | number | `250` | Delta clamp to prevent huge frame jumps. |
| `timeScale` | number | `1` | Global speed multiplier. |
| `initialState` | string | `GAME_STATE.BOOT` | Initial engine state. |
| `eventBus` | `EventBus` | new instance | Shared event bus. |
| `time` | `EngineTime` | new instance | Shared gameplay clock and scheduler. |

Returns: `GameEngine`

`GAME_STATE` enum:

| Value | Meaning |
|---|---|
| `BOOT` | Boot state before the game loop becomes interactive. |
| `RUNNING` | Active engine state used immediately after boot. |
| `STOPPED` | Loop has been stopped and the engine is inactive. |
| `MENU` | Main menu state. |
| `SHIP_SELECT` | Ship selection state. |
| `INSTRUCTIONS` | How-to-play / instructions state. |
| `PLAYING` | In-game active state. |
| `PAUSED` | Paused gameplay state. |
| `GAME_OVER` | Loss state. |
| `VICTORY` | Win state. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `onRender(callback)` | `callback(dt, frameCount, alpha)` | `void` | Registers the per-frame render callback. |
| `init()` | none | `void` | Starts the loop bookkeeping and emits `GameEvents.GAME_START`. |
| `stop()` | none | `void` | Stops the loop, clears the timeout, and clears the event bus. |
| `pause()` | none | `void` | Switches from `PLAYING` or `RUNNING` to `PAUSED`. |
| `resume()` | none | `void` | Restores the previous state after pause. |
| `togglePause()` | none | `void` | Toggles pause and resume. |
| `setState(newState)` | `newState: string` | `string` | Sets state and returns the previous state. |
| `registerSystem(system, options)` | `system: { onAttach?, onEnable?, update?, fixedUpdate?, onDisable?, onDetach? }`, `options?: { priority?, owner?, id?, enabled? }` | `system` | Adds a system to the engine update list and applies optional scheduling metadata. |
| `unregisterSystem(system)` | `system: object` | `void` | Removes a system from the engine update list. |
| `unregisterSystemsByOwner(owner)` | `owner: any` | `number` | Removes all systems registered by one owner token. |
| `setSystemEnabled(system, enabled)` | `system: object`, `enabled?: boolean` | `boolean` | Enables or disables one registered system. |
| `setEntityManager(entityManager)` | `entityManager: EntityManager` | `void` | Binds the engine to an entity manager. |
| `setTimeScale(scale)` | `scale: number` | `void` | Sets the global simulation speed. |
| `setFixedDelta(delta)` | `delta: number` | `void` | Sets the fixed update step. |
| `loop()` | none | `void` | Runs one frame and schedules the next tick. |
| `startLoop()` | none | `void` | Starts the engine if needed and enters the main loop. |
| `getState()` | none | `string` | Returns the current state. |
| `isInteractive()` | none | `boolean` | Returns whether the current state is a menu-like state. |
| `isPaused()` | none | `boolean` | Returns whether the engine is paused. |
| `isPlaying()` | none | `boolean` | Returns whether the engine is in `PLAYING`. |

### 14.2 Scene System

#### `Scene`

`new Scene(name = 'scene', options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `name` | string | `'scene'` | Scene identifier. |
| `options.camera` | `Camera2D` | new instance | Camera used for rendering. |
| `options.managed` | boolean | `true` | Whether the scene binds itself into the engine runtime. |
| `options.autoClear` | boolean | `true` | Whether the renderer clears every frame. |
| `options.autoPresent` | boolean | `true` | Whether the frame is written to `stdout` automatically. |
| `options.systemPriority` | number | `0` | Priority used when the scene runtime registers itself as an engine system. |

Returns: `Scene`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `attach(app)` | `app: EngineApp` | `void` | Attaches the scene to an app instance. |
| `detach()` | none | `void` | Clears the app reference. |
| `enter()` | none | `void` | Marks the scene active, binds runtime hooks if needed, and calls `onEnter(app)`. |
| `exit()` | none | `void` | Calls `onExit(app)`, unbinds runtime hooks, and marks the scene inactive. |
| `onEnter()` | hook | `void` | Override for scene setup. |
| `onExit()` | hook | `void` | Override for teardown. |
| `onUpdate()` | hook | `void` | Override for per-frame game logic. |
| `onFixedUpdate()` | hook | `void` | Override for fixed-step logic. |
| `onRender()` | hook | `void` | Override for render-time overlays or UI. |
| `onInput()` | hook | `void` | Override for raw input handling. |

Scene hook signatures:

- `onEnter(app)`
- `onExit(app)`
- `onUpdate(dt, frameCount, meta, app)`
- `onFixedUpdate(dt, frameCount, app)`
- `onRender({ app, renderer, dt, frameCount, alpha })`
- `onInput(key, keyInfo, app)`

#### `SceneManager`

`new SceneManager(app)`

| Input | Type | Description |
|---|---|---|
| `app` | `EngineApp` | App instance shared by all scenes. |

Returns: `SceneManager`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `add(name, scene)` | `name: string`, `scene: Scene` | `Scene` | Registers and attaches a scene. |
| `get(name)` | `name: string` | `Scene \| null` | Returns a scene or `null`. |
| `start(name)` | `name: string` | `Scene` | Exits the current scene, enters the named scene, and throws if it does not exist. |
| `switchTo(name)` | `name: string` | `Scene` | Alias of `start(name)`. |
| `stop()` | none | `void` | Exits the current scene, if any. |

### 14.3 Input

#### `InputHandler`

`new InputHandler(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.releaseTimeoutMs` | number | `180` | Time in milliseconds before a pressed key is treated as released if no repeat arrives. |

Returns: `InputHandler`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `init()` | none | `void` | Creates the readline interface and begins keypress tracking. |
| `initTerminal()` | none | `void` | Switches to the alternate terminal buffer and hides the cursor. |
| `cleanup()` | none | `void` | Restores terminal state and clears listeners and cached key state. |
| `onKey(callback)` | `callback(key, keyInfo)` | `() => void` | Registers a key listener and returns an unsubscribe function. |
| `isPressed(key)` | `key: string` | `boolean` | Returns whether the key is currently held. |
| `isJustPressed(key)` | `key: string` | `boolean` | Returns whether the key was pressed this frame. |
| `isJustReleased(key)` | `key: string` | `boolean` | Returns whether the key was released this frame. |
| `afterFrame(now)` | `now?: number` | `void` | Clears one-frame flags and expires stale pressed keys. |
| `createContext(actionMap)` | `actionMap: ActionMap` | `InputActionContext` | Creates a buffered action context. |
| `removeContext(context)` | `context: InputActionContext` | `void` | Removes an action context. |
| `getPressedKeys()` | none | `Set<string>` | Returns the current pressed-key set. |
| `releaseKey(key)` | `key: string` | `void` | Manually removes a key from the pressed set. |
| `clearPressedKeys()` | none | `void` | Clears pressed keys and state caches. |

#### `InputActionContext`

Returned by `InputHandler.createContext(actionMap)`.

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `_handleKey(key)` | `key: string` | `void` | Internal buffer update used by `InputHandler`. |
| `consume(action)` | `action: string` | `boolean` | Consumes one buffered action press. |
| `peek(action)` | `action: string` | `boolean` | Checks whether an action is buffered. |
| `clear()` | none | `void` | Clears the action buffer. |
| `destroy()` | none | `void` | Unregisters the context from the input handler. |

#### `ActionMap`

`new ActionMap(bindings = {})`

| Input | Type | Description |
|---|---|---|
| `bindings` | object | Mapping from action names to a string or array of key names. |

Returns: `ActionMap`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `bind(action, keys)` | `action: string`, `keys: string \| string[]` | `this` | Binds one action to one or more keys. |
| `getKeys(action)` | `action: string` | `string[]` | Returns the bound keys for an action. |
| `getAction(key)` | `key: string` | `string \| null` | Returns the first action mapped to a key. |
| `matches(key, action)` | `key: string`, `action: string` | `boolean` | Checks whether the key belongs to the action. |

#### `KeyMapping`

`KeyMapping` is a built-in action-to-key map.

| Action | Keys |
|---|---|
| `MOVE_UP` | `ArrowUp`, `w`, `W` |
| `MOVE_DOWN` | `ArrowDown`, `s`, `S` |
| `MOVE_LEFT` | `ArrowLeft`, `a`, `A` |
| `MOVE_RIGHT` | `ArrowRight`, `d`, `D` |
| `SHOOT` | ` `, `space` |
| `POWER` | `q`, `Q` |
| `SHIELD` | `e`, `E` |
| `PAUSE` | `p`, `Escape`, `esc` |
| `MENU_UP` | `ArrowUp`, `w`, `W` |
| `MENU_DOWN` | `ArrowDown`, `s`, `S` |
| `CONFIRM` | `Enter`, `return`, ` ` |
| `EXIT` | `Escape`, `esc` |
| `LEFT` | `ArrowLeft`, `a`, `A` |
| `RIGHT` | `ArrowRight`, `d`, `D` |

Utility functions:

| Function | Input | Output | Description |
|---|---|---|---|
| `getAction(key)` | `key: string` | `string \| null` | Returns the mapped action for a key. |
| `matches(key, action)` | `key: string`, `action: string` | `boolean` | Returns whether a key matches an action. |

### 14.4 Core Gameplay

#### `EventBus`

`new EventBus()`

Returns: `EventBus`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `on(event, callback)` | `event: string`, `callback(data)` | `() => void` | Subscribes to an event and returns an unsubscribe function. |
| `off(event, callback)` | `event: string`, `callback: Function` | `void` | Removes a callback from an event. |
| `emit(event, data)` | `event: string`, `data: any` | `void` | Dispatches an event to all listeners. |
| `once(event, callback)` | `event: string`, `callback(data)` | `void` | Subscribes for one delivery only. |
| `clear()` | none | `void` | Removes all listeners. |

#### `GameEvents`

| Event | Meaning |
|---|---|
| `BULLET_HIT_ENEMY` | Player bullet hit an enemy. |
| `BULLET_HIT_BOSS` | Player bullet hit the boss. |
| `BULLET_HIT_PLAYER` | Enemy bullet hit the player. |
| `ENEMY_DESTROYED` | Enemy was destroyed. |
| `BOSS_DESTROYED` | Boss was destroyed. |
| `PLAYER_DAMAGED` | Player took damage. |
| `PLAYER_DESTROYED` | Player was destroyed. |
| `PLAYER_COLLISION_ENEMY` | Player collided with an enemy. |
| `PLAYER_COLLISION_BOSS` | Player collided with the boss. |
| `POWERUP_COLLECTED` | A power-up was collected. |
| `WAVE_START` | A wave started. |
| `WAVE_CLEAR` | A wave was cleared. |
| `BOSS_SPAWN` | A boss spawned. |
| `GAME_START` | Game loop started. |
| `GAME_PAUSE` | Game paused. |
| `GAME_RESUME` | Game resumed. |
| `GAME_OVER` | Game over event. |
| `VICTORY` | Victory event. |
| `EXPLOSION` | Explosion effect requested. |
| `PLAY_SOUND` | Sound effect requested. |

#### `Entity`

`new Entity(type, data = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `type` | string | required | Entity category. |
| `data.x` / `data.y` | number | `0` | Position. |
| `data.width` / `data.height` | number | `1` | Bounding box size. |
| `data.art` | array | `[]` | ASCII art representation. |
| `data.color` | string | `#ffffff` | Render color. |
| `data.life` | number | `Infinity` | Remaining life ticks. |
| `data.maxLife` | number | `life` | Maximum life for effect systems. |
| `data.speed` | number | `1` | Base speed. |
| `data.vx` / `data.vy` | number | `0` | Velocity components. |
| `data.isEnemy` | boolean | omitted | Bullet-specific flag. |
| `data.damage` | number | omitted | Bullet damage payload. |
| `data.pierce` | boolean | omitted | Piercing flag. |
| `data.char` | string | omitted | Single-character render symbol. |

Returns: `Entity`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `getBounds()` | none | `{ left, right, top, bottom }` | Returns the entity AABB. |
| `collidesWith(other)` | `other: Entity` | `boolean` | Tests overlap against another entity. |
| `update(dt)` | `dt: number` | `void` | Advances position and life counters. |
| `destroy()` | none | `void` | Marks the entity inactive. |

#### `EntityType`

| Value | Meaning |
|---|---|
| `PLAYER` | Player entity. |
| `ENEMY` | Standard enemy entity. |
| `BOSS` | Boss entity. |
| `BULLET` | Bullet entity. |
| `POWERUP` | Collectible power-up. |
| `PARTICLE` | Visual particle. |

#### `EntityManager`

`new EntityManager(eventBus)`

| Input | Type | Description |
|---|---|---|
| `eventBus` | `EventBus` | Optional shared bus; a new one is created if omitted. |

Returns: `EntityManager`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `create(type, data)` | `type: string`, `data: object \| Entity` | `Entity` | Creates a new entity or stores an existing entity instance. |
| `setPlayer(player)` | `player: Entity` | `void` | Sets the active player entity. |
| `destroy(entity)` | `entity: Entity` | `void` | Destroys and removes an entity from all categories and tags. |
| `addTag(entity, tag)` | `entity: Entity`, `tag: string` | `void` | Adds a tag to an entity index. |
| `getByTag(tag)` | `tag: string` | `Entity[]` | Returns all tagged entities. |
| `getEnemies()` | none | `Entity[]` | Returns enemy entities. |
| `getEnemyBullets()` | none | `Entity[]` | Returns bullets whose `isEnemy` flag is true. |
| `getPlayerBullets()` | none | `Entity[]` | Returns bullets whose `isEnemy` flag is false. |
| `getPlayer()` | none | `Entity \| null` | Returns the player entity. |
| `getBoss()` | none | `Entity \| null` | Returns the boss entity. |
| `getPowerups()` | none | `Entity[]` | Returns all power-ups. |
| `getParticles()` | none | `Entity[]` | Returns all particles. |
| `getBullets()` | none | `Entity[]` | Returns all bullets. |
| `update(dt)` | `dt: number` | `void` | Updates and prunes all entity categories. |
| `clear()` | none | `void` | Clears everything except the player. |
| `clearAll()` | none | `void` | Clears every category, including the player. |
| `getStats()` | none | object | Returns counts for enemies, bullets, power-ups, particles, and booleans for boss/player presence. |

#### `CollisionSystem`

`new CollisionSystem()`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `checkCollision(a, b, margin)` | `a`, `b` with `x/y/width/height`, `margin?: number` | `boolean` | AABB overlap test. |
| `pointInRect(px, py, rect)` | `px: number`, `py: number`, `rect: { x, y, width, height }` | `boolean` | Checks whether a point lies inside a rectangle. |
| `circleCollision(a, b)` | `a`, `b` with `x/y/radius` | `boolean` | Circle overlap test. |
| `checkPlayerBulletsVsEnemies(playerBullets, enemies, margin)` | arrays | `{ bullet, enemy }[]` | Returns bullet-enemy collisions. |
| `checkPlayerBulletsVsBoss(playerBullets, boss, margin)` | arrays/object | `{ bullet, boss }[]` | Returns bullet-boss collisions. |
| `checkEnemyBulletsVsPlayer(enemyBullets, player, margin)` | arrays/object | `{ bullet }[]` | Returns enemy bullet-player collisions. |
| `checkEnemiesVsPlayer(enemies, player, margin)` | arrays/object | `{ enemy }[]` | Returns enemy-player collisions. |
| `checkBossVsPlayer(boss, player, margin)` | object/object | `boolean` | Returns whether boss and player overlap. |
| `checkPowerupsVsPlayer(powerups, player, margin)` | array/object | `{ powerup }[]` | Returns power-up pickups. |
| `isOnScreen(entity, screenWidth, screenHeight, margin)` | entity + bounds | `boolean` | Returns whether an entity stays within the screen region. |

#### `PhysicsWorld`

`new PhysicsWorld(collision = new CollisionSystem())`

| Input | Type | Description |
|---|---|---|
| `collision` | `CollisionSystem` | Collision helper used internally. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `add(groupName, entity, options)` | `groupName: string`, `entity: object`, `options.layer?`, `options.mask?` | `entity` | Registers an entity in a collision group. |
| `remove(groupName, entity)` | `groupName: string`, `entity: object` | `void` | Removes an entity from a group and the body registry. |
| `getGroup(groupName)` | `groupName: string` | array | Returns all entities in a group. |
| `setLayerRule(layerA, layerB, enabled)` | `layerA: string`, `layerB: string`, `enabled?: boolean` | `void` | Enables or disables a pairwise collision rule. |
| `canCollide(entityA, entityB)` | entities | `boolean` | Checks body masks and explicit layer rules. |
| `testGroup(groupA, groupB, callback, margin)` | group names, callback | `void` | Tests each pair and invokes the callback for overlapping bodies. |
| `queryRect(rect, options)` | `rect: object`, `options.groupName?`, `options.layer?`, `options.margin?` | array | Returns entities that overlap the query rectangle. |
| `raycast(start, end, options)` | `start`, `end`, `options.steps?`, `options.groupName?`, `options.layer?`, `options.first?` | hit or hits | Returns the first hit by default, or all hits when `first === false`. |

### 14.5 Rendering

#### `Renderer`

`new Renderer(width, height, stdout = process.stdout)`

| Input | Type | Description |
|---|---|---|
| `width` | number | Render width. |
| `height` | number | Render height. |
| `stdout` | stream | Output stream for terminal presentation. |

Returns: `Renderer`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `setCamera(camera)` | `camera: Camera2D \| null` | `void` | Sets the active camera. |
| `getCamera()` | none | `Camera2D \| null` | Returns the active camera. |
| `worldToScreen(x, y)` | `x: number`, `y: number` | `{ x, y }` | Projects world coordinates into screen space. |
| `drawCell(...)` | `x, y, char, color?, bold?, layer?, bgColor?` | `void` | Draws one cell into the buffer. |
| `drawString(...)` | `x, y, text, color?, bold?, layer?, bgColor?` | `void` | Draws a string with ANSI-aware width handling. |
| `drawText(...)` | `x, y, lines, color?, bold?, layer?, bgColor?` | `void` | Draws multiple lines of text. |
| `drawArt(...)` | `x, y, art, color?, bold?, layer?, bgColor?` | `void` | Draws ASCII art rows. |
| `fillRect(...)` | `x, y, width, height, char?, color?, bold?, layer?, bgColor?` | `void` | Fills a rectangle. |
| `clear()` | none | `void` | Clears the back buffer. |
| `renderBackground(layer)` | `layer?: number` | `void` | Fills the screen with the starfield background. |
| `scrollBackground()` | none | `void` | Advances the starfield scroll offset. |
| `renderPlayer(player, shipArt, invincibleTimer, layer)` | player + art | `void` | Renders the ship and invincibility blinking. |
| `renderShield(player, maxWidth, layer)` | player + width | `void` | Renders the shield outline. |
| `renderEnemy(enemy, layer)` | enemy | `void` | Renders an enemy sprite. |
| `renderBoss(boss, layer)` | boss | `void` | Renders a boss sprite. |
| `renderBullet(bullet, layer)` | bullet | `void` | Renders one bullet or bullet block. |
| `renderPowerup(powerup, layer)` | power-up | `void` | Renders a power-up with glow. |
| `renderParticle(particle, layer)` | particle | `void` | Renders a particle with life-based color. |
| `present()` | none | `void` | Clears the terminal and writes the current buffer. |
| `getBuffer()` | none | `ScreenBuffer` | Returns the backing buffer. |
| `toString()` | none | `string` | Returns the current ANSI-rendered frame. |

`COLORS` is an ANSI style map, not a gameplay enum. Common keys include `reset`, `bold`, `dim`, foreground colors, background colors, and UI aliases such as `selected`, `inactive`, `border`, `title`, and `warning`.

`Layer` enum:

| Value | Meaning |
|---|---|
| `BACKGROUND` | Background layer. |
| `PARTICLES` | Particle effects. |
| `POWERUPS` | Power-up sprites. |
| `ENEMIES` | Enemy sprites. |
| `BOSS` | Boss sprites. |
| `BULLETS` | Bullet sprites. |
| `PLAYER` | Player ship. |
| `SHIELD` | Shield overlay. |
| `HUD` | HUD layer. |
| `BANNER` | Banner overlay. |
| `MODAL` | Modal overlay. |
| `CURSOR` | Highest-priority cursor or selection layer. |

Utility: `Layer.compare(a, b)` returns `a - b`.

#### `Camera2D`

`new Camera2D(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.x` / `options.y` | number | `0` | Camera position. |
| `options.viewportWidth` / `options.viewportHeight` | number \| null | `null` | Viewport size. |
| `options.target` | object \| null | `null` | Follow target, assigned later through `follow()`. |
| `options.deadZone` | object \| null | `null` | Optional dead-zone rectangle. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `setPosition(x, y)` | numbers | `this` | Sets the camera position. |
| `setViewport(width, height)` | numbers | `this` | Sets the camera viewport. |
| `follow(target, options)` | `target: object`, `options.deadZone?` | `this` | Makes the camera track a target. |
| `unfollow()` | none | `this` | Clears the tracked target. |
| `update()` | none | `void` | Repositions the camera based on the target and dead zone. |

#### `ScreenBuffer`

`new ScreenBuffer(width, height)`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `clear()` | none | `void` | Clears the full buffer. |
| `setCell(x, y, char, color, bold, layer, bgColor)` | coordinates + style | `void` | Writes a single cell using layer priority. |
| `getCell(x, y)` | coordinates | `Cell \| null` | Returns a cell or `null` if outside bounds. |
| `fillRect(x, y, w, h, char, color, bold, layer, bgColor)` | rectangle | `void` | Fills an area with the same cell. |
| `drawString(x, y, str, color, bold, layer, bgColor)` | string | `void` | Draws ANSI-aware strings and full-width characters. |
| `drawText(x, y, lines, color, bold, layer, bgColor)` | string[] | `void` | Draws multiple lines. |
| `drawArt(x, y, art, color, bold, layer, bgColor)` | string[] | `void` | Draws art line by line. |
| `drawArtCentered(y, art, color, bold, layer)` | `y` + art | `void` | Centers art horizontally. |
| `render()` | none | `string` | Returns the buffer as an ANSI string. |
| `debugRender()` | none | `string` | Returns a layer debug view. |

#### `Cell`

`new Cell(char = ' ', color = null, bold = false, bgColor = null)`

Methods:

| Method | Output | Description |
|---|---|---|
| `clone()` | `Cell` | Returns a copy of the cell. |
| `isEmpty()` | `boolean` | Returns whether the cell has no visible content or style. |

Helpers exported from `rendering/ScreenBuffer`:

| Function | Input | Output | Description |
|---|---|---|---|
| `isFullWidth(c)` | `c: string` | `boolean` | Returns whether a character should take two terminal cells. |
| `strWidth(str)` | `str: string` | `number` | Returns displayed width, excluding ANSI sequences. |
| `stripAnsi(str)` | `str: string` | `string` | Removes ANSI escape sequences. |
| `padEndDisplay(str, width)` | `str: string`, `width: number` | `string` | Pads or truncates to a visual width. |
| `getCenterPadding(str, width)` | `str: string`, `width: number` | `{ left, right }` | Returns left/right padding for centering. |
| `center(str, width)` | `str: string`, `width: number` | `string` | Returns a centered string. |
| `repeatChar(char, width)` | `char: string`, `width: number` | `string` | Repeats a character `width` times. |

### 14.6 Scene Graph Nodes

#### `Node2D`

`new Node2D(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `name` | string | `'Node2D'` | Node name. |
| `x` / `y` | number | `0` | Local position. |
| `rotation` | number | `0` | Rotation value, stored for gameplay use. |
| `scaleX` / `scaleY` | number | `1` | Local scale. |
| `anchorX` / `anchorY` | number | `0` | Anchor point. |
| `visible` | boolean | `true` | Whether the node renders. |
| `active` | boolean | `true` | Whether the node updates. |
| `layer` | number | `0` | Render layer. |
| `tags` | string[] | `[]` | Initial tag set. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `setPosition(x, y)` | numbers | `this` | Sets local position. |
| `translate(dx, dy)` | numbers | `this` | Adds an offset to local position. |
| `addChild(node)` | `Node2D` | `node` | Adds a child node. |
| `removeChild(node)` | `Node2D` | `node` | Removes a child node. |
| `getWorldPosition()` | none | `{ x, y }` | Returns world-space position by walking parent transforms. |
| `addTag(tag)` | `string` | `this` | Adds a tag. |
| `hasTag(tag)` | `string` | `boolean` | Checks whether the node owns a tag. |
| `updateTree(dt, frameCount)` | numbers | `void` | Calls `update()` on the node and its children. |
| `renderTree(renderer)` | `Renderer` | `void` | Calls `render()` on the node and its children. |
| `update()` | hook | `void` | Override for per-node update. |
| `render()` | hook | `void` | Override for per-node rendering. |

#### `SpriteNode`

`new SpriteNode(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `art` | string[] | `['?']` | ASCII art to render. |
| `color` | string | `null` | Render color. |
| `bold` | boolean | `false` | Bold flag. |

Output: `SpriteNode`

Method:

| Method | Output | Description |
|---|---|---|
| `render(renderer)` | `void` | Draws the sprite art using world position and node layer. |

#### `TextNode`

`new TextNode(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `text` | string | `''` | Text content. |
| `color` | string | `null` | Render color. |
| `bold` | boolean | `false` | Bold flag. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `setText(text)` | `text: string` | `this` | Replaces the text content. |
| `render(renderer)` | `Renderer` | `void` | Draws the string at the node position. |

#### `TilemapNode`

`new TilemapNode(options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `tiles` | array | `[]` | 2D tile matrix. |
| `palette` | object | `{}` | String-to-cell palette map. |
| `layer` | number | `0` | Default tile layer. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `setTiles(tiles)` | `tiles: array` | `this` | Replaces the tile grid. |
| `setPalette(palette)` | `palette: object` | `this` | Replaces the palette. |
| `render(renderer)` | `Renderer` | `void` | Draws the tile grid cell by cell. |

### 14.7 Resources and Animation

#### `ResourceManager`

`new ResourceManager()`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `register(name, value, metadata)` | `name: string`, `value: any`, `metadata?: object` | `value` | Stores a resource in the cache. |
| `has(name)` | `name: string` | `boolean` | Checks whether the resource exists. |
| `get(name, fallback)` | `name: string`, `fallback?: any` | `any` | Returns a cached value or the fallback. |
| `getMetadata(name)` | `name: string` | `object \| null` | Returns resource metadata. |
| `unload(name)` | `name: string` | `void` | Removes one resource. |
| `clear(prefix)` | `prefix?: string \| null` | `void` | Clears all resources or a prefix group. |
| `loadTextSync(name, filePath, options)` | file path + options | `string` | Loads and registers text synchronously. |
| `loadJsonSync(name, filePath, options)` | file path + options | `any` | Loads and registers JSON synchronously. |
| `loadText(name, filePath, options)` | file path + options | `Promise<string>` | Loads and registers text asynchronously. |
| `loadJson(name, filePath, options)` | file path + options | `Promise<any>` | Loads and registers JSON asynchronously. |

Metadata created by the loader methods includes `type` (`text` or `json`) and `filePath`.

#### `EngineTime`

`new EngineTime()`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `initialize(now)` | `now?: number` | `void` | Resets frame bookkeeping when the engine loop starts. Existing scheduled tasks remain registered. |
| `now()` | none | `number` | Returns scaled gameplay time in milliseconds. |
| `realNow()` | none | `number` | Returns the latest wall-clock timestamp seen by the engine loop. |
| `delta()` | none | `number` | Returns the current scaled frame delta. |
| `unscaledDelta()` | none | `number` | Returns the current frame delta before time scaling. |
| `fixedDelta()` | none | `number` | Returns the fixed-step size used for the latest frame. |
| `alpha()` | none | `number` | Returns the interpolation alpha for the latest frame. |
| `frame()` | none | `number` | Returns the current frame index. |
| `isPaused()` | none | `boolean` | Returns whether the latest frame advanced while paused. |
| `after(delay, callback, options)` | `delay: number`, `callback(ctx)`, `options?: { owner?, scaled? }` | task handle | Schedules one callback after a delay. |
| `every(interval, callback, options)` | `interval: number`, `callback(ctx)`, `options?: { owner?, scaled? }` | task handle | Schedules a repeating callback. Return `false` from the callback to stop it. |
| `nextFrame(callback, options)` | `callback(ctx)`, `options?: { owner? }` | task handle | Schedules one callback on the next engine frame. |
| `cancel(handle)` | task handle or id | `boolean` | Cancels one scheduled task. |
| `cancelByOwner(owner)` | `owner: any` | `number` | Cancels all scheduled tasks associated with one owner token. |
| `clear()` | none | `void` | Removes all scheduled tasks. |

#### `AnimationPlayer`

`new AnimationPlayer()`

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `tween(target, property, to, duration, options)` | target + property + destination | `Tween` | Creates and tracks a tween. |
| `update(dt)` | `dt: number` | `void` | Updates active tweens and removes completed ones. |
| `stopTweensFor(target, property)` | `target: object`, `property?: string \| null` | `void` | Stops tweens for a target, optionally limited to one property. |
| `clear()` | none | `void` | Removes all tweens. |

#### `Tween`

`new Tween(target, property, to, duration, options = {})`

| Input | Type | Default | Description |
|---|---|---:|---|
| `target` | object | required | Object whose property will be animated. |
| `property` | string | required | Property name to animate. |
| `to` | number | required | Final numeric value. |
| `duration` | number | required | Animation duration in milliseconds. |
| `options.from` | number | current target value | Starting value. |
| `options.easing` | function \| string | `'linear'` | Easing function or easing name from `EASING`. |
| `options.onComplete` | function | `null` | Completion callback. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `update(dt)` | `dt: number` | `boolean` | Advances the tween and returns `true` when finished. |

`EASING` enum:

| Value | Meaning |
|---|---|
| `linear` | Linear interpolation. |
| `easeInQuad` | Accelerating quadratic curve. |
| `easeOutQuad` | Decelerating quadratic curve. |
| `easeInOutQuad` | Smooth in-out quadratic curve. |

### 14.8 Layout and Widgets

The engine exposes a lightweight layout layer between widget composition and terminal drawing.

This layer is display-width aware:

- Width calculations ignore ANSI escape sequences.
- Full-width characters such as many CJK characters occupy 2 columns.
- All `width` values in this section refer to terminal display width, not JavaScript string length.

The engine no longer ships a top-level `ui` package. Higher-level overlays such as HUDs, banners, and modal flows are expected to be built in your game code by composing widgets.

#### `BORDER_STYLES`

Preset border character maps.

Border style enum:

| Value | Meaning |
|---|---|
| `none` | No border. |
| `single` | Single-line box drawing border. |
| `double` | Double-line box drawing border. |
| `rounded` | Rounded-corner border using box drawing characters. |
| `ascii` | ASCII-only border using `+`, `-`, and `\|`. |

`BORDER_STYLES` object keys:

| Field | Type | Description |
|---|---|---|
| `topLeft` | string | Top-left corner character. |
| `topRight` | string | Top-right corner character. |
| `bottomLeft` | string | Bottom-left corner character. |
| `bottomRight` | string | Bottom-right corner character. |
| `horizontal` | string | Horizontal border character. |
| `vertical` | string | Vertical border character. |
| `leftDivider` | string | Left intersection used for divider rows. |
| `rightDivider` | string | Right intersection used for divider rows. |

For `none`, the value is `null`.

#### `normalizeLines`

`normalizeLines(lines)`

Input:

| Input | Type | Description |
|---|---|---|
| `lines` | `string \| number \| boolean \| null \| undefined \| Array<any>` | Normalizes arbitrary content into a string array. |

Output: `string[]`

Behavior:

- `null` and `undefined` become `[]`.
- A scalar becomes a one-line array.
- Arrays are converted item-by-item to strings.

#### `resolveBorder`

`resolveBorder(border)`

Input:

| Input | Type | Description |
|---|---|---|
| `border` | `boolean \| string \| { style?: BorderStyle } \| null \| undefined` | Border configuration. |

Output: `object | null`

Accepted border values:

| Value | Result |
|---|---|
| `false`, `null`, `undefined`, `'none'` | No border, returns `null`. |
| `true` | Uses `single`. |
| `BorderStyle` string | Uses that preset style. |
| `{ style }` | Uses the style in the object. |

Unknown string/object style values fall back to `single`.

#### `borderThickness`

`borderThickness(border)`

Input: same as `resolveBorder(border)`

Output: `number`

Return values:

| Value | Meaning |
|---|---|
| `0` | No border. |
| `1` | Border exists and occupies one cell on each side. |

#### `measureText`

`measureText(text)`

Input:

| Input | Type | Description |
|---|---|---|
| `text` | `any` | Value converted to string before measuring. |

Output: `number`

Returns the display width of a single line after stripping ANSI sequences.

#### `measureLines`

`measureLines(lines)`

Input:

| Input | Type | Description |
|---|---|---|
| `lines` | Same as `normalizeLines` input | Content block to measure. |

Output: `{ width: number, height: number }`

Returned fields:

| Field | Type | Description |
|---|---|---|
| `width` | number | Maximum display width among all normalized lines. |
| `height` | number | Number of normalized lines. |

#### `styleText`

`styleText(text, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `text` | any | required | Text to style. |
| `options.color` | string | `''` | ANSI color prefix. |
| `options.bold` | boolean | `false` | Whether to prepend ANSI bold. |

Output: `string`

Returns a styled string and appends `\x1b[0m` when any style is applied.

#### `alignText`

`alignText(text, width, align = 'left')`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `text` | any | required | Text to align. |
| `width` | number | required | Target display width. |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Horizontal text alignment. |

Output: `string`

Behavior:

- If `width <= 0`, returns `''`.
- If content is wider than `width`, the result is clipped/padded using display-width-safe logic.
- Alignment is calculated using terminal display width.

#### `padBlock`

`padBlock(lines, width, align = 'left')`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `lines` | Same as `normalizeLines` input | required | Content block. |
| `width` | number | required | Target width for each line. |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Alignment applied to every line. |

Output: `string[]`

#### `stackBlocks`

`stackBlocks(blocks, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `blocks` | `Array<string \| string[]>` | required | Multiple text blocks to stack vertically. |
| `options.gap` | number | `0` | Number of empty lines inserted between blocks. |

Output: `string[]`

#### `frameLines`

`frameLines(lines, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `lines` | Same as `normalizeLines` input | required | Content block. |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` behavior | Border configuration. |
| `options.paddingX` | number | `0` | Left and right inner padding. |
| `options.paddingY` | number | `0` | Top and bottom inner padding. |
| `options.borderColor` | string | `''` | ANSI prefix applied to border glyphs. |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | Alignment for content lines. |
| `options.contentWidth` | number | measured width | Explicit content width before padding and border. |

Output: `string[]`

#### `dividerLine`

`dividerLine(width, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `width` | number | required | Divider body width. |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` behavior | Border configuration. |
| `options.borderColor` | string | `''` | ANSI prefix for divider glyphs. |

Output: `string`

When `border` resolves to `null`, returns a plain `─` line.

#### `frameMetrics`

`frameMetrics(contentWidth, contentHeight, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `contentWidth` | number | required | Inner content width. |
| `contentHeight` | number | required | Inner content height. |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` behavior | Border configuration. |
| `options.paddingX` | number | `0` | Horizontal padding. |
| `options.paddingY` | number | `0` | Vertical padding. |

Output: `{ width: number, height: number }`

Returned size includes padding and border thickness.

#### `resolvePosition`

`resolvePosition(containerWidth, containerHeight, boxWidth, boxHeight, options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `containerWidth` | number | required | Outer container width. |
| `containerHeight` | number | required | Outer container height. |
| `boxWidth` | number | required | Box width. |
| `boxHeight` | number | required | Box height. |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | Horizontal anchor. |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | Vertical anchor. |
| `options.offsetX` | number | `0` | Additional horizontal offset after anchoring. |
| `options.offsetY` | number | `0` | Additional vertical offset after anchoring. |

Output: `{ x: number, y: number }`

Returned coordinates are clamped to `>= 0`.

#### `Widget`

Base class for widgets.

`new Widget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options` | object | `{}` | Raw widget configuration, stored as-is on `this.options`. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure()` | none | `{ width, height }` | Returns widget size. Base implementation returns `{ width: 0, height: 0 }`. |
| `render()` | none | `string[]` | Returns rendered lines. Base implementation returns `[]`. |

#### `TextWidget`

`new TextWidget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.text` | `string` | `''` | Single text string. Ignored when `lines` is provided. |
| `options.lines` | `string \| string[]` | `options.text` | Explicit content lines. |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | Alignment within rendered width. |
| `options.color` | string | `null` | ANSI color prefix. |
| `options.bold` | boolean | `false` | Whether to use ANSI bold. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure()` | none | `{ width, height }` | Measures normalized lines. |
| `render(width)` | `width?: number \| null` | `string[]` | Renders aligned lines. When omitted, uses measured width. |

#### `BarWidget`

`new BarWidget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.width` | number | `10` | Bar display width. Minimum is `1`. |
| `options.value` | number | unset | Direct normalized ratio in `[0, 1]`. |
| `options.current` | number | unset | Current value used when `value` is not provided. |
| `options.max` | number | unset | Maximum value used with `current`. |
| `options.color` | string | `null` | ANSI color for filled cells. |
| `options.emptyColor` | string | `null` | ANSI color for empty cells. |
| `options.bold` | boolean | `false` | Whether to use ANSI bold. |
| `options.filledChar` | string | `'█'` | Character used for filled cells. |
| `options.emptyChar` | string | `'░'` | Character used for empty cells. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure()` | none | `{ width, height }` | Returns `{ width: options.width, height: 1 }`. |
| `render()` | none | `string[]` | Returns a single styled bar line. |

Ratio rules:

- `value` takes priority over `current` and `max`.
- Ratios are clamped to `[0, 1]`.
- Invalid `current` / `max` values render an empty bar.

#### `MenuWidget`

`new MenuWidget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.items` | `string \| string[]` | `[]` | Menu item labels. |
| `options.selectedIndex` | number | `0` | Selected item index. |
| `options.selectedPrefix` | string | `' ▸ '` | Prefix for the selected item. |
| `options.unselectedPrefix` | string | `'   '` | Prefix for unselected items. |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | Item line alignment. |
| `options.itemColor` | string | `null` | ANSI color for unselected items. |
| `options.selectedColor` | string | `itemColor` | ANSI color for selected item. |
| `options.selectedBold` | boolean | `true` | Whether the selected item is bold. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure()` | none | `{ width, height }` | Measures the widest prefixed item and total item count. |
| `render(width)` | `width?: number \| null` | `string[]` | Renders one line per item. |

Notes:

- `selectedIndex` is clamped to `>= 0`, but not to the current item count.
- Selection styling is only applied to the item whose index matches `selectedIndex`.

#### `PanelWidget`

Container widget with optional title, border, padding, and child stacking.

`new PanelWidget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.width` | number | `null` | Requested inner content width. |
| `options.minWidth` | number | `0` | Minimum inner width. |
| `options.maxWidth` | number | `null` | Maximum inner width. |
| `options.paddingX` | number | `1` | Horizontal padding inside the frame. |
| `options.paddingY` | number | `0` | Vertical padding inside the frame. |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` | Border configuration. |
| `options.borderColor` | string | `null` | ANSI color for border glyphs. |
| `options.title` | string | `null` | Optional panel title. |
| `options.titleAlign` | `'left' \| 'center' \| 'right'` | `'center'` | Title alignment. |
| `options.titleColor` | string | `null` | ANSI color for title text. |
| `options.titleBold` | boolean | `true` | Whether title text is bold. |
| `options.titleDivider` | boolean | `true` | Whether to draw a divider below the title. |
| `options.gap` | number | `0` | Empty lines between children. |
| `options.align` | `'left' \| 'center' \| 'right'` | `'left'` | Alignment applied to non-widget child text blocks and final body lines. |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | Placement anchor on the x-axis. |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | Placement anchor on the y-axis. |
| `options.offsetX` | number | `0` | Placement x offset. |
| `options.offsetY` | number | `0` | Placement y offset. |
| `options.children` | `Array<Widget \| string \| string[]>` | `[]` | Child blocks rendered top-to-bottom. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure(availableWidth)` | `availableWidth?: number \| null` | `{ width, height }` | Measures the framed panel. |
| `render(options)` | `options?: { availableWidth?: number \| null }` | `string[]` | Returns rendered panel lines. |
| `resolvePlacement(containerWidth, containerHeight, availableWidth)` | numbers | `{ x, y }` | Resolves anchored placement using panel size. |

Sizing behavior:

- `width`, `minWidth`, and `maxWidth` operate on inner content width, not total framed width.
- When `availableWidth` is provided, the inner width is reduced to fit the frame chrome.
- Child widgets receive the resolved inner width through `child.render(innerWidth)`.

#### `DialogWidget`

Convenience composition for common dialog layouts. Internally it builds a `PanelWidget` containing an optional `TextWidget` block and an optional `MenuWidget` block.

`new DialogWidget(options = {})`

Input:

| Input | Type | Default | Description |
|---|---|---:|---|
| `options.width` | number | `null` | Passed to internal `PanelWidget`. |
| `options.minWidth` | number | `24` | Minimum inner width. |
| `options.maxWidth` | number | `null` | Maximum inner width. |
| `options.paddingX` | number | `1` | Horizontal inner padding. |
| `options.paddingY` | number | `0` | Vertical inner padding. |
| `options.border` | `boolean \| BorderStyle \| { style?: BorderStyle }` | `'single'` | Border configuration. |
| `options.borderColor` | string | `null` | ANSI border color. |
| `options.title` | string | `''` | Dialog title. |
| `options.titleAlign` | `'left' \| 'center' \| 'right'` | `'center'` | Title alignment. |
| `options.alignX` | `'left' \| 'center' \| 'right'` | `'center'` | Placement anchor on the x-axis. |
| `options.alignY` | `'top' \| 'center' \| 'bottom'` | `'center'` | Placement anchor on the y-axis. |
| `options.offsetX` | number | `0` | Placement x offset. |
| `options.offsetY` | number | `0` | Placement y offset. |
| `options.gap` | number | `1` | Empty lines between content and menu blocks. |
| `options.content` | `string \| string[]` | `[]` | Body text block. |
| `options.contentAlign` | `'left' \| 'center' \| 'right'` | `'left'` | Body text alignment. |
| `options.contentColor` | string | `null` | ANSI color for content text. |
| `options.contentBold` | boolean | `false` | Whether body text is bold. |
| `options.items` | `string \| string[]` | `[]` | Menu items. |
| `options.selectedIndex` | number | `0` | Selected menu index. |
| `options.selectedPrefix` | string | Menu default | Prefix for selected menu item. |
| `options.unselectedPrefix` | string | Menu default | Prefix for unselected menu item. |
| `options.menuAlign` | `'left' \| 'center' \| 'right'` | `'left'` | Menu item alignment. |
| `options.itemColor` | string | `null` | ANSI color for unselected menu items. |
| `options.selectedColor` | string | `null` | ANSI color for selected menu item. |
| `options.selectedBold` | boolean | `true` behavior | Whether selected menu item is bold. |

Methods:

| Method | Input | Output | Description |
|---|---|---|---|
| `measure(availableWidth)` | `availableWidth?: number \| null` | `{ width, height }` | Delegates to internal panel measurement. |
| `render(options)` | `options?: { availableWidth?: number \| null }` | `string[]` | Delegates to internal panel rendering. |
| `resolvePlacement(containerWidth, containerHeight, availableWidth)` | numbers | `{ x, y }` | Delegates to internal panel placement. |

## 15. Development Notes

- Keep constructors focused on static configuration.
- Reset run-specific state in `onEnter()`.
- Use `EntityManager` for ownership and cleanup, not ad-hoc arrays.
- Use `Node2D` for presentation trees and `Entity` for gameplay state; bridge them instead of merging them by default.
- Use `ActionMap` or `KeyMapping` for game actions instead of raw key checks.
- Prefer `Layer` values over hard-coded render priorities.
- Use `EventBus` for gameplay events that cross systems or scenes.
- Prefer `app.time` over raw `setTimeout()` or `Date.now()` for gameplay scheduling.
- Prefer `owner` + `priority` when registering systems so teardown and execution order stay explicit.
- Put real-time logic in `onUpdate`
- Put fixed-step logic in `onFixedUpdate`
- Put transient overlays and UI in `onRender`
- Keep input mappings in `ActionMap` or `KeyMapping`

## 16. Release Checklist

Before publishing to GitHub and npm:

- Run `npm test`
- Validate the example games
- Review `README.md` and `docs/ENGINE_GUIDE.md`
- Confirm `package.json` metadata, especially the npm package name
