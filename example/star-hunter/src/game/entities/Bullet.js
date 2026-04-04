/**
 * Bullet.js - 子弹类
 * 玩家子弹和敌人子弹的实现
 */

const { Entity } = require('./Entity');

// 子弹类型
const BulletType = {
  NORMAL: 'NORMAL',
  DOUBLE: 'DOUBLE',
  TRIPLE: 'TRIPLE',
  PIERCE: 'PIERCE',
  MISSILE: 'MISSILE'
};

const MissileBehavior = {
  SEEKER: 'SEEKER',
  GYRO_CORE: 'GYRO_CORE',
  ORBITAL: 'ORBITAL',
  RAIL: 'RAIL',
  BARRIER_NODE: 'BARRIER_NODE',
  SWEEPER: 'SWEEPER',
  RICOCHET: 'RICOCHET'
};

// 敌方子弹类型
const EnemyBulletType = {
  NORMAL: 'NORMAL',      // 普通单发向下
  SPREAD: 'SPREAD',      // 三发散射
  FAST: 'FAST',          // 快速双发
  LASER: 'LASER',        // 追踪激光
  WAVY: 'WAVY',          // 波浪弹
  BURST: 'BURST'         // 爆发弹
};

const ENEMY_BULLET_SPEED_SCALE = 0.7;

class Bullet extends Entity {
  constructor(data) {
    super('bullet', data);

    // 子弹属性
    this.char = data.char || '◉';
    this.color = data.color || null;
    this.damage = data.damage || 10;
    this.speed = data.speed || 2;
    this.isEnemy = data.isEnemy || false;

    // 穿透能力
    this.pierce = data.pierce || false;

    // 追踪能力
    this.homing = data.homing || false;
    this.vx = data.vx || 0;
    this.vy = data.vy || (this.isEnemy ? this.speed : -this.speed);

    // 原始速度（用于追踪弹）
    this.baseSpeed = data.baseSpeed || this.speed;
    this.behavior = data.behavior || null;
    this.turnRate = data.turnRate || 1;
    this.framesAlive = data.framesAlive || 0;
    this.hitCooldown = data.hitCooldown || 0;
    this.hitTracker = new Map();
    this.targetX = typeof data.targetX === 'number' ? data.targetX : null;
    this.targetY = typeof data.targetY === 'number' ? data.targetY : null;
    this.phase = data.phase || 'deploy';
    this.delayFrames = data.delayFrames || 0;
    this.deployFrames = data.deployFrames || 0;
    this.anchorX = typeof data.anchorX === 'number' ? data.anchorX : this.x;
    this.anchorY = typeof data.anchorY === 'number' ? data.anchorY : this.y;
    this.orbitCenter = data.orbitCenter || null;
    this.orbitRadius = data.orbitRadius || 0;
    this.orbitAngle = data.orbitAngle || 0;
    this.orbitSpeed = data.orbitSpeed || 0;
    this.orbitVerticalScale = data.orbitVerticalScale || 0.7;
    this.waveAmplitude = data.waveAmplitude || 0;
    this.waveSpeed = data.waveSpeed || 0;
    this.drift = data.drift || 0;
    this.phaseOffset = data.phaseOffset || 0;
    this.baseX = typeof data.baseX === 'number' ? data.baseX : this.x;
    this.baseY = typeof data.baseY === 'number' ? data.baseY : this.y;
    this.charFrames = data.charFrames || null;
    this.packedChar = data.packedChar || '·';
    this.releaseOnAnchor = data.releaseOnAnchor || false;
    this.acceleration = data.acceleration || 0;
    this.maxSpeed = data.maxSpeed || null;
    this.integrity = data.integrity || 0;
    this.damageDecay = data.damageDecay || 0;
    this.minDamage = data.minDamage || 0;
    this.bouncePadding = data.bouncePadding || 1;
    this.colorFrames = data.colorFrames || null;
  }

