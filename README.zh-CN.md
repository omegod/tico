[English](./README.md) | 简体中文

# tico

`tico` 是一个面向 Node.js 的可复用终端 2D 游戏引擎。它保留了常见 2D 引擎的结构，但把渲染目标切换为终端 ASCII 帧。

## 概述

本仓库面向开源发布，npm 包名为 `@omgod/tico`，GitHub 仓库为 `omegod/tico`。

## 特性

- 场景驱动运行时
- 固定步进主循环与插值支持
- 节点树与 `Node2D`、`SpriteNode`、`TextNode`、`TilemapNode`
- 支持相机的终端渲染
- 输入处理与动作映射
- 轻量资源、动画和物理层
- 内置 `HUD`、`Banner`、`Modal` UI 组件
- 提供可直接运行的示例游戏

## 安装

```bash
npm install @omgod/tico
```

本仓库本地开发时执行：

```bash
npm install
```

## 快速开始

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
  }
}

const app = new EngineApp({ width: 80, height: 32 });
app.addScene('hello', new HelloScene());
app.start('hello');
```

## 示例

| 游戏 | 说明 | 运行命令 |
|------|------|----------|
| **星际猎手** | 弹幕射击游戏，6种战机，Boss战斗 | `npm run example:star-hunter` |
| **俄罗斯方块** | 经典方块游戏，7-Bag随机算法，幽灵方块 | `npm run example:tetris` |


- [星际猎手详细介绍](./example/star-hunter/docs/README.zh-CN.md)
- [俄罗斯方块详细介绍](./example/tetris/docs/README.zh-CN.md)

```bash
npm test
```

## 公共 API

包入口会转出 `src/engine/index.js` 中的公共 API。

- 应用与主循环：`EngineApp`、`GameEngine`、`GAME_STATE`
- 场景与节点：`Scene`、`SceneManager`、`Node2D`、`SpriteNode`、`TextNode`、`TilemapNode`
- 系统：`EventBus`、`GameEvents`、`EntityManager`、`Entity`、`EntityType`、`CollisionSystem`、`PhysicsWorld`
- 输入：`InputHandler`、`InputActionContext`、`ActionMap`、`KeyMapping`、`getAction`、`matches`
- 渲染：`Renderer`、`COLORS`、`Layer`、`Camera2D`、`ScreenBuffer`
- 内容与 UI：`ResourceManager`、`AnimationPlayer`、`Tween`、`EASING`、`HUD`、`Banner`、`Modal`

## 项目结构

```text
docs/                   文档
example/                可运行的示例游戏
src/engine/
  animation/            补间与动画辅助
  app/                  EngineApp
  core/                 主循环、事件、实体
  input/                键盘输入与动作映射
  nodes/                场景树节点
  physics/              轻量物理与查询辅助
  rendering/            终端渲染器与帧缓冲
  resources/            资源缓存与加载
  scene/                Scene 与 SceneManager
  ui/                   终端 UI 组件
tests/                  引擎与示例测试
```

## 文档

- [引擎开发指南](./docs/ENGINE_GUIDE.zh-CN.md)
- [贡献指南](./docs/CONTRIBUTING.zh-CN.md)

## 许可证

MIT
