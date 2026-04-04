/**
 * Layer - 渲染层级常量
 * 定义游戏渲染的层次顺序
 */

const Layer = {
  // 背景层 (0)
  BACKGROUND: 0,

  // 游戏层
  PARTICLES: 10,
  POWERUPS: 20,
  ENEMIES: 30,
  BOSS: 40,
  BULLETS: 50,
  PLAYER: 60,
  SHIELD: 65,

  // UI层
  HUD: 100,
  BANNER: 200,
  MODAL: 300,

  // 特殊
  CURSOR: 1000
};

// 层级比较函数
Layer.compare = (a, b) => a - b;

module.exports = { Layer };