  /**
   * 更新子弹位置
   */
  update(dt, frameCount) {
    this.framesAlive++;

    if (this.delayFrames > 0 && this.framesAlive <= this.delayFrames) {
      if (this.charFrames && this.charFrames.length > 0) {
        this.char = this.charFrames[this.framesAlive % this.charFrames.length];
      }
      this._tickLifecycle();
      return;
    }

    if (this.behavior === MissileBehavior.GYRO_CORE) {
      this._updateGyroCore();
    } else if (this.behavior === MissileBehavior.ORBITAL) {
      this._updateOrbital();
    } else if (this.behavior === MissileBehavior.BARRIER_NODE) {
      this._updateBarrierNode();
    } else if (this.behavior === MissileBehavior.SWEEPER) {
      this._updateSweeper();
    } else if (this.behavior === MissileBehavior.RICOCHET) {
      this._updateRicochet();
    } else {
      if (this.homing && this.target && this.target.active !== false) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const desiredVx = (dx / dist) * this.baseSpeed;
        const desiredVy = (dy / dist) * this.baseSpeed;
        this.vx += (desiredVx - this.vx) * this.turnRate;
        this.vy += (desiredVy - this.vy) * this.turnRate;
      }

      this._applyAcceleration();

      this.x += this.vx;
      this.y += this.vy;
    }

    const isPackedOrbital = this.behavior === MissileBehavior.ORBITAL &&
      this.releaseOnAnchor &&
      this.orbitCenter &&
      this.orbitCenter.phase !== 'anchor';

    if (!isPackedOrbital && this.charFrames && this.charFrames.length > 0) {
      this.char = this.charFrames[this.framesAlive % this.charFrames.length];
    }

    if (this.colorFrames && this.colorFrames.length > 0) {
      this.color = this.colorFrames[this.framesAlive % this.colorFrames.length];
    }

