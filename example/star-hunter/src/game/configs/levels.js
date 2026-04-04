/**
 * levels.js - 波次/关卡配置
 * 定义游戏波次结构、敌人数量和生成间隔
 */

// 游戏常量 - 这些是关键时间常数，必须保持与原版一致
const GAME_CONSTANTS = {
  // 帧率：20 FPS (50ms)
  FRAME_RATE: 50,

  // 导弹最大持有数
  MAX_MISSILES: 10,

  // 无敌时间：120帧 (6秒 at 20fps)
  INVINCIBLE_TIMER: 120,

  // 护盾回复：180帧/点 (9秒 at 20fps)
  SHIELD_REGEN_TIMER: 180,

  // Boss射速：max(30, 60 - wave*5)
  getBossFireRate: (wave) => Math.max(30, 60 - wave * 5),

  // 敌人生成间隔：max(2000-wave*200, 500)ms
  getEnemySpawnInterval: (wave) => Math.max(2000 - wave * 200, 500),

  // 道具下落速度：0.2/帧
  POWERUP_SPEED: 0.2,

  // 最大波次
  MAX_WAVES: 7,

  // 每波敌人数量：10 + wave * 2
  getWaveTotalEnemies: (wave) => 10 + wave * 2
};

// 波次剧情/警告信息
const WAVE_STORIES = {
  1: {
    banner: '【 裂隙哨站 】',
    lines: ['虫群从边境裂隙涌出', '守住第一道防线']
  },
  2: {
    banner: '【 遗迹回声 】',
    lines: ['追踪能量脉冲', '找到失落遗迹的入口']
  },
  3: {
    banner: '⚠ BOSS WARNING ⚠',
    lines: ['虚空虫后苏醒', '摧毁神经中枢！']
  },
  4: {
    banner: '【 古舰守门者 】',
    lines: ['古代战舰重启', '不要让它守住秘密']
  },
  5: {
    banner: '⚠ BOSS WARNING ⚠',
    lines: ['蜂巢主核开始扩张', '阻止它继续复制']
  },
  6: {
    banner: '【 终极毁灭者 】',
    lines: ['远古兵器全面启动', '瞄准反应炉！']
  },
  7: {
    banner: '⚠ FINAL BOSS ⚠',
    lines: ['最后的战斗已经结束', '新的黎明即将到来']
  }
};

// 关卡配置
const LEVELS = [
  {
    wave: 1,
    totalEnemies: 12,
    enemyTypes: [0, 1, 2],  // 战斗机、重装型、侦察型
    bossId: 1
  },
  {
    wave: 2,
    totalEnemies: 14,
    enemyTypes: [0, 1, 2],  // 战斗机、重装型、侦察型
    bossId: 2
  },
  {
    wave: 3,
    totalEnemies: 16,
    enemyTypes: [1, 2, 3],  // 重装型、侦察型、箭头型
    bossId: 3
  },
  {
    wave: 4,
    totalEnemies: 18,
    enemyTypes: [2, 3, 4],  // 侦察型、箭头型、重型
    bossId: 4
  },
  {
    wave: 5,
    totalEnemies: 20,
    enemyTypes: [3, 4, 5],  // 箭头型、重型、精英型
    bossId: 5
  },
  {
    wave: 6,
    totalEnemies: 22,
    enemyTypes: [3, 4, 5],  // 箭头型、重型、精英型
    bossId: 6
  },
  {
    wave: 7,
    totalEnemies: 25,
    enemyTypes: [4, 5, 5],  // 重型、精英型（最终波）
    bossId: 6
  }
];

/**
 * 获取波次信息
 */
function getLevel(wave) {
  if (wave >= 1 && wave <= LEVELS.length) {
    return LEVELS[wave - 1];
  }
  return null;
}

/**
 * 获取波次剧情
 */
function getWaveStory(wave) {
  return WAVE_STORIES[wave] || null;
}

/**
 * 获取游戏常量
 */
function getConstants() {
  return GAME_CONSTANTS;
}

module.exports = {
  GAME_CONSTANTS,
  WAVE_STORIES,
  LEVELS,
  getLevel,
  getWaveStory,
  getConstants
};
