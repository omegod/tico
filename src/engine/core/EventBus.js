/**
 * EventBus - 事件总线（发布/订阅）
 * 用于解耦游戏系统之间的通信
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅的函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this.listeners.clear();
  }
}

// 游戏常用事件
const GameEvents = {
  // 子弹事件
  BULLET_HIT_ENEMY: 'bulletHitEnemy',
  BULLET_HIT_BOSS: 'bulletHitBoss',
  BULLET_HIT_PLAYER: 'bulletHitPlayer',

  // 实体事件
  ENEMY_DESTROYED: 'enemyDestroyed',
  BOSS_DESTROYED: 'bossDestroyed',
  PLAYER_DAMAGED: 'playerDamaged',
  PLAYER_DESTROYED: 'playerDestroyed',

  // 碰撞事件
  PLAYER_COLLISION_ENEMY: 'playerCollisionEnemy',
  PLAYER_COLLISION_BOSS: 'playerCollisionBoss',

  // 道具事件
  POWERUP_COLLECTED: 'powerupCollected',

  // 波次事件
  WAVE_START: 'waveStart',
  WAVE_CLEAR: 'waveClear',
  BOSS_SPAWN: 'bossSpawn',

  // 游戏状态事件
  GAME_START: 'gameStart',
  GAME_PAUSE: 'gamePause',
  GAME_RESUME: 'gameResume',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory',

  // 粒子事件
  EXPLOSION: 'explosion',

  // 音效事件
  PLAY_SOUND: 'playSound'
};

module.exports = { EventBus, GameEvents };