    this._tickLifecycle();
  }

  _updateGyroCore() {
    if (this.phase !== 'anchor' && this.deployFrames > 0 && this.framesAlive <= this.deployFrames) {
      this.x += this.vx;
      this.y += this.vy;
      return;
    }

    if (this.phase !== 'anchor' && this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= Math.max(this.baseSpeed, 1)) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.vx = 0;
        this.vy = 0;
        this.phase = 'anchor';
      } else {
        this.vx = (dx / dist) * this.baseSpeed;
        this.vy = (dy / dist) * this.baseSpeed;
        this.x += this.vx;
        this.y += this.vy;
      }
      return;
    }

    if (this.phase !== 'anchor') {
      this.anchorX = this.x;
      this.anchorY = this.y;
      this.phase = 'anchor';
      this.vx = 0;
      this.vy = 0;
    }

    this.x = this.anchorX;
    this.y = this.anchorY;
  }

  _updateOrbital() {
    if (!this.orbitCenter || this.orbitCenter.active === false) {
      this.active = false;
      return;
    }

    if (this.releaseOnAnchor && this.orbitCenter.phase !== 'anchor') {
      this.x = this.orbitCenter.x;
      this.y = this.orbitCenter.y;
      this.char = this.packedChar;
      return;
    }

    this.orbitAngle += this.orbitSpeed;
    this.x = this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = this.orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius * this.orbitVerticalScale;
  }

  _updateBarrierNode() {
    if (this.phase !== 'guard' && this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= Math.max(this.baseSpeed, 1)) {
        this.phase = 'guard';
        this.anchorX = this.targetX;
        this.anchorY = this.targetY;
      } else {
        this.vx = (dx / dist) * this.baseSpeed;
        this.vy = (dy / dist) * this.baseSpeed;
        this.x += this.vx;
        this.y += this.vy;
        return;
      }
    }

    const wobble = this.framesAlive * this.waveSpeed + this.phaseOffset;
    this.x = this.anchorX + Math.sin(wobble) * this.waveAmplitude;
    this.y = this.anchorY + Math.cos(wobble * 1.4) * 0.8;
  }

  _updateSweeper() {
    this.y += this.vy;
    this.x = this.baseX +
      this.drift * this.framesAlive +
      Math.sin(this.framesAlive * this.waveSpeed + this.phaseOffset) * this.waveAmplitude;
  }

  _updateRicochet() {
    this.x += this.vx;
    this.y += this.vy;

    const minX = this.bouncePadding;
    const minY = this.bouncePadding;
    const maxX = Math.max(minX, (this.screenWidth || 80) - this.bouncePadding - 1);
    const maxY = Math.max(minY, (this.screenHeight || 32) - this.bouncePadding - 1);

    if (this.x <= minX || this.x >= maxX) {
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.vx *= -1;
    }

    if (this.y <= minY || this.y >= maxY) {
      this.y = Math.max(minY, Math.min(maxY, this.y));
      this.vy *= -1;
    }
  }

  _applyAcceleration() {
    if (!this.acceleration) return;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed <= 0) return;

    const nextSpeed = this.maxSpeed ? Math.min(speed + this.acceleration, this.maxSpeed) : speed + this.acceleration;
    const scale = nextSpeed / speed;
    this.vx *= scale;
    this.vy *= scale;
  }

  _tickLifecycle() {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    if (this.life !== Infinity) {
      this.life--;
      if (this.life <= 0) {
        this.active = false;
      }
    }
  }

  /**
   * 设置追踪目标
   */
  setTarget(target) {
    this.target = target;
  }

  /**
   * 是否超出屏幕
   */
  isOffScreen(screenWidth, screenHeight, margin = 5) {
    return (
      this.y < -margin ||
      this.y > screenHeight + margin ||
      this.x < -margin ||
      this.x > screenWidth + margin
    );
  }

  /**
   * 创建玩家子弹工厂方法
   */
  static createPlayerBullet(x, y, bulletType, attack) {
    const bullets = [];
    const baseDamage = attack || 10;

    switch (bulletType) {
      case BulletType.DOUBLE:
        bullets.push(new Bullet({
          x: x - 1,
          y: y,
          char: '◉',
          damage: baseDamage,
          speed: 2,
          isEnemy: false,
          pierce: false
        }));
        bullets.push(new Bullet({
          x: x + 1,
          y: y,
          char: '◉',
          damage: baseDamage,
          speed: 2,
          isEnemy: false,
          pierce: false
        }));
        break;

      case BulletType.TRIPLE:
        bullets.push(new Bullet({
          x: x,
          y: y,
          char: '◉',
          damage: baseDamage * 0.8,
          speed: 2,
          isEnemy: false,
          pierce: false
        }));
        bullets.push(new Bullet({
          x: x - 2,
          y: y + 1,
          char: '◉',
          damage: baseDamage * 0.8,
          speed: 2,
          isEnemy: false,
          pierce: false,
          vx: -0.7,
          vy: -1.75
        }));
        bullets.push(new Bullet({
          x: x + 2,
          y: y + 1,
          char: '◉',
          damage: baseDamage * 0.8,
          speed: 2,
          isEnemy: false,
          pierce: false,
          vx: 0.7,
          vy: -1.75
        }));
        break;

      case BulletType.PIERCE:
        bullets.push(new Bullet({
          x: x,
          y: y,
          char: '│',
          damage: baseDamage * 1.5,
          speed: 3,
          isEnemy: false,
          pierce: true
        }));
        break;

      case BulletType.MISSILE:
        bullets.push(new Bullet({
          x: x,
          y: y,
          char: '◈',
          damage: baseDamage * 2,
          speed: 2,
          isEnemy: false,
          pierce: false,
          homing: true,
          vx: 0,
          vy: -2,
          charFrames: ['◈', '◇'],
          turnRate: 0.35
        }));
        break;

      default: // NORMAL
        bullets.push(new Bullet({
          x: x,
          y: y,
          char: '◉',
          damage: baseDamage,
          speed: 2,
          isEnemy: false,
          pierce: false
        }));
    }

    return bullets;
  }

  /**
   * 创建敌人子弹工厂方法
   */
  static createEnemyBullet(x, y, damage = 15) {
    return new Bullet({
      x: x,
      y: y,
      char: '◆',
      damage: damage,
      speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
      isEnemy: true,
      pierce: false,
      vx: 0,
      vy: 0.56 * ENEMY_BULLET_SPEED_SCALE,
      baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
    });
  }

  /**
   * 创建敌人子弹（支持自定义速度）
   */
  static createEnemyBulletWithVelocity(x, y, damage, vx, vy, speed = 0.84, char = '◆', homing = false) {
    const scaledSpeed = speed * ENEMY_BULLET_SPEED_SCALE;
    return new Bullet({
      x: x,
      y: y,
      char: char,
      damage: damage,
      speed: scaledSpeed,
      isEnemy: true,
      pierce: false,
      vx: vx * ENEMY_BULLET_SPEED_SCALE,
      vy: vy * ENEMY_BULLET_SPEED_SCALE,
      homing: homing,
      baseSpeed: scaledSpeed
    });
  }

  /**
   * 创建敌人子弹（根据类型）
   */
  static createEnemyBulletByType(x, y, bulletType, damage) {
    const bullets = [];
    const baseDamage = damage || 15;

    switch (bulletType) {
      case EnemyBulletType.SPREAD:
        // 三发散射
        bullets.push(new Bullet({
          x: x, y: y, char: '◆', damage: baseDamage,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0,
          vy: 0.56 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
        bullets.push(new Bullet({
          x: x - 3, y: y + 1, char: '◆', damage: baseDamage * 0.8,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: -0.15 * ENEMY_BULLET_SPEED_SCALE,
          vy: 0.5 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
        bullets.push(new Bullet({
          x: x + 3, y: y + 1, char: '◆', damage: baseDamage * 0.8,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0.15 * ENEMY_BULLET_SPEED_SCALE,
          vy: 0.5 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
        break;

      case EnemyBulletType.FAST:
        // 快速双发
        bullets.push(new Bullet({
          x: x - 2, y: y, char: '•', damage: baseDamage * 0.7,
          speed: 0.42 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0,
          vy: 0.84 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.42 * ENEMY_BULLET_SPEED_SCALE
        }));
        bullets.push(new Bullet({
          x: x + 2, y: y, char: '•', damage: baseDamage * 0.7,
          speed: 0.42 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0,
          vy: 0.84 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.42 * ENEMY_BULLET_SPEED_SCALE
        }));
        break;

      case EnemyBulletType.LASER:
        // 追踪激光（只创建单发，由外部设置homing）
        bullets.push(new Bullet({
          x: x, y: y, char: '▌', damage: baseDamage,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0,
          vy: 0.56 * ENEMY_BULLET_SPEED_SCALE,
          homing: true,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
        break;

      case EnemyBulletType.WAVY:
        // 波浪弹
        bullets.push(new Bullet({
          x: x, y: y, char: '•', damage: baseDamage,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0.3 * ENEMY_BULLET_SPEED_SCALE,
          vy: 0.5 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
        break;

      case EnemyBulletType.BURST:
        // 爆发弹（圆形散射）
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI / 4) * i;
          bullets.push(new Bullet({
            x: x, y: y, char: '•', damage: baseDamage * 0.6,
            speed: 0.35 * ENEMY_BULLET_SPEED_SCALE,
            isEnemy: true,
            vx: Math.cos(angle) * 0.35 * ENEMY_BULLET_SPEED_SCALE,
            vy: (Math.sin(angle) * 0.5 + 0.3) * ENEMY_BULLET_SPEED_SCALE,
            baseSpeed: 0.35 * ENEMY_BULLET_SPEED_SCALE
          }));
        }
        break;

      default: // NORMAL
        bullets.push(new Bullet({
          x: x, y: y, char: '◆', damage: baseDamage,
          speed: 0.28 * ENEMY_BULLET_SPEED_SCALE,
          isEnemy: true,
          vx: 0,
          vy: 0.56 * ENEMY_BULLET_SPEED_SCALE,
          baseSpeed: 0.28 * ENEMY_BULLET_SPEED_SCALE
        }));
    }

    return bullets;
  }
}

module.exports = { Bullet, BulletType, EnemyBulletType, MissileBehavior, ENEMY_BULLET_SPEED_SCALE };
