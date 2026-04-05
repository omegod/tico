/**
 * EntityManager - 实体CRUD + 查询
 * 管理所有游戏实体（玩家、敌人、子弹、道具、粒子等）
 */

const { EventBus, GameEvents } = require('./EventBus');

let entityIdCounter = 0;
const DEFAULT_TIMESTEP_MS = 1000 / 60;

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class Entity {
  constructor(type, data = {}) {
    this.id = ++entityIdCounter;
    this.type = type;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 1;
    this.height = data.height || 1;
    this.active = true;

    // 渲染相关
    this.art = data.art || [];
    this.color = data.color || '#ffffff';

    // 生命周期
    this.life = data.life || Infinity;
    this.maxLife = data.maxLife || this.life;
    this.invincibleTimer = 0;

    // 移动速度
    this.speed = data.speed || 1;
    this.vx = data.vx || 0;
    this.vy = data.vy || 0;
    this.ax = toFiniteNumber(data.ax, 0);
    this.ay = toFiniteNumber(data.ay, 0);
    this.mass = Math.max(toFiniteNumber(data.mass, 1), 0.0001);
    this.gravityScale = toFiniteNumber(data.gravityScale, 0);
    this.restitution = clamp(toFiniteNumber(data.restitution, 0), 0, 1);
    this.maxSpeed = data.maxSpeed == null ? null : Math.max(0, toFiniteNumber(data.maxSpeed, 0));
    this.bounds = data.bounds || null;
    this.gravity = data.gravity && typeof data.gravity === 'object'
      ? {
          x: toFiniteNumber(data.gravity.x, 0),
          y: toFiniteNumber(data.gravity.y, 0)
        }
      : null;
    this.forceX = 0;
    this.forceY = 0;
    this.physicsEnabled = Boolean(
      data.physicsEnabled ||
      data.kinematic ||
      this.ax !== 0 ||
      this.ay !== 0 ||
      this.gravityScale !== 0 ||
      this.restitution !== 0 ||
      this.gravity ||
      data.mass != null ||
      data.maxSpeed != null
    );

    // 复制子弹特有属性
    if (data.isEnemy !== undefined) this.isEnemy = data.isEnemy;
    if (data.damage !== undefined) this.damage = data.damage;
    if (data.pierce !== undefined) this.pierce = data.pierce;
    if (data.char !== undefined) this.char = data.char;
  }

  /**
   * 获取边界框 (AABB)
   */
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  /**
   * 检查与另一个实体的碰撞
   */
  collidesWith(other) {
    const a = this.getBounds();
    const b = other.getBounds();
    return !(a.right < b.left || a.left > b.right ||
             a.bottom < b.top || a.top > b.bottom);
  }

  /**
   * 更新实体
   */
  update(dt) {
    if (this.physicsEnabled) {
      this.updateKinematics(dt);
    } else {
      this.x += this.vx;
      this.y += this.vy;
    }

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
   * 销毁实体
   */
  destroy() {
    this.active = false;
  }

  setVelocity(vx, vy) {
    this.vx = toFiniteNumber(vx, this.vx);
    this.vy = toFiniteNumber(vy, this.vy);
    return this;
  }

  setAcceleration(ax, ay) {
    this.ax = toFiniteNumber(ax, this.ax);
    this.ay = toFiniteNumber(ay, this.ay);
    this.physicsEnabled = true;
    return this;
  }

  setGravity(x, y) {
    this.gravity = {
      x: toFiniteNumber(x, 0),
      y: toFiniteNumber(y, 0)
    };
    this.physicsEnabled = true;
    return this;
  }

  setBounds(bounds) {
    this.bounds = bounds || null;
    return this;
  }

  applyForce(fx, fy) {
    this.forceX += toFiniteNumber(fx, 0);
    this.forceY += toFiniteNumber(fy, 0);
    this.physicsEnabled = true;
    return this;
  }

  applyImpulse(ix, iy) {
    this.vx += toFiniteNumber(ix, 0) / this.mass;
    this.vy += toFiniteNumber(iy, 0) / this.mass;
    this.physicsEnabled = true;
    return this;
  }

  clearForces() {
    this.forceX = 0;
    this.forceY = 0;
    return this;
  }

  updateKinematics(dt, options = {}) {
    const stepMs = Number.isFinite(dt) ? dt : DEFAULT_TIMESTEP_MS;
    const deltaSeconds = stepMs / 1000;
    if (deltaSeconds <= 0) {
      return this;
    }

    const gravitySource = options.gravity || this.gravity;
    const gravityX = gravitySource ? toFiniteNumber(gravitySource.x, 0) * this.gravityScale : 0;
    const gravityY = gravitySource ? toFiniteNumber(gravitySource.y, 0) * this.gravityScale : 0;
    const totalAx = this.ax + (this.forceX / this.mass) + gravityX;
    const totalAy = this.ay + (this.forceY / this.mass) + gravityY;

    this.vx += totalAx * deltaSeconds;
    this.vy += totalAy * deltaSeconds;

    if (this.maxSpeed != null) {
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.maxSpeed && speed > 0) {
        const scale = this.maxSpeed / speed;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    this.x += this.vx * deltaSeconds;
    this.y += this.vy * deltaSeconds;

    this._resolveBounds(options.bounds || this.bounds);
    this.clearForces();
    return this;
  }

  _resolveBounds(bounds) {
    if (!bounds) return;

    const minX = toFiniteNumber(bounds.x, 0);
    const minY = toFiniteNumber(bounds.y, 0);
    const maxX = Number.isFinite(bounds.width) ? minX + bounds.width - this.width : null;
    const maxY = Number.isFinite(bounds.height) ? minY + bounds.height - this.height : null;

    if (this.x < minX) {
      this.x = minX;
      this.vx = this.restitution > 0 ? Math.abs(this.vx) * this.restitution : 0;
    } else if (maxX != null && this.x > maxX) {
      this.x = maxX;
      this.vx = this.restitution > 0 ? -Math.abs(this.vx) * this.restitution : 0;
    }

    if (this.y < minY) {
      this.y = minY;
      this.vy = this.restitution > 0 ? Math.abs(this.vy) * this.restitution : 0;
    } else if (maxY != null && this.y > maxY) {
      this.y = maxY;
      this.vy = this.restitution > 0 ? -Math.abs(this.vy) * this.restitution : 0;
    }
  }
}

// 实体类型常量
const EntityType = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  BOSS: 'boss',
  BULLET: 'bullet',
  POWERUP: 'powerup',
  PARTICLE: 'particle'
};

class EntityManager {
  constructor(eventBus) {
    this.eventBus = eventBus || new EventBus();
    this.entities = {
      player: null,
      enemies: [],
      boss: null,
      bullets: [],
      powerups: [],
      particles: []
    };
    this.tags = new Map(); // tag -> entity[]
  }

  /**
   * 创建实体
   */
  create(type, data = {}) {
    // 如果data已经是实体实例（如Powerup、Bullet等），直接存储
    // 检查是否具有实体特征（id由Entity基类分配，active是实体标志）
    if (data && data.id && data.active !== undefined) {
      this._addToCategory(data, type);
      return data;
    }
    const entity = new Entity(type, data);
    this._addToCategory(entity, type);
    return entity;
  }

  /**
   * 添加实体到对应分类
   */
  _addToCategory(entity, type) {
    switch (type) {
      case EntityType.PLAYER:
        this.entities.player = entity;
        break;
      case EntityType.ENEMY:
        this.entities.enemies.push(entity);
        break;
      case EntityType.BOSS:
        this.entities.boss = entity;
        break;
      case EntityType.BULLET:
        this.entities.bullets.push(entity);
        break;
      case EntityType.POWERUP:
        this.entities.powerups.push(entity);
        break;
      case EntityType.PARTICLE:
        this.entities.particles.push(entity);
        break;
      default:
        console.warn(`Unknown entity type: ${type}`);
    }
  }

  /**
   * 直接设置玩家实体（保留Player类的方法）
   */
  setPlayer(player) {
    this.entities.player = player;
  }

  /**
   * 从分类中移除实体
   */
  _removeFromCategory(entity, type) {
    switch (type) {
      case EntityType.PLAYER:
        this.entities.player = null;
        break;
      case EntityType.ENEMY:
        const eIdx = this.entities.enemies.indexOf(entity);
        if (eIdx !== -1) this.entities.enemies.splice(eIdx, 1);
        break;
      case EntityType.BOSS:
        this.entities.boss = null;
        break;
      case EntityType.BULLET:
        const bIdx = this.entities.bullets.indexOf(entity);
        if (bIdx !== -1) this.entities.bullets.splice(bIdx, 1);
        break;
      case EntityType.POWERUP:
        const pIdx = this.entities.powerups.indexOf(entity);
        if (pIdx !== -1) this.entities.powerups.splice(pIdx, 1);
        break;
      case EntityType.PARTICLE:
        const paIdx = this.entities.particles.indexOf(entity);
        if (paIdx !== -1) this.entities.particles.splice(paIdx, 1);
        break;
    }
  }

  /**
   * 销毁实体
   */
  destroy(entity) {
    if (!entity || !entity.active) return;
    entity.destroy();
    this._removeFromCategory(entity, entity.type);
    this._removeFromTags(entity);
  }

  /**
   * 给实体添加标签
   */
  addTag(entity, tag) {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, []);
    }
    if (!this.tags.get(tag).includes(entity)) {
      this.tags.get(tag).push(entity);
    }
  }

  /**
   * 从标签中移除
   */
  _removeFromTags(entity) {
    for (const [tag, entities] of this.tags) {
      const idx = entities.indexOf(entity);
      if (idx !== -1) {
        entities.splice(idx, 1);
      }
    }
  }

  /**
   * 按标签查询实体
   */
  getByTag(tag) {
    return this.tags.get(tag) || [];
  }

  /**
   * 获取所有敌人
   */
  getEnemies() {
    return this.entities.enemies;
  }

  /**
   * 获取所有敌人子弹
   */
  getEnemyBullets() {
    return this.entities.bullets.filter(b => b.isEnemy);
  }

  /**
   * 获取所有玩家子弹
   */
  getPlayerBullets() {
    return this.entities.bullets.filter(b => !b.isEnemy);
  }

  /**
   * 获取玩家
   */
  getPlayer() {
    return this.entities.player;
  }

  /**
   * 获取BOSS
   */
  getBoss() {
    return this.entities.boss;
  }

  /**
   * 获取所有道具
   */
  getPowerups() {
    return this.entities.powerups;
  }

  /**
   * 获取所有粒子
   */
  getParticles() {
    return this.entities.particles;
  }

  /**
   * 获取所有子弹
   */
  getBullets() {
    return this.entities.bullets;
  }

  /**
   * 更新所有实体
   */
  update(dt) {
    // 更新敌人
    for (let i = this.entities.enemies.length - 1; i >= 0; i--) {
      const enemy = this.entities.enemies[i];
      enemy.update(dt);
      if (!enemy.active) {
        this.entities.enemies.splice(i, 1);
      }
    }

    // 更新子弹
    for (let i = this.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.bullets[i];
      bullet.update(dt);
      if (!bullet.active) {
        this.entities.bullets.splice(i, 1);
      }
    }

    // 更新道具
    for (let i = this.entities.powerups.length - 1; i >= 0; i--) {
      const powerup = this.entities.powerups[i];
      powerup.update(dt);
      if (!powerup.active) {
        this.entities.powerups.splice(i, 1);
      }
    }

    // 更新粒子
    for (let i = this.entities.particles.length - 1; i >= 0; i--) {
      const particle = this.entities.particles[i];
      particle.update(dt);
      if (!particle.active) {
        this.entities.particles.splice(i, 1);
      }
    }

    // 更新玩家
    if (this.entities.player && this.entities.player.update) {
      this.entities.player.update(dt);
    }

    // 更新BOSS
    if (this.entities.boss && this.entities.boss.update) {
      this.entities.boss.update(dt);
      if (!this.entities.boss.active) {
        this.entities.boss = null;
      }
    }
  }

  /**
   * 清除所有实体
   */
  clear() {
    this.entities.enemies = [];
    this.entities.boss = null;
    this.entities.bullets = [];
    this.entities.powerups = [];
    this.entities.particles = [];
    // 保留player
    this.tags.clear();
  }

  /**
   * 清除所有非玩家实体
   */
  clearAll() {
    this.entities.enemies = [];
    this.entities.boss = null;
    this.entities.bullets = [];
    this.entities.powerups = [];
    this.entities.particles = [];
    this.entities.player = null;
    this.tags.clear();
  }

  /**
   * 获取实体数量统计
   */
  getStats() {
    return {
      enemies: this.entities.enemies.length,
      bullets: this.entities.bullets.length,
      powerups: this.entities.powerups.length,
      particles: this.entities.particles.length,
      hasBoss: this.entities.boss !== null,
      hasPlayer: this.entities.player !== null
    };
  }
}

module.exports = { EntityManager, Entity, EntityType };
