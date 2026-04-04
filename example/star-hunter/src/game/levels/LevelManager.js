/**
 * LevelManager.js - 波次进度管理
 * 管理游戏波次流程、进度和状态
 */

const { GAME_CONSTANTS } = require('../configs/levels');
const { BOSSES } = require('../configs/bosses');

class LevelManager {
  constructor(eventBus) {
    this.eventBus = eventBus;

    this.currentWave = 1;
    this.maxWaves = GAME_CONSTANTS.MAX_WAVES;

    this.state = 'idle'; // idle, playing, boss_fight, wave_complete, victory

    // 回调
    this.onWaveStart = null;
    this.onBossWarning = null;
    this.onWaveComplete = null;
    this.onVictory = null;
  }

  /**
   * 开始游戏
   */
  startGame() {
    this.currentWave = 1;
    this.state = 'playing';
    this._startWave(this.currentWave);
  }

  /**
   * 开始指定波次
   */
  _startWave(wave) {
    this.currentWave = wave;
    this.state = 'playing';

    if (this.onWaveStart) {
      this.onWaveStart(wave);
    }
  }

  /**
   * 波次敌人清理完毕，进入Boss战
   */
  enterBossFight() {
    this.state = 'boss_fight';

    const bossConfig = BOSSES[this.currentWave - 1];
    if (bossConfig && this.onBossWarning) {
      this.onBossWarning(bossConfig);
    }
  }

  /**
   * Boss被击败
   */
  bossDefeated() {
    this.state = 'wave_complete';

    // 检查是否通关
    if (this.currentWave >= this.maxWaves) {
      this.state = 'victory';
      if (this.onVictory) {
        this.onVictory();
      }
      return;
    }

    // 进入下一波
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWave);
    }

    // 延迟开始下一波
    setTimeout(() => {
      this.currentWave++;
      this._startWave(this.currentWave);
    }, 2000);
  }

  /**
   * 获取当前波次
   */
  getWave() {
    return this.currentWave;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.state;
  }

  /**
   * 是否在Boss战
   */
  isBossFight() {
    return this.state === 'boss_fight';
  }

  /**
   * 是否胜利
   */
  isVictory() {
    return this.state === 'victory';
  }

  /**
   * 重置
   */
  reset() {
    this.currentWave = 1;
    this.state = 'idle';
  }
}

module.exports = { LevelManager };
