/**
 * StarHunter.js - 游戏入口（接线）
 * 连接所有系统和引擎
 */

const readline = require('readline');

// 引擎
const { GameEngine, GAME_STATE: ENGINE_STATE } = require('../../../../src/engine/core/GameEngine');
const { EventBus } = require('../../../../src/engine/core/EventBus');
const { Renderer, COLORS } = require('../../../../src/engine/rendering/Renderer');
const { InputHandler } = require('../../../../src/engine/input/InputHandler');
const { KeyMapping, getAction } = require('../../../../src/engine/input/KeyMapping');
const { HUD } = require('./ui/HUD');
const { Banner } = require('./ui/Banner');
const { Modal } = require('./ui/Modal');
const { Layer } = require('./rendering/Layer');
const { GAME_FLOW_STATE } = require('./GameState');
const { STAR_HUNTER_EVENTS } = require('./GameEvents');
const { StarHunterEntityManager } = require('./StarHunterEntityManager');
const {
  advanceStarfield,
  renderStarfield,
  renderPlayer,
  renderShield,
  renderEnemy,
  renderBoss,
  renderBullet,
  renderPowerup,
  renderParticle
} = require('./rendering/StarHunterRenderer');
const { strWidth, stripAnsi, padEndDisplay, center, repeatChar } = require('../../../../src/engine/rendering/ScreenBuffer');

// 游戏实体
const { Player } = require('./entities/Player');
const { Enemy } = require('./entities/Enemy');
const { Boss } = require('./entities/Boss');
const { Bullet, BulletType } = require('./entities/Bullet');
const { Powerup } = require('./entities/Powerup');
const { createExplosion } = require('./entities/Particle');

// 游戏系统
const { PlayerSystem } = require('./systems/PlayerSystem');
const { EnemySpawnSystem } = require('./systems/EnemySpawnSystem');
const { BossSystem } = require('./systems/BossSystem');
const { DamageSystem } = require('./systems/DamageSystem');

// 游戏配置
const { SHIPS, getShipByIndex } = require('./configs/ships');
const { GAME_CONSTANTS } = require('./configs/levels');
const { PowerupType, getPowerupConfig } = require('./configs/powerups');
const { getStoryByWave } = require('./configs/stories');

// 游戏尺寸
const GAME_WIDTH = 80;
const GAME_HEIGHT = 32;

class StarHunter {
  constructor(options = {}) {
    const config = options && options.write ? { stdout: options } : options;
    const runtime = config.runtime || null;

    this.stdout = config.stdout || process.stdout;
    this.runtimeOwned = !runtime;
    this.eventBus = runtime ? runtime.eventBus : new EventBus();
    this.engine = runtime ? runtime.engine : new GameEngine({ width: GAME_WIDTH, height: GAME_HEIGHT, frameRate: 50 });
    this.entities = StarHunterEntityManager.adapt(runtime ? runtime.entities : null, this.eventBus);
    if (runtime) {
      runtime.entities = this.entities;
    }
    this.renderer = runtime ? runtime.renderer : new Renderer(GAME_WIDTH, GAME_HEIGHT, this.stdout);
    this.input = runtime ? runtime.input : new InputHandler();
    this.hud = new HUD(GAME_WIDTH);
    this.banner = new Banner(GAME_WIDTH, GAME_HEIGHT, { scheduler: this.engine.time });
    this.modal = new Modal(GAME_WIDTH, GAME_HEIGHT);

    // 系统
    this.playerSystem = new PlayerSystem(this.eventBus, this.entities);
    this.enemySpawnSystem = new EnemySpawnSystem(this.eventBus, this.entities);
    this.bossSystem = new BossSystem(this.eventBus, this.entities);
    this.damageSystem = new DamageSystem(this.eventBus, this.entities);

    // 游戏状态
    this.selectedIndex = 0;
    this.selectedShip = 0;
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.powerCount = 0;
    this.missileCapacity = GAME_CONSTANTS.MAX_MISSILES;
    this.missileReloadFrames = null;
    this.missileReloadTimer = 0;
    this.invincibleTimer = 0;
    this._showingBossWarning = false;
    this._bossTransition = null;
    this.backgroundOffset = 0;

    // 按键状态
    this.keysPressed = new Set();
    this._cleanupTasks = [];
    this._updateSystem = {
      update: (dt, frameCount) => this._gameUpdate(dt, frameCount)
    };

    // 初始化
    this._init();
  }

  /**
   * 获取当前玩家实体（供powerup效果使用）
   */
  get player() {
    return this.entities.getPlayer();
  }

