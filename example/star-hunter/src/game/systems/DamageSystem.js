/**
 * DamageSystem.js - 伤害计算系统
 * 处理所有碰撞检测和伤害计算
 */

const { GAME_CONSTANTS } = require('../configs/levels');
const { createExplosion } = require('../entities/Particle');
const { Powerup } = require('../entities/Powerup');
const { STAR_HUNTER_EVENTS } = require('../GameEvents');

class DamageSystem {
  constructor(eventBus, entities) {
    this.eventBus = eventBus;
    this.entities = entities;

    this.screenWidth = 80;
    this.screenHeight = 32;

    // 回调
    this.onPlayerDamaged = null;
    this.onPlayerDestroyed = null;
    this.onEnemyDestroyed = null;
    this.onBossDefeated = null;
    this.onPowerupCollected = null;
    this.onPlayerInvincible = null;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * 更新伤害检测
   */
  update(dt, frameCount) {
    this._checkPlayerBulletsVsEnemies();
    this._checkPlayerBulletsVsBoss();
    this._checkEnemyBulletsVsPlayer();
    this._checkEnemiesVsPlayer();
    this._checkBossVsPlayer();
    this._checkPowerupsVsPlayer();
    this.updateBullets(dt, frameCount);
  }

  /**
   * 公开的子弹更新入口，供Boss过渡阶段复用
   */
  updateBullets(dt, frameCount) {
    this._updateBullets(dt, frameCount);
  }

  /**
   * 更新子弹位置
   */
  _updateBullets(dt, frameCount) {
    const bullets = this.entities.getBullets();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (!bullet) {
        bullets.splice(i, 1);
        continue;
      }

      // 追踪弹更新
      if (bullet.homing && !bullet.isEnemy) {
        const target = this.entities.getBoss() || this._findNearestEnemy(bullet);
        if (target) {
          bullet.setTarget(target);
        } else if (!bullet.target || bullet.target.active === false) {
          bullet.target = null;
        }
      }

      bullet.screenWidth = this.screenWidth;
      bullet.screenHeight = this.screenHeight;

      if (typeof bullet.update === 'function') {
        bullet.update(dt, frameCount);
      }

      // 移除出界子弹（防御性检查 isOffScreen 方法）
      if (bullet && typeof bullet.isOffScreen === 'function') {
        try {
          if (bullet.isOffScreen(this.screenWidth, this.screenHeight)) {
            bullet.active = false;
          }
        } catch (e) {
          // 忽略错误，将子弹标记为非活动状态
          bullet.active = false;
        }
      }

      if (!bullet.active) {
        bullets.splice(i, 1);
      }
    }
  }

  /**
   * 查找最近的敌人
   */
  _findNearestEnemy(bullet) {
    const enemies = this.entities.getEnemies();
    let nearest = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  _canBulletHitTarget(bullet, target) {
    if (!bullet.hitCooldown || bullet.hitCooldown <= 0) {
      return true;
    }

    const lastHitFrame = bullet.hitTracker.get(target.id);
    if (lastHitFrame === undefined) {
      return true;
    }

    return (bullet.framesAlive - lastHitFrame) >= bullet.hitCooldown;
  }

  _registerBulletHit(bullet, target) {
    if (bullet.hitCooldown && bullet.hitCooldown > 0) {
      bullet.hitTracker.set(target.id, bullet.framesAlive);
    }
  }

  _wearBullet(bullet) {
    if (bullet.damageDecay > 0) {
      bullet.damage = Math.max(bullet.minDamage || 0, bullet.damage - bullet.damageDecay);
    }

    if (bullet.integrity > 0) {
      bullet.integrity--;
      if (bullet.integrity <= 0) {
        bullet.active = false;
      }
    }
  }

  /**
   * 玩家子弹 vs 敌人
   */
  _checkPlayerBulletsVsEnemies() {
    const playerBullets = this.entities.getPlayerBullets();
    const enemies = this.entities.getEnemies();

    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const bullet = playerBullets[i];
      if (!bullet.active) continue;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (!enemy.active) continue;
        if (!this._canBulletHitTarget(bullet, enemy)) continue;

        if (bullet.collidesWith(enemy, 1)) {
          this._registerBulletHit(bullet, enemy);

          // 敌人受伤
          const damage = bullet.damage * (1 - enemy.defense);
          enemy.hp -= damage;

          // 爆炸效果
          const particles = createExplosion(bullet.x, bullet.y, 'small');
          for (const p of particles) {
            this.entities.create('particle', p);
          }

          this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'hit');

          // 非穿透弹移除
          if (!bullet.pierce) {
            bullet.active = false;
          } else {
            this._wearBullet(bullet);
          }

          // 检查敌人是否死亡
          if (enemy.hp <= 0) {
            this.entities.destroy(enemy);
            this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'explode');

            const explosion = createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'normal');
            for (const p of explosion) {
              this.entities.create('particle', p);
            }

            // 20%概率掉落道具
            if (Math.random() < 0.2) {
              const powerup = Powerup.createRandom(enemy.x, enemy.y);
              this.entities.create('powerup', powerup);
            }

            if (this.onEnemyDestroyed) {
              this.onEnemyDestroyed(enemy);
            }
          }

