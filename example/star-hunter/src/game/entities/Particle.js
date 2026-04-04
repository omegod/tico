/**
 * Particle.js - 粒子效果
 * 爆炸和其他视觉粒子效果
 */

const { Entity } = require('./Entity');

const { COLORS } = require('../../../../../src/engine/rendering/Renderer');

// 粒子字符
const PARTICLE_CHARS = ['◉', '●', '○', '·', '∗', '✦'];

/**
 * 创建爆炸粒子
 */
function createExplosion(x, y, size = 'normal', color = null, lifeOverride = null) {
  const chars = color ? [color] : [COLORS.orange, COLORS.yellow, COLORS.red];
  const count = size === 'large' ? 12 : size === 'small' ? 4 : 6;
  const speed = size === 'large' ? 3 : size === 'small' ? 1 : 2;
  const life = lifeOverride ?? (size === 'large' ? 30 : size === 'small' ? 10 : 20);

  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const actualSpeed = Math.random() * speed + speed / 2;
    particles.push(new Particle({
      x: x,
      y: y,
      vx: Math.cos(angle) * actualSpeed,
      vy: Math.sin(angle) * actualSpeed,
      char: PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)],
      color: chars[Math.floor(Math.random() * chars.length)],
      life: life,
      maxLife: life
    }));
  }
  return particles;
}

/**
 * 创建火花粒子
 */
function createSparks(x, y, count = 3, color = null) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    particles.push(new Particle({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      char: '·',
      color: color || COLORS.yellow,
      life: 10,
      maxLife: 10
    }));
  }
  return particles;
}

class Particle extends Entity {
  constructor(data) {
    super('particle', data);

    // 粒子属性
    this.vx = data.vx || 0;
    this.vy = data.vy || 0;
    this.char = data.char || '∗';
    this.color = data.color || COLORS.white;

    // 生命周期
    this.life = data.life || 20;
    this.maxLife = data.maxLife || this.life;

    // 活跃状态
    this.active = true;
  }

  /**
   * 更新粒子
   */
  update(dt, frameCount) {
    // 移动
    this.x += this.vx;
    this.y += this.vy;

    // 逐渐减速
    this.vx *= 0.95;
    this.vy *= 0.95;

    // 生命周期减少
    this.life--;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  /**
   * 获取基于生命的颜色
   */
  getLifeColor() {
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio > 0.5) return COLORS.yellow;
    if (lifeRatio > 0.25) return COLORS.red;
    return COLORS.dim;
  }
}

module.exports = { Particle, createExplosion, createSparks };
