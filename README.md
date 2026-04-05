English | [简体中文](./README.zh-CN.md)

# tico

`tico` is a reusable 2D terminal game engine for Node.js. It keeps the familiar structure of mainstream 2D engines, but renders to ASCII frames in the terminal.

## Overview

This repository is intended for open-source release as `@omgod/tico` on npm and `omegod/tico` on GitHub.

## Features

- Scene-driven runtime
- Fixed-step update loop with interpolation support
- Unified gameplay clock with `after()`, `every()`, and `nextFrame()` scheduling
- Node tree with `Node2D`, `SpriteNode`, `TextNode`, and `TilemapNode`
- Camera-aware terminal rendering
- Input handling and action mapping
- Lightweight resources, animation, and physics layers
- Built-in UI helpers such as `HUD`, `Banner`, and `Modal`
- Example games for quick validation

## Install

```bash
npm install @omgod/tico
```

For local development in this repository:

```bash
npm install
```

## Quick Start

```js
const { EngineApp, Scene, TextNode, SpriteNode, COLORS, Layer } = require('@omgod/tico');

class HelloScene extends Scene {
  constructor() {
    super('hello');

    this.title = new TextNode({
      x: 3,
      y: 2,
      text: 'tico',
      color: COLORS.brightCyan,
      bold: true,
      layer: Layer.HUD
    });

    this.ship = new SpriteNode({
      x: 10,
      y: 8,
      art: [' /\\ ', '<##>', ' \\/ '],
      color: COLORS.brightGreen,
      layer: Layer.PLAYER
    });

    this.root.addChild(this.title);
    this.root.addChild(this.ship);
  }

  onEnter(app) {
    app.engine.setState('running');
    this.direction = 1;
    app.time.every(120, () => {
      this.ship.x += this.direction;
      if (this.ship.x >= 24 || this.ship.x <= 10) {
        this.direction *= -1;
      }
    }, { owner: this });
  }
}

const app = new EngineApp({ width: 80, height: 32 });
app.addScene('hello', new HelloScene());
app.start('hello');
```

`app.time` gives scenes a reusable scheduler that follows engine pause/time-scale rules and auto-cleans scene-owned tasks on exit.

## Examples

| Game | Description | Run |
|------|-------------|-----|
| **Star Hunter** | Bullet-hell shoot 'em up with 6 playable ships and boss battles | `npm run example:star-hunter` |
| **Tetris** | Classic Tetris with JSON tetromino data and scheduler-driven menu/UI hints | `npm run example:tetris` |

- [Star Hunter Details](./example/star-hunter/docs/README.md)
- [Tetris Details](./example/tetris/docs/README.md)

```bash
npm test
```

## Public API

The package root re-exports the engine surface from `src/engine/index.js`.

- App and loop: `EngineApp`, `GameEngine`, `GAME_STATE`, `EngineTime`
- Scene and nodes: `Scene`, `SceneManager`, `Node2D`, `SpriteNode`, `TextNode`, `TilemapNode`
- Systems: `EventBus`, `GameEvents`, `EntityManager`, `Entity`, `EntityType`, `CollisionSystem`, `PhysicsWorld`
- Input: `InputHandler`, `InputActionContext`, `ActionMap`, `KeyMapping`, `getAction`, `matches`
- Rendering: `Renderer`, `COLORS`, `Layer`, `Camera2D`, `ScreenBuffer`
- Content and UX: `ResourceManager`, `AnimationPlayer`, `Tween`, `EASING`, `HUD`, `Banner`, `Modal`

## Project Structure

```text
docs/                   documentation
example/                runnable sample games
src/engine/
  animation/            tween and animation helpers
  app/                  EngineApp
  core/                 loop, events, entities
  input/                keyboard input and action maps
  nodes/                scene graph nodes
  physics/              lightweight physics/query helpers
  rendering/            terminal renderer and frame buffer
  resources/            resource cache and loaders
  scene/                Scene and SceneManager
  ui/                   terminal UI widgets
tests/                  engine and sample tests
```

## Documentation

- [Engine Guide](./docs/ENGINE_GUIDE.md)
- [Engine Evolution Plan](./docs/ENGINE_PLAN.md)
- [Contributing](./docs/CONTRIBUTING.md)

## License

MIT
