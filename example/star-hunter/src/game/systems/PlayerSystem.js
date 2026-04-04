/**
 * PlayerSystem.js - 玩家输入+射击系统
 * 处理玩家输入、射击和移动
 */

const { Bullet, BulletType, MissileBehavior } = require('../entities/Bullet');
const { getShipByIndex } = require('../configs/ships');

class PlayerSystem {
  constructor(eventBus, entities) {
    this.eventBus = eventBus;
    this.entities = entities;
    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.screenWidth = 80;
    this.screenHeight = 32;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * 处理输入状态更新
   */
  handleInput(action, pressed) {
    switch (action) {
      case 'MOVE_UP':
        this.inputState.up = pressed;
        break;
      case 'MOVE_DOWN':
        this.inputState.down = pressed;
        break;
      case 'MOVE_LEFT':
        this.inputState.left = pressed;
        break;
      case 'MOVE_RIGHT':
        this.inputState.right = pressed;
        break;
    }
  }

  /**
   * 更新玩家
   */
  update(dt, frameCount) {
    const player = this.entities.getPlayer();
    if (!player) return;

    // 移动
    let dx = 0, dy = 0;
    if (this.inputState.up) dy -= 1;
    if (this.inputState.down) dy += 1;
    if (this.inputState.left) dx -= 1;
    if (this.inputState.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      player.move(dx, dy, this.screenWidth, this.screenHeight);
    }

    // 更新玩家实体
    player.update(dt, frameCount);
  }

  /**
   * 射击
   */
  shoot() {
    const player = this.entities.getPlayer();
    if (!player || !player.canShoot()) return [];

    player.resetShotCooldown();
    const bullets = Bullet.createPlayerBullet(
      player.x + Math.floor(player.width / 2),
      player.y,
      player.bulletType,
      player.attack
    );

    return bullets;
  }

  /**
   * 释放导弹
   */
  firePower(powerCount) {
    if (powerCount <= 0) return [];
    const player = this.entities.getPlayer();
    if (!player) return [];

    const bullets = [];
    const cx = player.x + Math.floor(player.width / 2);
    const cy = player.y - 1;
    const pattern = player.missilePattern || 'STANDARD';
    const createMissile = (options = {}) => {
      bullets.push(new Bullet({
        x: options.x !== undefined ? options.x : cx,
        y: options.y !== undefined ? options.y : cy,
        char: options.char || '◈',
        damage: options.damage || 18,
        speed: options.speed || 2.6,
        isEnemy: false,
        pierce: options.pierce || false,
        homing: options.homing !== undefined ? options.homing : true,
        vx: options.vx || 0,
        vy: options.vy || -2.6,
        baseSpeed: options.baseSpeed || options.speed || 2.6,
        behavior: options.behavior || MissileBehavior.SEEKER,
        turnRate: options.turnRate || 0.24,
        targetX: options.targetX,
        targetY: options.targetY,
        phase: options.phase,
        anchorX: options.anchorX,
        anchorY: options.anchorY,
        orbitCenter: options.orbitCenter,
        orbitRadius: options.orbitRadius,
        orbitAngle: options.orbitAngle,
        orbitSpeed: options.orbitSpeed,
        orbitVerticalScale: options.orbitVerticalScale,
        waveAmplitude: options.waveAmplitude,
        waveSpeed: options.waveSpeed,
        drift: options.drift,
        phaseOffset: options.phaseOffset,
        baseX: options.baseX,
        baseY: options.baseY,
        hitCooldown: options.hitCooldown,
        life: options.life,
        delayFrames: options.delayFrames,
        deployFrames: options.deployFrames,
        charFrames: options.charFrames,
        packedChar: options.packedChar,
        releaseOnAnchor: options.releaseOnAnchor,
        acceleration: options.acceleration,
        maxSpeed: options.maxSpeed,
        integrity: options.integrity,
        damageDecay: options.damageDecay,
        minDamage: options.minDamage,
        bouncePadding: options.bouncePadding,
        color: options.color,
        colorFrames: options.colorFrames,
        width: options.width,
        height: options.height
      }));
    };
    const createGyroField = (options = {}) => {
      const core = new Bullet({
        x: cx,
        y: cy,
        char: options.char || '◎',
        damage: options.damage || 6,
        speed: options.speed || 2.2,
        isEnemy: false,
        pierce: true,
        homing: false,
        vx: 0,
        vy: options.vy !== undefined ? options.vy : -2.2,
        baseSpeed: options.speed || 2.2,
        behavior: MissileBehavior.GYRO_CORE,
        life: options.life || 120,
        hitCooldown: options.hitCooldown || 8,
        deployFrames: options.deployFrames || 12,
        charFrames: options.charFrames || ['◎', '◉', '◌', '◉'],
        color: options.color
      });
      bullets.push(core);

      const orbitCount = options.orbitCount || 4;
      const orbitRadius = options.orbitRadius || 5;
      for (let i = 0; i < orbitCount; i++) {
        createMissile({
          x: core.x,
          y: core.y,
          char: '✦',
          damage: options.orbitDamage || 8,
          speed: 0,
          baseSpeed: 0,
          pierce: true,
          homing: false,
          behavior: MissileBehavior.ORBITAL,
          orbitCenter: core,
          orbitRadius,
          orbitAngle: (Math.PI * 2 * i) / orbitCount,
          orbitSpeed: options.orbitSpeed || 0.22,
          orbitVerticalScale: options.orbitVerticalScale || 0.65,
          hitCooldown: options.orbitHitCooldown || 4,
          life: (options.life || 120) + 2,
          charFrames: options.orbitCharFrames || ['✦', '✧', '✦', '·'],
          packedChar: options.packedChar || '·',
          releaseOnAnchor: true,
          color: options.color
        });
      }
    };

    switch (pattern) {
      case 'ASSAULT':
        createMissile({
          x: cx - 3, y: cy, damage: 14, speed: 2.6, baseSpeed: 2.6,
          vx: -0.2, vy: -2.8, turnRate: 0.32, charFrames: ['◈', '◆']
        });
        createMissile({
          x: cx, y: cy - 1, damage: 20, speed: 2.8, baseSpeed: 2.8,
          vx: 0, vy: -3, turnRate: 0.45, pierce: true,
          acceleration: 0.08, maxSpeed: 3.6, integrity: 4, damageDecay: 4, minDamage: 8,
          hitCooldown: 5, charFrames: ['◎', '◉', '◆'], color: '\x1b[93m'
        });
        createMissile({
          x: cx + 3, y: cy, damage: 14, speed: 2.6, baseSpeed: 2.6,
          vx: 0.2, vy: -2.8, turnRate: 0.32, charFrames: ['◈', '◆']
        });
        break;

      case 'TWO_ROW':
        createGyroField({
          life: 125,
          deployFrames: 5,
          orbitCount: 4,
          orbitRadius: 5,
          orbitDamage: 8,
          orbitSpeed: 0.24,
          vy: -2.45,
          packedChar: '◌',
          color: '\x1b[96m'
        });
        break;

      case 'PIERCING':
        createMissile({
          x: cx,
          y: cy,
          char: '◎',
          damage: 8,
          speed: 0,
          baseSpeed: 0,
          homing: false,
          pierce: false,
          life: 10,
          charFrames: ['◎', '◉', '◎'],
          color: '\x1b[96m'
        });
        createMissile({
          x: cx, y: cy, damage: 34, speed: 4.8, baseSpeed: 4.8,
          pierce: true, homing: false, behavior: MissileBehavior.RAIL,
          char: '│', vx: 0, vy: -4.8, delayFrames: 8,
          charFrames: ['│', '┃', '╽'], color: '\x1b[97m'
        });
        createMissile({
          x: cx - 2, y: cy + 1, damage: 18, speed: 4.2, baseSpeed: 4.2,
          pierce: true, homing: false, behavior: MissileBehavior.RAIL,
          char: '╎', vx: 0, vy: -4.2, delayFrames: 8,
          charFrames: ['╎', '│', '╏'], color: '\x1b[96m'
        });
        createMissile({
          x: cx + 2, y: cy + 1, damage: 18, speed: 4.2, baseSpeed: 4.2,
          pierce: true, homing: false, behavior: MissileBehavior.RAIL,
          char: '╎', vx: 0, vy: -4.2, delayFrames: 8,
          charFrames: ['╎', '│', '╏'], color: '\x1b[96m'
        });
        createMissile({
          x: cx - 4, y: cy + 2, damage: 16, speed: 3.8, baseSpeed: 3.8,
          pierce: true, homing: false, behavior: MissileBehavior.RAIL,
          char: '│', vx: 0, vy: -3.8, delayFrames: 8,
          charFrames: ['│', '╽'], color: '\x1b[94m'
        });
        createMissile({
          x: cx + 4, y: cy + 2, damage: 16, speed: 3.8, baseSpeed: 3.8,
          pierce: true, homing: false, behavior: MissileBehavior.RAIL,
          char: '│', vx: 0, vy: -3.8, delayFrames: 8,
          charFrames: ['│', '╽'], color: '\x1b[94m'
        });
        break;

      case 'BARRIER':
        player.hp = Math.min(player.maxHp, player.hp + 30);
        player.shield = Math.min(player.maxShield, player.shield + 15);
        [-8, -3, 0, 3, 8].forEach((offset, index) => {
          const zoneWidth = index === 2 ? 7 : 5;
          const zoneHeight = 3;
          const targetCenterX = Math.max(
            Math.ceil(zoneWidth / 2) + 1,
            Math.min(this.screenWidth - Math.ceil(zoneWidth / 2) - 2, cx + offset)
          );
          const targetCenterY = Math.max(4, cy - 9 - Math.abs(index - 2));
          createMissile({
            x: cx + offset * 0.4 - Math.floor(zoneWidth / 2),
            y: cy - Math.floor(zoneHeight / 2),
            width: zoneWidth,
            height: zoneHeight,
            char: '▓',
            damage: 10,
            speed: 2.1,
            baseSpeed: 2.1,
            pierce: true,
            homing: false,
            behavior: MissileBehavior.BARRIER_NODE,
            targetX: targetCenterX - Math.floor(zoneWidth / 2),
            targetY: targetCenterY - Math.floor(zoneHeight / 2),
            waveAmplitude: 0.6 + Math.abs(offset) * 0.04,
            waveSpeed: 0.08,
            phaseOffset: index * 0.9,
            hitCooldown: 5,
            life: 118,
            charFrames: ['▓', '▒', '▓', '▒'],
            color: '\x1b[91m',
            colorFrames: ['\x1b[91m', '\x1b[2m\x1b[37m']
          });
        });
        break;

      case 'RAPID':
        [
          { x: Math.floor(this.screenWidth * 0.22), y: Math.floor(this.screenHeight * 0.28), vx: 1.7, vy: 1.15 },
          { x: Math.floor(this.screenWidth * 0.5), y: Math.floor(this.screenHeight * 0.55), vx: -1.55, vy: -1.45 },
          { x: Math.floor(this.screenWidth * 0.78), y: Math.floor(this.screenHeight * 0.8), vx: -1.75, vy: 1.1 }
        ].forEach((shot) => {
          createMissile({
            x: shot.x,
            y: shot.y,
            char: '✦',
            damage: 10,
            speed: 0,
            baseSpeed: 0,
            pierce: true,
            homing: false,
            behavior: MissileBehavior.RICOCHET,
            vx: shot.vx,
            vy: shot.vy,
            life: 140,
            hitCooldown: 3,
            bouncePadding: 1,
            charFrames: ['✦', '✧', '◈'],
            color: '\x1b[93m'
          });
        });
        break;

      case 'ULTIMATE':
        for (let wave = 0; wave < 3; wave++) {
          for (let x = 4; x < this.screenWidth - 2; x += 6) {
            createMissile({
              x,
              y: this.screenHeight - 2 + wave * 2,
              char: wave % 2 === 0 ? '│' : '╽',
              damage: 12 + wave * 2,
              speed: 5.2,
              baseSpeed: 5.2,
              pierce: false,
              homing: false,
              behavior: MissileBehavior.RAIL,
              vx: 0,
              vy: -5.2,
              delayFrames: wave * 4,
              life: 18,
              charFrames: wave % 2 === 0 ? ['│', '╽'] : ['╽', '│'],
              color: wave % 2 === 0 ? '\x1b[95m' : '\x1b[97m'
            });
          }
        }
        createMissile({
          x: cx,
          y: this.screenHeight - 2,
          char: '║',
          damage: 24,
          speed: 6,
          baseSpeed: 6,
          pierce: true,
          homing: false,
          behavior: MissileBehavior.RAIL,
          vx: 0,
          vy: -6,
          life: 16,
          charFrames: ['║', '┃'],
          color: '\x1b[96m'
        });
        break;

      default:
        createMissile({ damage: 18, speed: 2.6, baseSpeed: 2.6, charFrames: ['◈', '◇'] });
    }

    return bullets;
  }

  /**
   * 开关护盾
   */
  toggleShield() {
    const player = this.entities.getPlayer();
    if (player) {
      player.toggleShield();
    }
  }

  /**
   * 获取玩家状态
   */
  getState() {
    const player = this.entities.getPlayer();
    if (!player) return null;

    return {
      x: player.x,
      y: player.y,
      hp: player.hp,
      maxHp: player.maxHp,
      shield: player.shield,
      shieldActive: player.shieldActive,
      invincibleTimer: player.invincibleTimer,
      width: player.width,
      height: player.height
    };
  }
}

module.exports = { PlayerSystem };
