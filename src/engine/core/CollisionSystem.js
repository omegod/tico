/**
 * CollisionSystem - AABB碰撞检测
 * 提供精确的碰撞检测功能
 */

class CollisionSystem {
  constructor() {
    this.enabled = true;
  }

  /**
   * AABB碰撞检测
   * @param {Object} a - 实体A，需要有 x, y, width, height
   * @param {Object} b - 实体B，需要有 x, y, width, height
   * @param {number} margin - 碰撞容差
   * @returns {boolean} 是否碰撞
   */
  checkCollision(a, b, margin = 0) {
    return !(
      a.x + a.width + margin < b.x ||
      b.x + b.width + margin < a.x ||
      a.y + a.height + margin < b.y ||
      b.y + b.height + margin < a.y
    );
  }

  /**
   * 点是否在矩形内
   * @param {number} px - 点X
   * @param {number} py - 点Y
   * @param {Object} rect - 矩形 {x, y, width, height}
   * @returns {boolean}
   */
  pointInRect(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    );
  }

  /**
   * 圆形碰撞检测
   * @param {Object} a - 实体A {x, y, radius}
   * @param {Object} b - 实体B {x, y, radius}
   * @returns {boolean}
   */
  circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (a.radius || 1) + (b.radius || 1);
  }

  /**
   * 玩家子弹 vs 敌人 检测
   * @param {Array} playerBullets - 玩家子弹数组
   * @param {Array} enemies - 敌人数组
   * @param {number} margin - 碰撞容差
   * @returns {Array} 碰撞信息 [{bullet, enemy}]
   */
  checkPlayerBulletsVsEnemies(playerBullets, enemies, margin = 1) {
    const collisions = [];
    for (const bullet of playerBullets) {
      if (!bullet.active) continue;
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        if (this.checkCollision(bullet, enemy, margin)) {
          collisions.push({ bullet, enemy });
          break;
        }
      }
    }
    return collisions;
  }

  /**
   * 玩家子弹 vs BOSS 检测
   * @param {Array} playerBullets - 玩家子弹数组
   * @param {Object} boss - BOSS实体
   * @param {number} margin - 碰撞容差
   * @returns {Array} 碰撞信息 [{bullet, boss}]
   */
  checkPlayerBulletsVsBoss(playerBullets, boss, margin = 1) {
    if (!boss || !boss.active) return [];
    const collisions = [];
    for (const bullet of playerBullets) {
      if (!bullet.active) continue;
      if (this.checkCollision(bullet, boss, margin)) {
        collisions.push({ bullet, boss });
      }
    }
    return collisions;
  }

  /**
   * 敌人子弹 vs 玩家 检测
   * @param {Array} enemyBullets - 敌人子弹数组
   * @param {Object} player - 玩家实体
   * @param {number} margin - 碰撞容差
   * @returns {Array} 碰撞信息 [{bullet}]
   */
  checkEnemyBulletsVsPlayer(enemyBullets, player, margin = 1) {
    if (!player || !player.active) return [];
    const collisions = [];
    for (const bullet of enemyBullets) {
      if (!bullet.active) continue;
      if (this.checkCollision(bullet, player, margin)) {
        collisions.push({ bullet });
      }
    }
    return collisions;
  }

  /**
   * 敌人 vs 玩家 碰撞检测
   * @param {Array} enemies - 敌人数组
   * @param {Object} player - 玩家实体
   * @param {number} margin - 碰撞容差
   * @returns {Array} 碰撞信息 [{enemy}]
   */
  checkEnemiesVsPlayer(enemies, player, margin = 1) {
    if (!player || !player.active) return [];
    const collisions = [];
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      if (this.checkCollision(enemy, player, margin)) {
        collisions.push({ enemy });
      }
    }
    return collisions;
  }

  /**
   * BOSS vs 玩家 碰撞检测
   * @param {Object} boss - BOSS实体
   * @param {Object} player - 玩家实体
   * @param {number} margin - 碰撞容差
   * @returns {boolean}
   */
  checkBossVsPlayer(boss, player, margin = 1) {
    if (!boss || !boss.active || !player || !player.active) return false;
    return this.checkCollision(boss, player, margin);
  }

  /**
   * 道具 vs 玩家 碰撞检测
   * @param {Array} powerups - 道具数组
   * @param {Object} player - 玩家实体
   * @param {number} margin - 碰撞容差
   * @returns {Array} 碰撞信息 [{powerup}]
   */
  checkPowerupsVsPlayer(powerups, player, margin = 2) {
    if (!player || !player.active) return [];
    const collisions = [];
    for (const powerup of powerups) {
      if (!powerup.active) continue;
      if (this.checkCollision(powerup, player, margin)) {
        collisions.push({ powerup });
      }
    }
    return collisions;
  }

  /**
   * 实体是否在屏幕内
   * @param {Object} entity - 实体 {x, y, width, height}
   * @param {number} screenWidth - 屏幕宽度
   * @param {number} screenHeight - 屏幕高度
   * @param {number} margin - 边距容差
   * @returns {boolean}
   */
  isOnScreen(entity, screenWidth, screenHeight, margin = 0) {
    // Entity is off-screen if ANY part extends beyond boundaries
    return !(
      entity.x < -margin || // Left edge off left side
      entity.x + entity.width > screenWidth + margin || // Right edge off right side
      entity.y < -margin || // Top edge off top side
      entity.y + entity.height > screenHeight + margin   // Bottom edge off bottom side
    );
  }
}

module.exports = { CollisionSystem };
