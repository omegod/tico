/**
 * Enemy.js - 敌人实体
 * 包含6种敌人类型和3种移动模式
 */

const { Entity } = require('./Entity');
const { ENEMIES, ENEMY_ARTS, MovePatterns } = require('../configs/enemies');
const { GAME_CONSTANTS } = require('../configs/levels');

class Enemy extends Entity {
  constructor(data) {
    super('enemy', data);

    // 引用原始配置
    const config = ENEMIES[data.typeId] || ENEMIES[0];

    this.typeId = data.typeId || 0;
    this.name = config.name;
    this.art = config.art;
    this.color = config.color;
    this.score = config.score;
    this.defense = config.defense;
    this.collisionDamage = config.collisionDamage;

    // 尺寸
    this.width = Math.max(...this.art.map(row => row.length));
    this.height = this.art.length;

    // HP from config
    this.hp = config.hp;
    this.maxHp = config.hp;

    // 速度
    this.speed = config.speed;

    // 射击
    this.fireRate = config.fireRate;
    this.fireTimer = Math.floor(Math.random() * 60);
    this.bulletType = config.bulletType || 'NORMAL';
    this.bulletDamage = config.bulletDamage || 15;

    // 移动相关
    this.moveType = config.moveType;
    this.moveDir = data.moveDir || 1;
    this.moveTimer = 0;
    this.baseX = data.baseX || this.x;
    this.baseY = data.baseY || this.y;
    this.targetX = this.baseX;
    this.targetY = this.baseY;
    this.minX = data.minX || 2;
    this.maxX = data.maxX || 78;

    // 入场
    this.entryDir = data.entryDir || 2; // 0=left, 1=right, 2=top
    this.entered = this.entryDir === 2 ? false : true;

    // 活跃状态
    this.active = true;
    this.invincibleTimer = 0;
  }

  /**
   * 更新敌人
   * @returns {Bullet|null} 返回射出的子弹，如果没有则返回null
   */
  update(dt, frameCount) {
    this.moveTimer++;

    // 入场移动
    if (!this.entered) {
      this._updateEntry();
    } else {
      // 执行移动模式
      const movePattern = MovePatterns[this.moveType];
      if (movePattern) {
        movePattern(this, dt);
      }
    }

    // 更新无敌计时器
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    // 边界检查
    if (this.y > 40 || this.x < -10 || this.x > 90) {
      this.active = false;
    }

    // 返回null（射击由调用者处理）
    return null;
  }

  /**
   * 检查是否应该射击，并返回子弹（由调用者创建）
   */
  checkAndFire() {
    this.fireTimer++;
    if (this.canShoot()) {
      this.resetShootTimer();
      return {
        x: this.x + Math.floor(this.width / 2),
        y: this.y + this.height
      };
    }
    return null;
  }

  /**
   * 更新入场移动
   */
  _updateEntry() {
    const speed = this.speed * 0.5;

    if (this.entryDir === 0 || this.entryDir === 1) {
      // 水平入场
      if (Math.abs(this.x - this.targetX) > speed) {
        this.x += this.x < this.targetX ? speed : -speed;
      } else {
        this.x = this.targetX;
        this.entered = true;
      }
    } else if (this.entryDir === 2) {
      // 垂直入场
      if (Math.abs(this.y - this.targetY) > speed) {
        this.y += this.y < this.targetY ? speed : -speed;
      } else {
        this.y = this.targetY;
        this.entered = true;
      }
    }
  }

  /**
   * 是否可以射击
   */
  canShoot() {
    return this.fireTimer >= this.fireRate;
  }

  /**
   * 重置射击计时器
   */
  resetShootTimer() {
    this.fireTimer = 0;
  }

  /**
   * 创建敌人工厂方法
   */
  static create(typeId, x, y, entryDir, gameWidth) {
    const config = ENEMIES[typeId];
    if (!config) return null;

    const width = Math.max(...ENEMY_ARTS[typeId].map(row => row.length));
    let startX, startY, baseX, baseY, moveDir;

    if (entryDir === 0) {
      // 从左侧入场
      startX = -width;
      startY = Math.floor(Math.random() * 16) + 2;
      baseX = Math.floor(Math.random() * (gameWidth / 2 - width - 4)) + 2;
      baseY = startY;
      moveDir = 1;
    } else if (entryDir === 1) {
      // 从右侧入场
      startX = gameWidth;
      startY = Math.floor(Math.random() * 16) + 2;
      baseX = Math.floor(Math.random() * (gameWidth / 2 - width - 4)) + gameWidth / 2;
      baseY = startY;
      moveDir = -1;
    } else {
      // 从顶部入场
      startX = Math.floor(Math.random() * (gameWidth - width - 4)) + 2;
      startY = -config.art.length;
      baseX = startX;
      baseY = Math.floor(Math.random() * 10) + 3;
      moveDir = Math.random() < 0.5 ? 1 : -1;
    }

    return new Enemy({
      typeId,
      x: startX,
      y: startY,
      baseX,
      baseY,
      moveDir,
      entryDir,
      minX: 2,
      maxX: gameWidth - width - 2
    });
  }
}

module.exports = { Enemy };