  _init() {
    if (this.runtimeOwned) {
      this.input.initTerminal();
      this.input.init();
    }

    // Star Hunter 以菜单为入口，挂到共享 runtime 时也需要显式恢复到菜单态。
    this.engine.setState(GAME_FLOW_STATE.MENU);

    // 设置实体管理器
    this.engine.setEntityManager(this.entities);

    // 注册系统
    this.engine.registerSystem(this._updateSystem, {
      owner: this,
      priority: 0,
      id: 'star-hunter:update'
    });

    // 注册渲染回调
    this.engine.onRender((dt, frameCount) => this._render(dt, frameCount));

    // 设置伤害系统回调
    this.damageSystem.onPlayerDamaged = (result) => this._onPlayerDamaged(result);
    this.damageSystem.onPlayerDestroyed = () => this._onPlayerDestroyed();
    this.damageSystem.onEnemyDestroyed = (enemy) => this._onEnemyDestroyed(enemy);
    this.damageSystem.onBossDefeated = () => this._onBossDefeated();
    this.damageSystem.onPowerupCollected = (powerup) => this._onPowerupCollected(powerup);
    this.damageSystem.onPlayerInvincible = (frames) => this._onPlayerInvincible(frames);

    // 设置敌人生成系统回调
    this.enemySpawnSystem.onWaveStart = (wave) => this._onWaveStart(wave);
    this.enemySpawnSystem.onBossSpawn = (boss) => this._onBossSpawn(boss);

    // 设置Boss系统回调
    this.bossSystem.onBossDefeated = () => this._onBossDefeated();
    this.bossSystem.onPhaseChange = (boss) => this._onBossPhaseChange(boss);

    // 设置输入处理
    this._cleanupTasks.push(this.input.onKey((key, keyInfo) => this._handleKey(key, keyInfo)));

    // 事件监听
    this._cleanupTasks.push(this.eventBus.on(STAR_HUNTER_EVENTS.PLAY_SOUND, (data) => {
      const type = typeof data === 'string' ? data : (data && data.type) || 'hit';
      this._playSound(type);
    }));
  }

  /**
   * 启动游戏
   */
  start() {
    if (!this.runtimeOwned) {
      return;
    }

    this.engine.init();
    this.engine.startLoop();
  }

  /**
   * 游戏主循环更新
   */
  _gameUpdate(dt, frameCount) {
    const state = this.engine.getState();

    if (state !== GAME_FLOW_STATE.PLAYING) return;

    if (this._bossTransition) {
      this._updateMissileAutoReload();
      this._updateBossTransition(dt, frameCount);
      return;
    }

    // 滚动星空
    this.backgroundOffset = advanceStarfield(this.backgroundOffset);

    // 更新玩家输入
    this._updatePlayerInput();

    // 更新玩家射击
    this._updatePlayerShooting();

    // 更新所有敌人
    for (const enemy of this.entities.getEnemies()) {
      enemy.update(dt, frameCount);

      // 敌人射击
      const bulletPos = enemy.checkAndFire();
      if (bulletPos) {
        const { Bullet, EnemyBulletType } = require('./entities/Bullet');
        const bulletType = enemy.bulletType || EnemyBulletType.NORMAL;
        const bulletDamage = enemy.bulletDamage || 15;
        const bullets = Bullet.createEnemyBulletByType(bulletPos.x, bulletPos.y, bulletType, bulletDamage);
        for (const bullet of bullets) {
          this.entities.create('bullet', bullet);
        }
      }
    }

    // 更新道具
    for (const powerup of this.entities.getPowerups()) {
      powerup.update(dt, frameCount);
      // 出界移除
      if (powerup.y > GAME_HEIGHT + 2) {
        powerup.active = false;
      }
    }

    // 更新粒子
    for (const particle of this.entities.getParticles()) {
      particle.update(dt, frameCount);
    }

    // 更新敌人生成
    this.enemySpawnSystem.update(dt, frameCount);

    // 更新Boss
    this.bossSystem.update(dt, frameCount);

    // 更新伤害检测
    this.damageSystem.update(dt, frameCount);

    // 更新玩家实体（包括无敌计时器递减）
    const player = this.entities.getPlayer();
    if (player) {
      player.update(dt, frameCount);
    }

    this._updateMissileAutoReload();

    // 更新无敌计时器（用于渲染闪烁效果）
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }

