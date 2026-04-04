/**
 * Entity.js - 游戏实体基类
 * 所有游戏实体（玩家、敌人、子弹等）的基类
 */

let entityIdCounter = 0;

class Entity {
  constructor(type, data = {}) {
    this.id = ++entityIdCounter;
    this.type = type;

    // 位置和尺寸
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 1;
    this.height = data.height || 1;

    // 活动状态
    this.active = true;

    // 渲染相关
    this.art = data.art || [];
    this.color = data.color || '#ffffff';

    // 生命周期
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || this.hp;
    this.life = data.life || Infinity;
    this.maxLife = data.maxLife || this.life;

    // 无敌状态
    this.invincibleTimer = 0;

    // 速度
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
  collidesWith(other, margin = 0) {
    const a = this.getBounds();
    const b = other.getBounds();
    return !(
      a.right + margin < b.left ||
      b.right + margin < a.left ||
      a.bottom + margin < b.top ||
      b.bottom + margin < a.top
    );
  }

  /**
   * 更新实体
   */
  update(dt, frameCount) {
    // 更新位置
    this.x += this.vx;
    this.y += this.vy;

    // 更新无敌计时器
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    // 更新生命周期
    if (this.life !== Infinity) {
      this.life--;
      if (this.life <= 0) {
        this.active = false;
      }
    }

    // 更新HP
    if (this.hp !== Infinity && this.hp <= 0) {
      this.active = false;
    }
  }

  /**
   * 受到伤害
   */
  takeDamage(damage) {
    if (this.invincibleTimer > 0) return 0;
    const actualDamage = Math.min(damage, this.hp);
    this.hp -= actualDamage;
    if (this.hp <= 0) {
      this.active = false;
    }
    return actualDamage;
  }

  /**
   * 造成伤害（基于防御力）
   */
  takeDamageWithDefense(damage, defense) {
    if (this.invincibleTimer > 0) return 0;
    const actualDamage = Math.floor(damage * (1 - defense));
    this.hp -= actualDamage;
    if (this.hp <= 0) {
      this.active = false;
    }
    return actualDamage;
  }

  /**
   * 设置无敌时间
   */
  setInvincible(frames) {
    this.invincibleTimer = frames;
  }

  /**
   * 销毁实体
   */
  destroy() {
    this.active = false;
  }

  /**
   * 是否可见（用于闪烁效果）
   */
  isVisible() {
    if (this.invincibleTimer <= 0) return true;
    return Math.floor(this.invincibleTimer / 4) % 2 === 0;
  }

  /**
   * 获取HP百分比
   */
  getHpPercent() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}

module.exports = { Entity };
