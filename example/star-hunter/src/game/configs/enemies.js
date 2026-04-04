/**
 * enemies.js - 6种敌人配置
 * 定义所有敌人的属性、移动模式和外观
 */

const { COLORS } = require('../../../../../src/engine/rendering/Renderer');

// 敌人ASCII艺术
const ENEMY_ARTS = [
  [' ╭─╮ ', '╭█▓█╮', ' ╰▼╯ '],        // Type 0: Fighter - small fast
  [' ╭█╮ ', '█▓▓▓█', ' ╰▼╯ '],        // Type 1: Tank - medium armored
  [' ╭◇╮ ', '╭▓◉▓╮', ' ╰▼╯ '],        // Type 2: Scout - fast circular
  [' ╭▾╮ ', '╭█▅█╮', ' ╰▼╯ '],        // Type 3: Arrow - balanced
  [' ╭█╮ ', '█▓█▓█', ' ╰▼╯ '],        // Type 4: Heavy - slow tanky
  [' ╭★╮ ', '╭▓▓▓╮', '╰★▼★╯']         // Type 5: Elite - strong
];

// 敌人移动模式
const MovePatterns = {
  // 左右移动
  leftRight: (enemy, dt) => {
    if (enemy.moveTimer % 15 === 0) {
      enemy.x += enemy.moveDir * 2;
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.moveDir = 1;
      } else if (enemy.x >= enemy.maxX) {
        enemy.x = enemy.maxX;
        enemy.moveDir = -1;
      }
    }
  },

  // 斜向移动
  diagonal: (enemy, dt) => {
    if (enemy.moveTimer % 12 === 0) {
      enemy.x += enemy.moveDir * 1;
      enemy.y += enemy.moveDir * 1;
      if (enemy.x <= enemy.minX || enemy.y <= 1) {
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
        enemy.y = Math.max(1, enemy.y);
        enemy.moveDir *= -1;
      } else if (enemy.x >= enemy.maxX || enemy.y >= 20) {
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
        enemy.y = Math.max(1, Math.min(20, enemy.y));
        enemy.moveDir *= -1;
      }
    }
  },

  // 圆形机动
  circular: (enemy, dt) => {
    if (enemy.moveTimer % 8 === 0) {
      const angle = enemy.moveTimer * 0.1;
      const radius = 5;
      enemy.x = enemy.baseX + Math.cos(angle) * radius;
      enemy.y = enemy.baseY + Math.sin(angle) * radius * 0.5;
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
      enemy.y = Math.max(1, Math.min(20, enemy.y));
    }
  }
};

// 敌人子弹类型
const EnemyBulletType = {
  NORMAL: 'NORMAL',      // 普通单发向下
  SPREAD: 'SPREAD',      // 三发散射
  FAST: 'FAST',         // 快速双发
  LASER: 'LASER',       // 追踪激光
  WAVY: 'WAVY',         // 波浪弹
  BURST: 'BURST'        // 爆发弹
};

// 敌人配置数据
const ENEMIES = [
  {
    id: 0,
    name: '战斗机',
    art: ENEMY_ARTS[0],
    hp: 25,
    speed: 1.2,
    score: 80,
    fireRate: 78,
    color: COLORS.brightRed,
    moveType: 'leftRight',
    defense: 0.05,
    collisionDamage: 30,
    bulletType: EnemyBulletType.NORMAL,
    bulletDamage: 10
  },
  {
    id: 1,
    name: '重装型',
    art: ENEMY_ARTS[1],
    hp: 50,
    speed: 0.7,
    score: 200,
    fireRate: 92,
    color: COLORS.brightYellow,
    moveType: 'diagonal',
    defense: 0.15,
    collisionDamage: 30,
    bulletType: EnemyBulletType.SPREAD,
    bulletDamage: 12
  },
  {
    id: 2,
    name: '侦察型',
    art: ENEMY_ARTS[2],
    hp: 35,
    speed: 1.0,
    score: 150,
    fireRate: 86,
    color: COLORS.brightMagenta,
    moveType: 'circular',
    defense: 0.1,
    collisionDamage: 30,
    bulletType: EnemyBulletType.FAST,
    bulletDamage: 8
  },
  {
    id: 3,
    name: '箭头型',
    art: ENEMY_ARTS[3],
    hp: 40,
    speed: 0.9,
    score: 180,
    fireRate: 98,
    color: COLORS.brightGreen,
    moveType: 'leftRight',
    defense: 0.12,
    collisionDamage: 30,
    bulletType: EnemyBulletType.WAVY,
    bulletDamage: 15
  },
  {
    id: 4,
    name: '重型',
    art: ENEMY_ARTS[4],
    hp: 80,
    speed: 0.5,
    score: 350,
    fireRate: 112,
    color: COLORS.brightCyan,
    moveType: 'diagonal',
    defense: 0.25,
    collisionDamage: 30,
    bulletType: EnemyBulletType.BURST,
    bulletDamage: 18
  },
  {
    id: 5,
    name: '精英型',
    art: ENEMY_ARTS[5],
    hp: 120,
    speed: 0.4,
    score: 500,
    fireRate: 128,
    color: COLORS.brightWhite,
    moveType: 'leftRight',
    defense: 0.35,
    collisionDamage: 30,
    bulletType: EnemyBulletType.LASER,
    bulletDamage: 20
  }
];

/**
 * 根据ID获取敌人配置
 */
function getEnemyById(id) {
  return ENEMIES.find(e => e.id === id);
}

/**
 * 根据波次获取可生成的敌人类型索引范围
 * @param {number} wave - 当前波次
 * @returns {number} 最大敌人类型索引
 */
function getMaxEnemyTypeIdx(wave) {
  return Math.min(5, Math.floor(wave / 2) + 2);
}

module.exports = { ENEMIES, ENEMY_ARTS, MovePatterns, getEnemyById, getMaxEnemyTypeIdx };
