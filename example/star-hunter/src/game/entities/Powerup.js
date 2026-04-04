/**
 * Powerup.js - 道具类
 * 可收集道具的实现
 */

const { Entity } = require('./Entity');
const { PowerupType, getPowerupAppearance, POWERUP_SPEED } = require('../configs/powerups');

class Powerup extends Entity {
  constructor(data) {
    super('powerup', data);

    // 道具类型
    this.type = data.type || PowerupType.HEAL;
    this.char = data.char || '♥';
    this.color = data.color || '#ffffff';
    this.name = data.name || 'Unknown';
    this.art = Array.isArray(data.art) ? data.art : null;

    if (this.art && this.art.length > 0) {
      this.width = data.width || Math.max(...this.art.map(line => line.length));
      this.height = data.height || this.art.length;
    } else {
      this.width = data.width || 1;
      this.height = data.height || 1;
    }

    // 移动速度
    this.speed = data.speed || POWERUP_SPEED;

    // 活跃状态
    this.active = true;
  }

  /**
   * 更新道具
   */
  update(dt, frameCount) {
    // 缓慢下落
    this.y += this.speed;

    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }
  }

  /**
   * 是否超出屏幕
   */
  isOffScreen(screenHeight, margin = 2) {
    return this.y > screenHeight + margin;
  }

  /**
   * 创建随机道具工厂方法
   */
  static createRandom(x, y) {
    const types = Object.keys(PowerupType);
    const type = types[Math.floor(Math.random() * types.length)];
    const appearance = getPowerupAppearance(type);
    const fallback = appearance || {};

    return new Powerup({
      x: x,
      y: y,
      type: type,
      char: fallback.char,
      color: fallback.color,
      art: fallback.art,
      name: fallback.name || type
    });
  }

  /**
   * 创建指定类型道具
   */
  static create(type, x, y) {
    const appearance = getPowerupAppearance(type);
    const fallback = appearance || {};
    return new Powerup({
      x: x,
      y: y,
      type: type,
      char: fallback.char,
      color: fallback.color,
      art: fallback.art,
      name: fallback.name || type
    });
  }
}

module.exports = { Powerup };