          break; // 一颗子弹只能命中一个敌人（非穿透）
        }
      }
    }
  }

  /**
   * 玩家子弹 vs Boss
   */
  _checkPlayerBulletsVsBoss() {
    const playerBullets = this.entities.getPlayerBullets();
    const boss = this.entities.getBoss();
    if (!boss || !boss.active) return;

    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const bullet = playerBullets[i];
      if (!bullet.active) continue;
      if (!this._canBulletHitTarget(bullet, boss)) continue;

      if (bullet.collidesWith(boss, 1)) {
        this._registerBulletHit(bullet, boss);

        // Boss受伤
        const damage = bullet.damage * (1 - boss.defense);
        boss.hp -= damage;

        // 爆炸效果
        const particles = createExplosion(bullet.x, bullet.y, 'small');
        for (const p of particles) {
          this.entities.create('particle', p);
        }

        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'bossHit');

        if (!bullet.pierce) {
          bullet.active = false;
        } else {
          this._wearBullet(bullet);
        }

        // 检查Boss是否死亡
        if (boss.hp <= 0) {
          this.entities.destroy(boss);
          this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'victory');

          const explosion = createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 'large', null, 40);
          for (const p of explosion) {
            this.entities.create('particle', p);
          }

          if (this.onBossDefeated) {
            this.onBossDefeated();
          }
          return; // Boss已死亡，退出循环
        }
      }
    }
  }

  /**
   * 敌人子弹 vs 玩家
   */
  _checkEnemyBulletsVsPlayer() {
    const player = this.entities.getPlayer();
    if (!player || !player.active) return;
    if (player.invincibleTimer > 0) return;

    const enemyBullets = this.entities.getEnemyBullets();

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];
      if (!bullet.active) continue;

      if (bullet.collidesWith(player, 1)) {
        const result = player.takeDamage(bullet.damage);
        bullet.active = false;

        if (result.blocked) {
          // 无敌状态
        } else if (result.shieldDamage > 0) {
          this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'hit');
        } else {
          this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'hit');
        }

        if (player.hp <= 0) {
          if (this.onPlayerDestroyed) {
            this.onPlayerDestroyed();
          }
        } else if (this.onPlayerDamaged) {
          this.onPlayerDamaged(result);
        }
      }
    }
  }

  /**
   * 敌人 vs 玩家 碰撞
   */
  _checkEnemiesVsPlayer() {
    const player = this.entities.getPlayer();
    if (!player || !player.active) return;
    if (player.invincibleTimer > 0) return;

    const enemies = this.entities.getEnemies();

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.active) continue;
      if (enemy.invincibleTimer > 0) continue;

      if (enemy.collidesWith(player, 1)) {
        // 玩家受伤
        const result = player.takeDamage(30);
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'hit');

        // 敌人受伤
        const enemyDamage = 50 * (1 - enemy.defense);
        enemy.hp -= enemyDamage;

        // 双方无敌（1.5秒 = 30帧 at 20fps）
        player.setInvincible(30);
        enemy.setInvincible(30);
        
        // 触发玩家无敌回调
        if (this.onPlayerInvincible) {
          this.onPlayerInvincible(30);
        }

        // 爆炸效果
        const particles = createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'small');
        for (const p of particles) {
          this.entities.create('particle', p);
        }

        // 检查敌人死亡
        if (enemy.hp <= 0) {
          this.entities.destroy(enemy);
          this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'explode');

          const explosion = createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'normal');
          for (const p of explosion) {
            this.entities.create('particle', p);
          }

          if (this.onEnemyDestroyed) {
            this.onEnemyDestroyed(enemy);
          }
        }

        // 检查玩家死亡
        if (player.hp <= 0) {
          if (this.onPlayerDestroyed) {
            this.onPlayerDestroyed();
          }
        } else if (this.onPlayerDamaged) {
          this.onPlayerDamaged(result);
        }
      }
    }
  }

  /**
   * Boss vs 玩家碰撞
   */
  _checkBossVsPlayer() {
    const player = this.entities.getPlayer();
    const boss = this.entities.getBoss();
    if (!player || !player.active || !boss || !boss.active) return;
    if (player.invincibleTimer > 0 || boss.invincibleTimer > 0) return;

    if (boss.collidesWith(player, 1)) {
      // 玩家受伤
      const result = player.takeDamage(50);
      this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'hit');

      // Boss受伤
      const bossDamage = 100 * (1 - boss.defense);
      boss.hp -= bossDamage;

      // 双方无敌（1.5秒 = 30帧 at 20fps）
      player.setInvincible(30);
      boss.setInvincible(30);
      
      // 触发玩家无敌回调
      if (this.onPlayerInvincible) {
        this.onPlayerInvincible(30);
      }

      // 爆炸效果
      const particles = createExplosion(player.x + player.width/2, player.y + player.height/2, 'small');
      for (const p of particles) {
        this.entities.create('particle', p);
      }

      // 检查Boss死亡
      if (boss.hp <= 0) {
        this.entities.destroy(boss);
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'victory');

        const explosion = createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 'large', null, 40);
        for (const p of explosion) {
          this.entities.create('particle', p);
        }

        if (this.onBossDefeated) {
          this.onBossDefeated();
        }
      }

      // 检查玩家死亡
      if (player.hp <= 0) {
        if (this.onPlayerDestroyed) {
          this.onPlayerDestroyed();
        }
      } else if (this.onPlayerDamaged) {
        this.onPlayerDamaged(result);
      }
    }
  }

  /**
   * 道具 vs 玩家
   */
  _checkPowerupsVsPlayer() {
    const player = this.entities.getPlayer();
    if (!player || !player.active) return;

    const powerups = this.entities.getPowerups();

    for (let i = powerups.length - 1; i >= 0; i--) {
      const powerup = powerups[i];
      if (!powerup.active) continue;

      if (powerup.collidesWith(player, 2)) {
        powerup.active = false;
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'powerup');

        if (this.onPowerupCollected) {
          this.onPowerupCollected(powerup);
        }
      }
    }
  }
}

module.exports = { DamageSystem };
