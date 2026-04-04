/**
 * EntityManager - 实体CRUD + 查询
 * 管理所有游戏实体（玩家、敌人、子弹、道具、粒子等）
 */

const { EventBus, GameEvents } = require('./EventBus');

let entityIdCounter = 0;

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
    // 更新位置
    this.x += this.vx;
    this.y += this.vy;

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
