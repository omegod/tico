/**
 * Player.js - 玩家实体
 * 包含护盾逻辑、无敌状态和射手行为
 */

const { Entity } = require('./Entity');
const { SHIPS } = require('../configs/ships');
const { GAME_CONSTANTS } = require('../configs/levels');

class Player extends Entity {
  constructor(data) {
    super('player', data);

    // 战机配置
    const config = SHIPS[data.shipIndex] || SHIPS[0];

    this.shipIndex = data.shipIndex || 0;
    this.name = config.name;
    this.nameEn = config.nameEn;
    this.art = config.art;
    this.bulletType = config.bulletType;
    this.missilePattern = config.missilePattern || 'STANDARD';
    this.missileCapacity = config.missileCapacity || GAME_CONSTANTS.MAX_MISSILES;
    this.missileReloadFrames = config.missileReloadFrames || null;
    this.shieldRegen = config.shieldRegen || null;

    // 尺寸
    this.width = Math.max(...config.art.map(r => r.length));
    this.height = config.art.length;

    // 玩家属性
    this.speed = config.speed;
    this.fireRate = config.fireRate;
    this.attack = config.attack;
    this.defense = config.defense || 0;

    // HP设置
    this.hp = config.hp;
    this.maxHp = config.hp;

    // 位置
    this.x = data.x || 40 - Math.floor(this.width / 2);
    this.y = data.y || 24;

    // 护盾
    this.shield = config.shield || 0;
    this.maxShield = config.shield || 0;
    this.shieldActive = false;
    this.shieldTimer = undefined;

    // 无敌
    this.invincibleTimer = 0;

    // 射击冷却
    this.lastShot = 0;

    // 活跃状态
    this.active = true;
  }

  /**
   * 更新玩家
   */
  update(dt, frameCount) {
    // 更新无敌计时器
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    // 护盾回复（防御型战机）
    if (this.shieldRegen && this.shield < this.maxShield) {
      if (this.shieldTimer === undefined) {
        this.shieldTimer = this.shieldRegen;
      }
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shield++;
        this.shieldTimer = this.shieldRegen;
      }
    }

    // 护盾耗尽自动关闭
    if (this.shield <= 0 && this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = undefined;
    }
  }

  /**
   * 是否可以射击
   */
  canShoot() {
    const now = Date.now();
    return now - this.lastShot >= 1000 / this.fireRate;
  }

  /**
   * 射击冷却重置
   */
  resetShotCooldown() {
    this.lastShot = Date.now();
  }

  /**
   * 开关护盾
   */
  toggleShield() {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = undefined;
    } else if (this.shield > 0) {
      this.shieldActive = true;
    }
  }

  /**
   * 激活护盾
   */
  activateShield() {
    if (this.shield > 0) {
      this.shieldActive = true;
    }
  }

  /**
   * 关闭护盾
   */
  deactivateShield() {
    this.shieldActive = false;
    this.shieldTimer = undefined;
  }

  /**
   * 设置无敌时间
   */
  setInvincible(frames = GAME_CONSTANTS.INVINCIBLE_TIMER) {
    this.invincibleTimer = frames;
  }

  /**
   * 受到伤害（考虑护盾和防御力）
   * @returns {Object} 伤害结果 { actualDamage, shieldDamage, blocked }
   */
  takeDamage(damage) {
    // 无敌状态不受伤
    if (this.invincibleTimer > 0) {
      return { actualDamage: 0, shieldDamage: 0, blocked: true };
    }

    let result = {
      actualDamage: 0,
      shieldDamage: 0,
      blocked: false
    };

    // 计算实际伤害（防御力减免）
    const baseDamage = Math.floor(damage * (1 - this.defense));

    // 护盾吸收50%伤害
    if (this.shieldActive && this.shield > 0) {
      const shieldDamage = Math.ceil(baseDamage / 2);
      const actualDamage = Math.floor(baseDamage / 2);

      this.shield -= shieldDamage;
      this.hp -= actualDamage;

      result.shieldDamage = shieldDamage;
      result.actualDamage = actualDamage;

      if (this.shield <= 0) {
        this.shield = 0;
        this.shieldActive = false;
        this.shieldTimer = undefined;
      }
    } else {
      this.hp -= baseDamage;
      result.actualDamage = baseDamage;
    }

    // HP <= 0 时销毁
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
    }

    return result;
  }

  /**
   * 移动玩家
   */
  move(dx, dy, screenWidth, screenHeight) {
    this.x = Math.max(1, Math.min(screenWidth - this.width - 1, this.x + dx * this.speed));
    this.y = Math.max(0, Math.min(screenHeight - this.height, this.y + dy * this.speed));
  }

  /**
   * 创建玩家工厂方法
   */
  static create(shipIndex, gameWidth, gameHeight) {
    const config = SHIPS[shipIndex] || SHIPS[0];
    const width = Math.max(...config.art.map(r => r.length));

    return new Player({
      shipIndex,
      x: Math.floor(gameWidth / 2) - Math.floor(width / 2),
      y: gameHeight - 8
    });
  }
}

module.exports = { Player };
