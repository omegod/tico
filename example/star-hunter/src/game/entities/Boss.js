/**
 * Boss.js - Boss实体
 * 包含6种攻击模式和AI逻辑
 */

const { Entity } = require('./Entity');
const { BOSSES, getAttackPattern, getMovementPattern } = require('../configs/bosses');
const { GAME_CONSTANTS } = require('../configs/levels');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class Boss extends Entity {
  constructor(data) {
    super('boss', data);

    // 引用原始配置
    const config = BOSSES[data.wave - 1] || BOSSES[0];
    this.config = config;

    this.wave = data.wave || 1;
    this.name = config.name;
    this.subtitle = config.subtitle || '';
    this.art = config.art;
    this.width = config.width || (config.art[0] ? config.art[0].length : 20);
    this.height = config.height || config.art.length;
    this.defense = config.defense;
    this.fireRateBase = config.fireRate || GAME_CONSTANTS.getBossFireRate(this.wave);
    this.attackPatternsByPhase = config.attackPatternsByPhase || [config.attackPatterns || [0]];
    this.movementPatternByPhase = config.movementPatternByPhase || [config.movementPattern || 'patrol'];
    this.phaseThresholds = config.phaseThresholds || [0.5];
    this.fireRateMultipliersByPhase = config.fireRateMultipliersByPhase || null;
    this.movementRange = config.movementRange || 12;
    this.movementSpeed = config.movementSpeed || 0.06;
    this.maxMoveStepX = config.maxMoveStepX || 2.6;
    this.maxMoveStepY = config.maxMoveStepY || 1.4;

    // HP设置
    this.hp = config.hp;
    this.maxHp = config.hp;

    // 位置
    this.targetY = data.targetY || 2;
    this.screenWidth = data.screenWidth || 80;
    this.screenHeight = data.screenHeight || 32;
    this.baseX = typeof data.x === 'number' ? data.x : Math.floor(this.screenWidth / 2) - Math.floor(this.width / 2);
    this.centerX = this.baseX;

    // 阶段（0=正常，1=狂暴）
    this.phase = 0;
    this.aiTimer = 0;

    // 计时器
    this.fireTimer = 0;
    this.moveTimer = 0;
    this.moveDir = 1;
    this.patternCursor = 0;
    this.warpIndex = 0;
    this.behaviorState = {};
    this.isDiving = false;
    this.homeX = undefined;
    this.homeY = undefined;

    // 入场状态
    this.entered = false;

    // 活跃状态
    this.active = true;
    this.invincibleTimer = 0;
  }

  /**
   * 获取射击间隔
   */
  getFireRate() {
    const phaseMultipliers = this.fireRateMultipliersByPhase || [1, 0.9, 0.8];
    const phaseMultiplier = phaseMultipliers[Math.min(this.phase, phaseMultipliers.length - 1)] || 1;
    return Math.max(16, Math.floor(this.fireRateBase * phaseMultiplier));
  }

  /**
   * 获取当前阶段的攻击模式
   */
  getActiveAttackPatterns() {
    const patterns = this.attackPatternsByPhase[Math.min(this.phase, this.attackPatternsByPhase.length - 1)];
    return Array.isArray(patterns) && patterns.length > 0 ? patterns : [0];
  }

  /**
   * 获取当前阶段的移动模式
   */
  getActiveMovementPattern() {
    return this.movementPatternByPhase[Math.min(this.phase, this.movementPatternByPhase.length - 1)] || 'patrol';
  }

  /**
   * 更新Boss
   */
  update(dt, frameCount, player, entities) {
    // 入场移动
    if (!this.entered) {
      if (this.y < this.targetY) {
        this.y += 0.5;
        if (this.y >= this.targetY) {
          this.y = this.targetY;
          this.entered = true;
        }
      }
    } else {
      // 阶段性移动
      this.aiTimer++;
      this.moveTimer++;
      const previousX = this.x;
      const previousY = this.y;
      if (this.homeX === undefined) this.homeX = this.x;
      if (this.homeY === undefined) this.homeY = this.y;
      const movementName = this.getActiveMovementPattern();
      const movementFn = getMovementPattern(movementName);
      if (movementFn) {
        movementFn(this, player, this.screenWidth, this.screenHeight, entities);
      } else {
        this.x += this.moveDir * 1.5;
        if (this.x <= 1 || this.x >= this.screenWidth - this.width - 1) {
          this.moveDir *= -1;
        }
      }

      const desiredX = this.x;
      const desiredY = this.y;
      this.x = previousX + clamp(desiredX - previousX, -this.maxMoveStepX, this.maxMoveStepX);
      this.y = previousY + clamp(desiredY - previousY, -this.maxMoveStepY, this.maxMoveStepY);
    }

    this.x = clamp(this.x, 1, this.screenWidth - this.width - 1);
    this.y = clamp(this.y, 1, this.screenHeight - this.height - 1);

    // 更新无敌计时器
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    // 阶段转换
    if (this.phase < this.phaseThresholds.length && this.hp < this.maxHp * this.phaseThresholds[this.phase]) {
      this.phase++;
      this.moveTimer = 0;
      this.aiTimer = 0;
      this.patternCursor = 0;
      this.behaviorState = {};
      this.isDiving = false;
      return 'phase_change';
    }

    return null;
  }

  /**
   * 更新射击
   */
  updateShooting(bullets, player, entities) {
    if (!this.entered) return;
    if (this.isDiving) {
      this.fireTimer = 0;
      return;
    }

    this.fireTimer++;
    const fireRate = this.getFireRate();

    if (this.fireTimer >= fireRate) {
      this.fireTimer = 0;

      // 选择攻击模式
      const patterns = this.getActiveAttackPatterns();
      const pattern = patterns[this.patternCursor % patterns.length];
      this.patternCursor++;

      // 执行攻击
      const attackFn = getAttackPattern(pattern);
      if (attackFn) {
        attackFn(this, null, bullets, player, entities);
      }
    }
  }

  /**
   * 创建Boss工厂方法
   */
  static create(wave, gameWidth) {
    const config = BOSSES[wave - 1];
    if (!config) return null;

    return new Boss({
      wave,
      x: Math.floor(gameWidth / 2) - Math.floor(config.width / 2),
      y: -config.art.length,
      targetY: 2,
      screenWidth: gameWidth
    });
  }
}

module.exports = { Boss };
