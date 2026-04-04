/**
 * BossSystem.js - Boss AI系统
 * 处理Boss的AI、攻击和移动
 */

const { Boss } = require('../entities/Boss');
const { handleBossPhaseEntry } = require('../configs/bosses');
const { GAME_CONSTANTS } = require('../configs/levels');

class BossSystem {
  constructor(eventBus, entities) {
    this.eventBus = eventBus;
    this.entities = entities;

    this.currentBoss = null;
    this.screenWidth = 80;
    this.screenHeight = 32;

    // 回调
    this.onPhaseChange = null;
    this.onBossDefeated = null;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * 生成Boss
   */
  spawnBoss(wave) {
    const boss = Boss.create(wave, this.screenWidth);
    if (boss) {
      this.currentBoss = boss;
      this.entities.create('boss', boss);
    }
    return boss;
  }

  /**
   * 更新Boss
   */
  update(dt, frameCount) {
    const boss = this.entities.getBoss();
    if (!boss) {
      this.currentBoss = null;
      return;
    }

    const player = this.entities.getPlayer();

    // 更新Boss行为
    const result = boss.update(dt, frameCount, player, this.entities);

    // 阶段变化
    if (result === 'phase_change') {
      handleBossPhaseEntry(boss, this.entities);
      if (this.onPhaseChange) {
        this.onPhaseChange(boss);
      }
    }

    // 更新射击
    const bullets = [];
    boss.updateShooting(bullets, player, this.entities);
    for (const bullet of bullets) {
      this.entities.create('bullet', bullet);
    }

    this.currentBoss = boss;
  }

  /**
   * 处理Boss被击中
   */
  bossHit(bullet) {
    const boss = this.entities.getBoss();
    if (!boss) return false;

    // Boss受伤
    const damage = bullet.damage;
    boss.hp -= damage;

    // 发射音效
    this.eventBus.emit('playSound', 'bossHit');

    // 检查是否击败
    if (boss.hp <= 0) {
      boss.active = false;
      this.currentBoss = null;
      if (this.onBossDefeated) {
        this.onBossDefeated(boss);
      }
      return true; // Boss被击败
    }

    return false;
  }

  /**
   * 获取当前Boss
   */
  getBoss() {
    return this.entities.getBoss();
  }

  /**
   * 是否有Boss
   */
  hasBoss() {
    return this.entities.getBoss() !== null;
  }

  /**
   * 重置
   */
  reset() {
    this.currentBoss = null;
  }
}

module.exports = { BossSystem };
