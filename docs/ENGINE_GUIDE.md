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

- App and loop: `EngineApp`, `GameEngine`, `GAME_STATE`
- Core: `EventBus`, `GameEvents`, `EntityManager`, `Entity`, `EntityType`, `CollisionSystem`
- Scene graph: `Scene`, `SceneManager`, `Node2D`, `SpriteNode`, `TextNode`, `TilemapNode`
- Input: `InputHandler`, `InputActionContext`, `ActionMap`, `KeyMapping`, `getAction`, `matches`
- Rendering: `Renderer`, `COLORS`, `Layer`, `Camera2D`, `ScreenBuffer`, `Cell`
- Content and UI: `ResourceManager`, `AnimationPlayer`, `Tween`, `EASING`, `HUD`, `Banner`, `Modal`

## 4. Runtime Architecture

`EngineApp` assembles the runtime:

- `engine` for the game loop and state
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
- Put real-time logic in `onUpdate`
- Put fixed-step logic in `onFixedUpdate`
- Put transient overlays and UI in `onRender`
- Keep input mappings in `ActionMap` or `KeyMapping`

## 14. Release Checklist

Before publishing to GitHub and npm:

- Run `npm test`
- Validate the example games
- Review `README.md` and `docs/ENGINE_GUIDE.md`
- Confirm `package.json` metadata, especially the npm package name
