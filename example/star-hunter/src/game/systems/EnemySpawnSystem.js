/**
 * EnemySpawnSystem.js - 波次生成系统
 * 处理敌人生成和波次管理
 */

const { Enemy } = require('../entities/Enemy');
const { getEnemyById, getMaxEnemyTypeIdx } = require('../configs/enemies');
const { GAME_CONSTANTS } = require('../configs/levels');

class EnemySpawnSystem {
  constructor(eventBus, entities) {
    this.eventBus = eventBus;
    this.entities = entities;

    this.wave = 1;
    this.waveEnemiesKilled = 0;
    this.waveTotalEnemies = 12;
    this.bossSpawned = false;
    this.isBossDefeated = false;

    this.lastEnemySpawn = 0;
    this.screenWidth = 80;
    this.screenHeight = 32;

    // 波次开始时的回调
    this.onWaveStart = null;
    // Boss生成时的回调
    this.onBossSpawn = null;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * 开始新波次
   */
  startWave(waveNum) {
    this.wave = waveNum;
    this.waveEnemiesKilled = 0;
    this.waveTotalEnemies = GAME_CONSTANTS.getWaveTotalEnemies(waveNum);
    this.bossSpawned = false;
    this.isBossDefeated = false;
    this.lastEnemySpawn = 0;

    if (this.onWaveStart) {
      this.onWaveStart(waveNum);
    }
  }

  /**
   * 重置系统
   */
  reset() {
    this.wave = 1;
    this.waveEnemiesKilled = 0;
    this.waveTotalEnemies = GAME_CONSTANTS.getWaveTotalEnemies(1);
    this.bossSpawned = false;
    this.isBossDefeated = false;
    this.lastEnemySpawn = 0;
  }

  /**
   * 更新敌人生成
   */
  update(dt, frameCount) {
    const now = Date.now();

    // 如果Boss已生成，不生成敌人
    if (this.bossSpawned) return;

    // 生成敌人（Boss生成由外部控制）
    const spawnInterval = GAME_CONSTANTS.getEnemySpawnInterval(this.wave);
    if (now - this.lastEnemySpawn > spawnInterval) {
      if (this.entities.getEnemies().length < 5 && this.waveEnemiesKilled < this.waveTotalEnemies) {
        this._spawnEnemy();
        this.lastEnemySpawn = now;
      }
    }
  }

  /**
   * 生成敌人
   */
  _spawnEnemy() {
    // 根据波次确定敌人类型范围
    const maxTypeIdx = getMaxEnemyTypeIdx(this.wave);
    const typeIdx = Math.floor(Math.random() * (maxTypeIdx + 1));
    const entryDir = Math.floor(Math.random() * 3);

    const enemy = Enemy.create(typeIdx, 0, 0, entryDir, this.screenWidth);
    if (enemy) {
      this.entities.create('enemy', enemy);
    }
  }

  /**
   * 生成Boss
   */
  _spawnBoss() {
    this.bossSpawned = true;
    const boss = this.entities.create('boss', { wave: this.wave });
    if (this.onBossSpawn) {
      this.onBossSpawn(boss);
    }
  }

  /**
   * 记录敌人被击杀
   */
  enemyKilled() {
    this.waveEnemiesKilled++;
  }

  /**
   * Boss被击败
   */
  bossDefeated() {
    this.isBossDefeated = true;
  }

  /**
   * 检查是否应该进入下一波
   */
  shouldProgressWave() {
    return this.isBossDefeated;
  }

  /**
   * 获取波次信息
   */
  getWaveInfo() {
    return {
      wave: this.wave,
      enemiesKilled: this.waveEnemiesKilled,
      totalEnemies: this.waveTotalEnemies,
      bossSpawned: this.bossSpawned,
      bossDefeated: this.isBossDefeated
    };
  }

  /**
   * 是否还有敌人或Boss
   */
  hasActiveEnemies() {
    return this.entities.getEnemies().length > 0 || this.entities.getBoss() !== null;
  }
}

module.exports = { EnemySpawnSystem };
