/**
 * powerups.js - 5种道具配置
 * 定义所有可收集道具的类型和效果
 */

const { COLORS } = require('../../../../../src/engine/rendering/Renderer');
const { GAME_CONSTANTS } = require('./levels');

// 道具类型枚举
const PowerupType = {
  POWER: 'POWER',
  SHIELD: 'SHIELD',
  INVINCIBLE: 'INVINCIBLE',
  MISSILE: 'MISSILE',
  HEAL: 'HEAL'
};

// 道具配置
const POWERUP_CONFIGS = {
  [PowerupType.POWER]: {
    char: '★',
    color: COLORS.yellow,
    name: '导弹',
    description: '获得一个导弹(最多10个)',
    effect: (gameState) => {
      gameState.powerCount = Math.min(gameState.powerCount + 1, GAME_CONSTANTS.MAX_MISSILES);
    }
  },
  [PowerupType.SHIELD]: {
    char: '⊙',
    color: COLORS.blue,
    name: '护盾',
    description: '恢复10点护盾值(上限30)',
    effect: (gameState) => {
      if (gameState.player) {
        gameState.player.shield = Math.min(gameState.player.shield + 10, 30);
      }
    }
  },
  [PowerupType.INVINCIBLE]: {
    char: '✦',
    color: COLORS.white,
    name: '无敌',
    description: '9秒无敌时间(闪烁)',
    effect: (gameState) => {
      gameState.invincibleTimer = 180; // 9秒 = 180帧 (20 FPS)
    }
  },
  [PowerupType.MISSILE]: {
    char: '»',
    color: COLORS.red,
    name: '追踪导弹',
    description: '发射3枚追踪导弹',
    art: [
      '╭═╮',
      '╰►╯'
    ],
    effect: (gameState, createBullet) => {
      if (gameState.player) {
        for (let j = 0; j < 3; j++) {
          setTimeout(() => {
            if (gameState.player) {
              createBullet(gameState.player.x + gameState.player.width / 2, gameState.player.y - 1, false, 'MISSILE');
            }
          }, j * 200);
        }
      }
    }
  },
  [PowerupType.HEAL]: {
    char: '♥',
    color: COLORS.green,
    name: '生命',
    description: '恢复30点生命',
    effect: (gameState) => {
      if (gameState.player) {
        gameState.player.hp = Math.min(gameState.player.hp + 30, gameState.player.maxHp);
      }
    }
  }
};

// 道具移动速度常量
const POWERUP_SPEED = 0.2;

// 道具闪烁频率
const POWERUP_BLINK_INTERVAL = 300;

/**
 * 获取随机道具类型
 */
function getRandomPowerupType() {
  const types = Object.keys(PowerupType);
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * 获取道具配置
 */
function getPowerupConfig(type) {
  return POWERUP_CONFIGS[type] || null;
}

/**
 * 获取道具图标和颜色
 */
function getPowerupAppearance(type) {
  const config = POWERUP_CONFIGS[type];
  if (!config) return null;
  return { char: config.char, color: config.color, art: config.art, name: config.name };
}

module.exports = {
  PowerupType,
  POWERUP_CONFIGS,
  POWERUP_SPEED,
  POWERUP_BLINK_INTERVAL,
  getRandomPowerupType,
  getPowerupConfig,
  getPowerupAppearance
};