    // 检查波次进度
    this._checkWaveProgress();
  }

  /**
   * 渲染
   */
  _render(dt, frameCount) {
    const state = this.engine.getState();

    if (state === GAME_FLOW_STATE.MENU) {
      this._renderMenu();
    } else if (state === GAME_FLOW_STATE.SHIP_SELECT) {
      this._renderShipSelect();
    } else if (state === GAME_FLOW_STATE.INSTRUCTIONS) {
      this._renderInstructions();
    } else if (state === GAME_FLOW_STATE.PLAYING || state === ENGINE_STATE.PAUSED) {
      this._renderGame();
    } else if (state === GAME_FLOW_STATE.GAME_OVER) {
      this._renderGameOver();
    } else if (state === GAME_FLOW_STATE.VICTORY) {
      this._renderVictory();
    }
  }

  /**
   * 渲染菜单
   */
  _renderMenu() {
    const W = 40;
    let out = '\x1b[2J\x1b[H';
    out += '\n';
    out += `${COLORS.bold}  ╔${'═'.repeat(W)}╗\n`;
    out += `  ║${this._center('★ 星 际 猎 手 ★', W)}║\n`;
    out += `  ║${this._center('S T A R   H U N T E R', W)}║\n`;
    out += `  ╚${'═'.repeat(W)}╝${COLORS.reset}\n`;

    const items = ['开始游戏', '选择战机', '游戏说明', '退出游戏'];
    for (let i = 0; i < items.length; i++) {
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? `${COLORS.bold}▶ ` : '  ';
      const text = isSelected ? `${COLORS.bold}${items[i]}${COLORS.reset}` : `${COLORS.dim}${items[i]}${COLORS.reset}`;
      out += `\n  ${prefix}${text}`;
    }

    out += `\n\n${COLORS.dim}  ↑↓ 选择 | Enter 确认${COLORS.reset}`;
    this.stdout.write(out);
  }

  /**
   * 渲染战机选择
   */
  _renderShipSelect() {
    const W = 70;
    let out = '\x1b[2J\x1b[H';
    out += `\n${COLORS.bold}  ╔${'═'.repeat(W)}╗${COLORS.reset}\n`;
    out += `  ║${this._center('【 选 择 你 的 战 机 】', W)}║\n`;
    out += `  ╚${'═'.repeat(W)}╝${COLORS.reset}\n`;

    const colWidth = 22;
    const pad = (line) => line + ' '.repeat(colWidth - this._strWidth(this._stripAnsi(line)));
    const buildShipCard = (idx) => {
      const ship = SHIPS[idx];
      const isSelected = idx === this.selectedShip;
      const style = isSelected ? COLORS.bold : COLORS.dim;
      const prefix = isSelected ? '▶ ' : '  ';
      return [
        `${style}${prefix}[${idx + 1}] ${ship.name}${COLORS.reset}`,
        `${style}${ship.art[0]}${COLORS.reset}`,
        `${style}${ship.art[1]}${COLORS.reset}`,
        `${style}${ship.art[2]}${COLORS.reset}`
      ];
    };
    const renderCardRow = (indices) => {
      const cards = indices.map(buildShipCard);
      for (let line = 0; line < cards[0].length; line++) {
        out += cards.map(card => pad(card[line])).join('  ') + '\n';
      }
      out += '\n';
    };

    out += '\n';
    renderCardRow([0, 1, 2]);
    renderCardRow([3, 4, 5]);

    const ship = SHIPS[this.selectedShip];
    out += `\n${COLORS.bold}  当前选择: [${this.selectedShip + 1}] ${ship.name} - ${ship.description}${COLORS.reset}\n`;
    out += `\n  ${COLORS.bold}HP: ${ship.hp}  速度: ${ship.speed === 3 ? '极快' : ship.speed === 2 ? '快' : '中'}  攻击: ${ship.attack}  防御: ${Math.floor(ship.defense * 100)}%${COLORS.reset}`;
    out += `\n  ${COLORS.dim}射速: ${ship.fireRate}  特殊: ${ship.description}${COLORS.reset}`;
    out += `\n\n  ${COLORS.dim}←→↑↓ 切换 | Enter 确认 | ESC 返回${COLORS.reset}`;

    this.stdout.write(out);
  }

  /**
   * 渲染游戏说明
   */
  _renderInstructions() {
    const W = 60;
    let out = '\x1b[2J\x1b[H';
    out += `\n${COLORS.bold}  ╔${'═'.repeat(W)}╗${COLORS.reset}\n`;
    out += `  ║${this._center('【 游 戏 说 明 】', W)}║\n`;
    out += `  ╚${'═'.repeat(W)}╝${COLORS.reset}\n`;

    out += `\n${COLORS.bold}  【操作】${COLORS.reset}`;
    out += `\n  ${COLORS.bold}↑↓←→${COLORS.reset} 或 ${COLORS.bold}WASD${COLORS.reset} 移动`;
    out += `\n  ${COLORS.bold}空格${COLORS.reset} 射击 | ${COLORS.bold}Q${COLORS.reset} 导弹 | ${COLORS.bold}E${COLORS.reset} 护盾 | ${COLORS.bold}P${COLORS.reset} 暂停\n`;

    out += `\n${COLORS.bold}  【道具】${COLORS.reset}`;
    out += `\n  ${COLORS.bold}★${COLORS.reset} 导弹-战机特化 | ${COLORS.bold}⊙${COLORS.reset} 护盾-抵挡伤害`;
    out += `\n  ${COLORS.bold}✦${COLORS.reset} 无敌-3秒闪烁 | ${COLORS.bold}»${COLORS.reset} 追踪导弹-锁定敌机 | ${COLORS.bold}♥${COLORS.reset} 生命-恢复HP\n`;

    out += `\n${COLORS.bold}  【战机】${COLORS.reset}`;
    out += `\n  ${COLORS.bold}[1]${COLORS.reset}突击型 双发 | ${COLORS.bold}[2]${COLORS.reset}平衡型 三发`;
    out += `\n  ${COLORS.bold}[3]${COLORS.reset}狙击型 穿透 | ${COLORS.bold}[4]${COLORS.reset}防御型 自愈`;
    out += `\n  ${COLORS.bold}[5]${COLORS.reset}疾风型 极速 | ${COLORS.bold}[6]${COLORS.reset}终极型 全能\n`;

    out += `\n${COLORS.bold}  【目标】${COLORS.reset}`;
    out += `\n  击败6个BOSS即可通关！\n`;

    out += `\n  ${COLORS.dim}按 ESC 返回${COLORS.reset}`;

    this.stdout.write(out);
  }

  /**
   * 渲染游戏画面
   */
  _renderGame() {
    const player = this.entities.getPlayer();
    const ship = SHIPS[this.selectedShip];

    // 清除并重绘背景
    let out = '\x1b[2J\x1b[H';  // Clear screen
    this.renderer.clear();
    renderStarfield(this.renderer, this.backgroundOffset);

    // 渲染敌人
    for (const enemy of this.entities.getEnemies()) {
      renderEnemy(this.renderer, enemy);
    }

    // 渲染Boss
    if (this.entities.getBoss()) {
      renderBoss(this.renderer, this.entities.getBoss());
    }

    // 渲染道具
    for (const powerup of this.entities.getPowerups()) {
      renderPowerup(this.renderer, powerup);
    }

    // 渲染子弹
    for (const bullet of this.entities.getBullets()) {
      renderBullet(this.renderer, bullet);
    }

    // 渲染粒子
    for (const particle of this.entities.getParticles()) {
      renderParticle(this.renderer, particle);
    }

    // 渲染玩家
    if (player) {
      renderPlayer(this.renderer, player, ship.art, this.invincibleTimer);
      renderShield(this.renderer, player, player.width);
    }

    // 渲染Banner覆盖层
    if (this.banner.isActive()) {
      this.banner.render(this.renderer.buffer);
    }

    // 渲染Modal覆盖层
    if (this.modal.isActive()) {
      this.modal.render(this.renderer.buffer);
    }

    // 输出到终端
    out += this.renderer.toString();

    // 添加HUD
    out += this.hud.renderToString(this._buildHudDefinition(player, this.entities.getBoss()));

    this.stdout.write(out);
  }

  /**
   * 渲染游戏结束
   */
  _renderGameOver() {
    const W = 36;
    let out = '\x1b[2J\x1b[H';
    out += '\n';
    out += `${COLORS.bold}  ╔${'═'.repeat(W)}╗\n`;
    out += `  ║${this._center('【 G A M E  O V E R 】', W)}║\n`;
    out += `  ║${this._center('游 戏 结 束', W)}║\n`;
    out += `  ╠${'═'.repeat(W)}╣\n`;
    out += `  ║${this._center(`最终得分: ${this.score.toString().padStart(10, '0')}`, W)}║\n`;
    out += `  ║${this._center(`到达波次: ${this.wave}/6`, W)}║\n`;
    out += `  ╚${'═'.repeat(W)}╝${COLORS.reset}\n`;

    const items = ['重新开始', '返回菜单', '退出游戏'];
    for (let i = 0; i < items.length; i++) {
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? `${COLORS.bold}▶ ` : '  ';
      const text = isSelected ? `${COLORS.bold}${items[i]}${COLORS.reset}` : `${COLORS.dim}${items[i]}${COLORS.reset}`;
      out += `\n  ${prefix}${text}`;
    }
    out += `\n\n${COLORS.dim}  ↑↓ 选择 | Enter 确认${COLORS.reset}`;

    this.stdout.write(out);
  }

  /**
   * 渲染胜利
   */
  _renderVictory() {
    const W = 36;
    let out = '\x1b[2J\x1b[H';
    out += '\n';
    out += `${COLORS.bold}  ╔${'═'.repeat(W)}╗\n`;
    out += `  ║${this._center('★ 胜 利 ★', W)}║\n`;
    out += `  ║${this._center('恭 喜 通 关', W)}║\n`;
    out += `  ╠${'═'.repeat(W)}╣\n`;
    out += `  ║${this._center(`最终得分: ${this.score.toString().padStart(10, '0')}`, W)}║\n`;
    out += `  ║${this._center(`使用战机: ${SHIPS[this.selectedShip].name}`, W)}║\n`;
    out += `  ╚${'═'.repeat(W)}╝${COLORS.reset}\n`;

    out += `\n  你已击败所有BOSS！`;
    out += `\n  你是真正的星际猎手！\n`;

    const items = ['再来一局', '返回菜单', '退出游戏'];
    for (let i = 0; i < items.length; i++) {
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? `${COLORS.bold}▶ ` : '  ';
      const text = isSelected ? `${COLORS.bold}${items[i]}${COLORS.reset}` : `${COLORS.dim}${items[i]}${COLORS.reset}`;
      out += `\n  ${prefix}${text}`;
    }
    out += `\n\n${COLORS.dim}  ↑↓ 选择 | Enter 确认${COLORS.reset}`;

    this.stdout.write(out);
  }

  /**
   * 辅助方法：居中字符串
   */
  _center(str, width) {
    const sWidth = this._strWidth(str);
    const padding = width - sWidth;
    const left = Math.floor(padding / 2);
    return ' '.repeat(left) + str + ' '.repeat(padding - left);
  }

  /**
   * 辅助方法：计算字符串显示宽度
   */
  _strWidth(str) {
    if (!str) return 0;
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  /**
   * 辅助方法：移除ANSI颜色代码
   */
  _stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * 更新玩家输入
   */
  _updatePlayerInput() {
    const player = this.entities.getPlayer();
    if (!player) return;

    let dx = 0, dy = 0;
    if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('w')) dy -= 1;
    if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('s')) dy += 1;
    if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('a')) dx -= 1;
    if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('d')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      player.move(dx, dy, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  /**
   * 更新玩家射击
   */
  _updatePlayerShooting() {
    const player = this.entities.getPlayer();
    if (!player) return;

    if (this.keysPressed.has(' ') && player.canShoot()) {
      player.resetShotCooldown();
      this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'shoot');
      const bullets = Bullet.createPlayerBullet(
        player.x + Math.floor(player.width / 2),
        player.y,
        player.bulletType,
        player.attack
      );
      for (const bullet of bullets) {
        this.entities.create('bullet', bullet);
      }
    }
  }

  /**
   * 检查波次进度
   */
  _checkWaveProgress() {
    if (this.enemySpawnSystem.bossSpawned) return;
    if (this._showingBossWarning) return;

    const enemies = this.entities.getEnemies();
    const waveInfo = this.enemySpawnSystem.getWaveInfo();

    if (waveInfo.enemiesKilled >= waveInfo.totalEnemies && enemies.length === 0) {
      // 标记为正在显示警告，防止重复触发
      this._showingBossWarning = true;
      
      // 获取Boss配置
      const bossConfig = require('./configs/bosses').BOSSES[this.wave - 1];
      if (bossConfig) {
        // 显示Boss警告横幅，横幅消失后再生成Boss
        this.banner.show({
          title: 'BOSS WARNING',
          lines: this._buildBossWarningLines(bossConfig.name, bossConfig.hp, bossConfig.defense, this.wave, bossConfig.subtitle || ''),
          duration: 3000,
          color: COLORS.orange,
          closable: false,
          onClose: () => {
            // 横幅消失后生成Boss
            this.enemySpawnSystem.bossSpawned = true;
            this.bossSystem.spawnBoss(this.wave);
            this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'explode');
            this._showingBossWarning = false;
          }
        });
      } else {
        // 没有配置，直接生成Boss
        this.enemySpawnSystem.bossSpawned = true;
        this.bossSystem.spawnBoss(this.wave);
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'explode');
        this._showingBossWarning = false;
      }
    }
  }

  /**
   * 处理按键
   */
  _handleKey(key, keyInfo) {
    const state = this.engine.getState();

    // 横幅显示时，只有可手动关闭的横幅才能按Enter键关闭
    if (this.banner.isActive() && this.banner.isClosable() && key === 'Enter') {
      this.banner.close();
      return;
    }

    if (state === GAME_FLOW_STATE.MENU) {
      this._handleMenuKey(key);
    } else if (state === GAME_FLOW_STATE.SHIP_SELECT) {
      this._handleShipSelectKey(key);
    } else if (state === GAME_FLOW_STATE.INSTRUCTIONS) {
      this._handleInstructionsKey(key);
    } else if (state === GAME_FLOW_STATE.PLAYING) {
      if (this.modal.isActive()) {
        this._handleModalKey(key);
      } else {
        this._handlePlayingKey(key);
      }
    } else if (state === ENGINE_STATE.PAUSED) {
      this._handleModalKey(key);
    } else if (state === GAME_FLOW_STATE.GAME_OVER || state === GAME_FLOW_STATE.VICTORY) {
      this._handleEndScreenKey(key);
    }
  }

  _handleMenuKey(key) {
    if (key === 'ArrowUp' || key === 'w') {
      this.selectedIndex = (this.selectedIndex - 1 + 4) % 4;
    } else if (key === 'ArrowDown' || key === 's') {
      this.selectedIndex = (this.selectedIndex + 1) % 4;
    } else if (key === 'Enter' || key === ' ') {
      if (this.selectedIndex === 0) {
        this._startGame();
      } else if (this.selectedIndex === 1) {
        this.engine.setState(GAME_FLOW_STATE.SHIP_SELECT);
        this.selectedShip = 0;
      } else if (this.selectedIndex === 2) {
        this.engine.setState(GAME_FLOW_STATE.INSTRUCTIONS);
      } else if (this.selectedIndex === 3) {
        this.cleanup();
        process.exit(0);
      }
    }
  }

  _handleShipSelectKey(key) {
    if (key === 'ArrowUp' || key === 'w') {
      this.selectedShip = (this.selectedShip - 3 + 6) % 6;
    } else if (key === 'ArrowDown' || key === 's') {
      this.selectedShip = (this.selectedShip + 3) % 6;
    } else if (key === 'ArrowLeft' || key === 'a') {
      this.selectedShip = (this.selectedShip - 1 + 6) % 6;
    } else if (key === 'ArrowRight' || key === 'd') {
      this.selectedShip = (this.selectedShip + 1) % 6;
    } else if (key === 'Enter' || key === ' ') {
      this._startGame();
    } else if (key === 'Escape') {
      this.engine.setState(GAME_FLOW_STATE.MENU);
    }
  }

  _handleInstructionsKey(key) {
    if (key === 'Escape' || key === 'q') {
      this.engine.setState(GAME_FLOW_STATE.MENU);
    }
  }

  _handlePlayingKey(key) {
    // 暂停
    if (key === 'p' || key === 'Escape') {
      if (this.engine.isPaused()) return;
      this.engine.pause();
      this.modal.show({
        title: '暂停',
        items: ['继续游戏', '返回菜单', '退出游戏'],
        selectedIndex: 0,
        onSelect: (index) => {
          if (index === 0) {
            this.engine.resume();
            return;
          }

          if (index === 1) {
            this.engine.resume();
            this.engine.setState(GAME_FLOW_STATE.MENU);
            this.selectedIndex = 0;
            return;
          }

          if (this.runtimeOwned) {
            this.cleanup();
            process.exit(0);
          }

          this.engine.resume();
          this.engine.setState(GAME_FLOW_STATE.MENU);
          this.selectedIndex = 0;
        }
      });
      return;
    }

    if (this.engine.isPaused()) return;

    const player = this.entities.getPlayer();
    if (!player) return;

    // 移动 - 直接在按键事件中处理
    if (key === 'ArrowUp' || key === 'w') {
      player.y = Math.max(0, player.y - player.speed);
    } else if (key === 'ArrowDown' || key === 's') {
      player.y = Math.min(GAME_HEIGHT - player.height, player.y + player.speed);
    } else if (key === 'ArrowLeft' || key === 'a') {
      player.x = Math.max(1, player.x - player.speed);
    } else if (key === 'ArrowRight' || key === 'd') {
      player.x = Math.min(GAME_WIDTH - player.width - 1, player.x + player.speed);
    } else if (key === ' ') {
      // 射击
      if (player.canShoot()) {
        player.resetShotCooldown();
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'shoot');
        const bullets = Bullet.createPlayerBullet(
          player.x + Math.floor(player.width / 2),
          player.y,
          player.bulletType,
          player.attack
        );
        for (const bullet of bullets) {
          this.entities.create('bullet', bullet);
        }
      }
    } else if (key === 'q' || key === 'Q') {
      // 释放导弹
      if (this.powerCount > 0) {
        const bullets = this.playerSystem.firePower(this.powerCount);
        this.powerCount--;
        this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'explode');
        for (const bullet of bullets) {
          this.entities.create('bullet', bullet);
        }
      }
    } else if (key === 'e' || key === 'E') {
      // 开关护盾
      player.toggleShield();
      this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, player.shieldActive ? 'powerup' : 'hit');
    }
  }

  _handleModalKey(key) {
    if (key === 'ArrowUp' || key === 'w') {
      this.modal.selectPrev();
    } else if (key === 'ArrowDown' || key === 's') {
      this.modal.selectNext();
    } else if (key === 'Enter' || key === ' ') {
      this.modal.confirm();
    } else if (key === 'Escape' || key === 'p') {
      this.modal.close();
      this.engine.resume();
    }
  }

  _handleEndScreenKey(key) {
    if (key === 'ArrowUp' || key === 'w') {
      this.selectedIndex = (this.selectedIndex - 1 + 3) % 3;
    } else if (key === 'ArrowDown' || key === 's') {
      this.selectedIndex = (this.selectedIndex + 1) % 3;
    } else if (key === 'Enter' || key === ' ') {
      if (this.selectedIndex === 0) {
        this._startGame();
      } else if (this.selectedIndex === 1) {
        this.engine.setState(GAME_FLOW_STATE.MENU);
        this.selectedIndex = 0;
      } else if (this.selectedIndex === 2) {
        this.cleanup();
        process.exit(0);
      }
    }
  }

  /**
   * 开始游戏
   */
  _startGame() {
    this.engine.setState(GAME_FLOW_STATE.PLAYING);
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.powerCount = Math.min(3, GAME_CONSTANTS.MAX_MISSILES);
    this.invincibleTimer = 0;

    this.entities.clearAll();
    this.enemySpawnSystem.reset();
    this.bossSystem.reset();

    // 创建玩家 - 使用setPlayer保留Player类的方法
    const player = Player.create(this.selectedShip, GAME_WIDTH, GAME_HEIGHT);
    this.entities.setPlayer(player);
    this._syncMissileState(player);

    // 显示第一关剧情
    this._showWaveStory(1, () => {
      // 剧情看完后开始第一波
      this.enemySpawnSystem.startWave(1);
    });
  }

  /**
   * 显示关卡剧情
   */
  _showWaveStory(wave, onComplete) {
    const story = getStoryByWave(wave);
    if (story) {
      this.engine.pause();
      this.banner.show({
        title: story.title,
        lines: story.lines,
        footer: '按 Enter 继续',
        overlay: true,
        onClose: () => {
        this.engine.resume();
        if (onComplete) onComplete();
        }
      });
    } else {
      if (onComplete) onComplete();
    }
  }

  /**
   * 玩家受伤
   */
  _onPlayerDamaged(result) {
    // 已经在DamageSystem中处理
  }

  /**
   * 玩家进入无敌状态
   */
  _onPlayerInvincible(frames) {
    this.invincibleTimer = frames;
    const player = this.entities.getPlayer();
    if (player) {
      player.setInvincible(frames);
    }
  }

  /**
   * 玩家被销毁
   */
  _onPlayerDestroyed() {
    this.lives--;
    if (this.lives <= 0) {
      this.engine.setState(GAME_FLOW_STATE.GAME_OVER);
      this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'gameOver');
    } else {
      // 重生
      const player = Player.create(this.selectedShip, GAME_WIDTH, GAME_HEIGHT);
      this.entities.setPlayer(player);
      this.invincibleTimer = GAME_CONSTANTS.INVINCIBLE_TIMER;
      player.setInvincible(GAME_CONSTANTS.INVINCIBLE_TIMER);
      this.powerCount = Math.min(3, player.missileCapacity || GAME_CONSTANTS.MAX_MISSILES);
      this._syncMissileState(player);
    }
  }

  _syncMissileState(player) {
    this.missileCapacity = player ? (player.missileCapacity || GAME_CONSTANTS.MAX_MISSILES) : GAME_CONSTANTS.MAX_MISSILES;
    this.missileReloadFrames = player && player.missileReloadFrames ? player.missileReloadFrames : null;
    this.missileReloadTimer = 0;
    this.powerCount = Math.min(this.powerCount, this.missileCapacity);
  }

  _updateMissileAutoReload() {
    const player = this.entities.getPlayer();
    if (!player) return;

    this.missileCapacity = player.missileCapacity || GAME_CONSTANTS.MAX_MISSILES;
    this.missileReloadFrames = player.missileReloadFrames || null;
    this.powerCount = Math.min(this.powerCount, this.missileCapacity);

    if (!this.missileReloadFrames || this.missileReloadFrames <= 0) {
      this.missileReloadTimer = 0;
      return;
    }

    if (this.powerCount >= this.missileCapacity) {
      this.missileReloadTimer = 0;
      return;
    }

    this.missileReloadTimer++;

    while (this.missileReloadTimer >= this.missileReloadFrames && this.powerCount < this.missileCapacity) {
      this.missileReloadTimer -= this.missileReloadFrames;
      this.powerCount++;
    }

    if (this.powerCount >= this.missileCapacity) {
      this.missileReloadTimer = 0;
    }
  }

  _getMissileReloadStatus() {
    if (!this.missileReloadFrames || this.missileReloadFrames <= 0) {
      return null;
    }

    if (this.powerCount >= this.missileCapacity) {
      return { percent: 100, full: true };
    }

    return {
      percent: Math.max(0, Math.min(99, Math.floor((this.missileReloadTimer / this.missileReloadFrames) * 100))),
      full: false
    };
  }

  /**
   * 敌人被销毁
   */
  _onEnemyDestroyed(enemy) {
    this.score += enemy.score;
    this.enemySpawnSystem.enemyKilled();
  }

  /**
   * 道具被收集
   */
  _onPowerupCollected(powerup) {
    const powerupType = powerup.powerupType || powerup.type;
    const config = getPowerupConfig(powerupType);
    if (config) {
      const player = this.entities.getPlayer();
      if (powerupType === PowerupType.INVINCIBLE && player) {
        // 无敌道具：同时设置 StarHunter.invincibleTimer 和 Player.invincibleTimer
        this.invincibleTimer = 180;
        player.setInvincible(180);
      } else {
        config.effect(this, (x, y, _isEnemy, bulletType) => {
          const p = this.entities.getPlayer();
          if (p) {
            const bullets = Bullet.createPlayerBullet(
              p.x + p.width / 2,
              p.y - 1,
              bulletType || 'MISSILE',
              10
            );
            for (const b of bullets) {
              this.entities.create('bullet', b);
            }
          }
        });
      }
    }
    this.score += 50;
  }

  /**
   * 波次开始
   */
  _onWaveStart(wave) {
    this.wave = wave;
    // 显示关卡剧情
    this._showWaveStory(wave);
  }

  /**
   * Boss生成
   */
  _onBossSpawn(boss) {
    if (this._showingBossWarning) return;
    this.banner.show({
      title: 'BOSS WARNING',
      lines: this._buildBossWarningLines(boss.name, boss.hp, boss.defense, this.wave, boss.subtitle || ''),
      duration: 3000,
      color: COLORS.orange,
      closable: false
    });
  }

  _buildBossWarningLines(name, hp, defense, wave, subtitle = '') {
    const lines = [
      `Wave ${wave}: ${name}`,
      `HP: ${hp} | Defense: ${Math.floor(defense * 100)}%`
    ];
    if (subtitle) {
      lines.push(subtitle);
    }
    return lines;
  }

  _buildHudDefinition(player, boss) {
    const hpColor = this._getRatioColor(player ? player.hp : 0, player ? player.maxHp : 100);
    const shieldColor = player && player.shieldActive
      ? this._getRatioColor(player.shield, 30, [COLORS.dim, COLORS.brightBlue, COLORS.blue])
      : COLORS.dim;
    const missileReload = this._getMissileReloadStatus();
    const rows = [
      {
        left: [
          { icon: '★', iconColor: COLORS.yellow, bold: true, value: this.score.toString().padStart(10, '0'), valueColor: COLORS.white },
          { label: 'WAVE', value: `${this.wave}/6`, labelColor: COLORS.magenta, valueColor: COLORS.white },
          { label: 'ENEMIES', value: `${this.enemySpawnSystem.waveEnemiesKilled}/${this.enemySpawnSystem.waveTotalEnemies}`, labelColor: COLORS.cyan, valueColor: COLORS.white }
        ],
        right: boss ? [
          { label: 'BOSS', value: boss.name, labelColor: COLORS.red, valueColor: COLORS.white },
          { bar: { current: boss.hp, max: boss.maxHp, width: 10, color: this._getRatioColor(boss.hp, boss.maxHp) } },
          { text: `${Math.floor((boss.hp / boss.maxHp) * 100)}%`, color: COLORS.red }
        ] : []
      },
      {
        left: [
          { label: 'HP', labelColor: hpColor, bar: { current: player ? player.hp : 0, max: player ? player.maxHp : 100, width: 10, color: hpColor }, value: `${player ? Math.max(0, player.hp) : 0}/${player ? player.maxHp : 100}`, valueColor: COLORS.white },
          { label: 'SHIELD', labelColor: shieldColor, bar: { current: player ? player.shield : 0, max: 30, width: 6, color: shieldColor }, value: `${player ? player.shield : 0}/30`, valueColor: COLORS.white },
          { label: 'MISSILES', value: `${this.powerCount}/${this.missileCapacity}`, labelColor: COLORS.yellow, valueColor: COLORS.white },
          missileReload ? { text: `↻${missileReload.percent}%`, color: missileReload.full ? COLORS.green : COLORS.yellow } : null
        ],
        right: [
          { label: 'LIVES', value: this.lives, labelColor: COLORS.red, valueColor: COLORS.white },
          this.invincibleTimer > 0 ? { label: 'INV', value: `${Math.ceil(this.invincibleTimer / 20)}s`, labelColor: COLORS.yellow, valueColor: COLORS.white } : null
        ]
      }
    ];

    return {
      title: { text: 'STATUS', color: COLORS.white, bold: true },
      rows
    };
  }

  _getRatioColor(current, max, palette = [COLORS.red, COLORS.yellow, COLORS.green]) {
    if (!max || max <= 0) {
      return palette[0];
    }

    const ratio = current / max;
    if (ratio > 0.5) return palette[2];
    if (ratio > 0.25) return palette[1];
    return palette[0];
  }

  /**
   * Boss被击败
   */
  _onBossDefeated() {
    if (this._bossTransition) return;

    this.score += 5000;
    this.enemySpawnSystem.bossDefeated();
    this.eventBus.emit(STAR_HUNTER_EVENTS.PLAY_SOUND, 'victory');
    this._startBossTransition();
  }

  /**
   * Boss阶段变化
   */
  _onBossPhaseChange(boss) {
    const particles = createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 'large');
    for (const p of particles) {
      this.entities.create('particle', p);
    }
  }

  /**
   * 游戏结束
   */
  /**
   * 播放音效
   */
  _playSound(type) {
    try {
      this.stdout.write('\x07');
    } catch (e) {}
  }

  /**
   * 开始Boss击败后的过渡动画
   */
  _startBossTransition() {
    const player = this._getOrRestoreTransitionPlayer();
    if (!player) return;

    this._bossTransition = {
      phase: 'explosion',
      timer: 40,
      exitSpeed: Math.max(1.1, player.speed * 0.8),
      nextWave: this.wave + 1
    };

    // 清理敌方残余弹幕，保留我方子弹继续飞出屏幕
    const bullets = this.entities.getBullets();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (bullet.isEnemy) {
        bullets.splice(i, 1);
      } else if (bullet.homing) {
        bullet.target = null;
      }
    }
    this.entities.getEnemies().length = 0;
    this.entities.getPowerups().length = 0;
  }

  /**
   * 更新Boss击败过渡动画
   */
  _updateBossTransition(dt, frameCount) {
    const transition = this._bossTransition;
    if (!transition) return;

    this.backgroundOffset = advanceStarfield(this.backgroundOffset);

    for (const particle of this.entities.getParticles()) {
      particle.update(dt, frameCount);
    }

    this.damageSystem.updateBullets(dt, frameCount);

    const player = this._getOrRestoreTransitionPlayer();
    if (transition.phase === 'explosion') {
      transition.timer--;
      if (transition.timer <= 0) {
        transition.phase = 'exit';
      }
      return;
    }

    if (player) {
      const sway = Math.sin(frameCount * 0.18) * 0.25;
      player.y -= transition.exitSpeed;
      player.x = Math.max(1, Math.min(GAME_WIDTH - player.width - 1, player.x + sway));
    }

    if (!player || player.y + player.height < 0) {
      this._finishBossTransition();
    }
  }

  /**
   * 结束Boss过渡，进入下一波
   */
  _finishBossTransition() {
    const transition = this._bossTransition;
    if (!transition) return;

    const player = this._getOrRestoreTransitionPlayer();
    player.active = true;
    player.hp = Math.max(1, player.hp);
    player.x = Math.floor(GAME_WIDTH / 2) - Math.floor(player.width / 2);
    player.y = GAME_HEIGHT - 8;
    player.setInvincible(30);
    this._syncMissileState(player);

    this._bossTransition = null;

    if (transition.nextWave > 6) {
      this.engine.setState(GAME_FLOW_STATE.VICTORY);
      return;
    }

    this.wave = transition.nextWave;
    this.enemySpawnSystem.startWave(this.wave);
  }

  _getOrRestoreTransitionPlayer() {
    let player = this.entities.getPlayer();
    if (!player || !player.active || player.hp <= 0) {
      player = Player.create(this.selectedShip, GAME_WIDTH, GAME_HEIGHT);
      player.setInvincible(30);
      this.entities.setPlayer(player);
      this._syncMissileState(player);
    } else {
      player.active = true;
      if (!Number.isFinite(player.hp) || player.hp <= 0) {
        player.hp = Math.max(1, player.maxHp || 1);
      }
    }

    return player;
  }

  /**
   * 清理终端
   */
  cleanup() {
    while (this._cleanupTasks.length > 0) {
      const task = this._cleanupTasks.pop();
      if (typeof task === 'function') {
        task();
      }
    }

    if (this.engine.unregisterSystemsByOwner) {
      this.engine.unregisterSystemsByOwner(this);
    } else {
      this.engine.unregisterSystem(this._updateSystem);
    }
    this.engine.onRender(null);

    if (this.runtimeOwned) {
      this.input.cleanup();
      this.engine.stop();
    }
  }
}

// 导出
module.exports = { StarHunter };
