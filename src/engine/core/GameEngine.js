/**
 * GameEngine - 20FPS游戏循环 + 状态机
 * CLI游戏引擎核心
 */

const { EventBus, GameEvents } = require('./EventBus');

const GAME_STATE = {
  BOOT: 'boot',
  RUNNING: 'running',
  STOPPED: 'stopped',
  MENU: 'menu',
  SHIP_SELECT: 'shipSelect',
  INSTRUCTIONS: 'instructions',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
  VICTORY: 'victory'
};

class GameEngine {
  constructor(options = {}) {
    this.width = options.width || 80;
    this.height = options.height || 32;
    this.frameRate = options.frameRate || 50; // legacy name, measured in ms
    this.frameDuration = options.frameDuration || this.frameRate;
    this.fixedDelta = options.fixedDelta || this.frameDuration;
    this.maxDelta = options.maxDelta || 250;
    this.timeScale = options.timeScale || 1;

    this.state = options.initialState || GAME_STATE.BOOT;
    this.previousState = null;
    this.running = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.accumulator = 0;

    this.eventBus = options.eventBus || new EventBus();
    this.systems = [];
    this.entities = null; // EntityManager
    this.renderCallback = null; // 每帧渲染回调

    this.loopTimeout = null;
  }

  /**
   * 注册渲染回调，每帧调用
   */
  onRender(callback) {
    this.renderCallback = callback;
  }

  /**
   * 初始化引擎
   */
  init() {
    this.running = true;
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
    this.accumulator = 0;
    this.eventBus.emit(GameEvents.GAME_START, { timestamp: this.lastFrameTime });
  }

  /**
   * 停止引擎
   */
  stop() {
    this.running = false;
    this.state = GAME_STATE.STOPPED;
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.eventBus.clear();
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.RUNNING) {
      this.previousState = this.state;
      this.state = GAME_STATE.PAUSED;
      this.eventBus.emit(GameEvents.GAME_PAUSE, {});
    }
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (this.state === GAME_STATE.PAUSED && this.previousState) {
      this.state = this.previousState;
      this.previousState = null;
      this.eventBus.emit(GameEvents.GAME_RESUME, {});
    }
  }

  /**
   * 切换暂停状态
   */
  togglePause() {
    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.RUNNING) {
      this.pause();
    } else if (this.state === GAME_STATE.PAUSED) {
      this.resume();
    }
  }

  /**
   * 设置游戏状态
   * @param {string} newState - 新状态
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    // 状态转换事件
    if (newState === GAME_STATE.GAME_OVER) {
      this.eventBus.emit(GameEvents.GAME_OVER, { score: 0 });
    } else if (newState === GAME_STATE.VICTORY) {
      this.eventBus.emit(GameEvents.VICTORY, { score: 0 });
    }

    return oldState;
  }

  /**
   * 注册游戏系统
   * @param {Object} system - 系统对象，需要有 update(dt) 方法
   */
  registerSystem(system) {
    if (!system || this.systems.includes(system)) return;
    this.systems.push(system);
  }

  /**
   * 注销游戏系统
   * @param {Object} system - 系统对象
   */
  unregisterSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  /**
   * 设置实体管理器
   * @param {EntityManager} entityManager - 实体管理器
   */
  setEntityManager(entityManager) {
    this.entities = entityManager;
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0, scale);
  }

  setFixedDelta(delta) {
    this.fixedDelta = Math.max(1, delta);
  }

  _runFixedUpdate(step) {
    for (const system of this.systems) {
      if (system.fixedUpdate) {
        system.fixedUpdate(step, this.frameCount);
      }
    }
  }

  _runFrameUpdate(deltaTime, alpha) {
    if (this.state === GAME_STATE.PAUSED || this.state === GAME_STATE.STOPPED) {
      return;
    }

    for (const system of this.systems) {
      if (system.update) {
        system.update(deltaTime, this.frameCount, { alpha });
      }
    }
  }

  /**
   * 主循环
   */
  loop() {
    if (!this.running) return;

    const currentTime = Date.now();
    const rawDelta = currentTime - this.lastFrameTime;
    const deltaTime = Math.min(rawDelta, this.maxDelta) * this.timeScale;

    // 更新帧计数
    this.frameCount++;

    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedDelta) {
      this._runFixedUpdate(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    const alpha = this.fixedDelta > 0 ? this.accumulator / this.fixedDelta : 0;
    this._runFrameUpdate(deltaTime, alpha);

    // 每帧调用渲染回调
    if (this.renderCallback) {
      this.renderCallback(deltaTime, this.frameCount, alpha);
    }

    this.lastFrameTime = currentTime;

    this.loopTimeout = setTimeout(() => this.loop(), this.frameDuration);
  }

  /**
   * 开始游戏循环
   */
  startLoop() {
    if (!this.running) {
      this.init();
    }

    if (this.state === GAME_STATE.BOOT) {
      this.state = GAME_STATE.RUNNING;
    }
    this.loop();
  }

  /**
   * 获取当前游戏状态
   */
  getState() {
    return this.state;
  }

  /**
   * 检查是否在可交互状态
   */
  isInteractive() {
    return [GAME_STATE.MENU, GAME_STATE.SHIP_SELECT, GAME_STATE.INSTRUCTIONS,
            GAME_STATE.GAME_OVER, GAME_STATE.VICTORY].includes(this.state);
  }

  /**
   * 检查是否在暂停状态
   */
  isPaused() {
    return this.state === GAME_STATE.PAUSED;
  }

  /**
   * 检查是否在游戏进行状态
   */
  isPlaying() {
    return this.state === GAME_STATE.PLAYING;
  }
}

module.exports = { GameEngine, GAME_STATE };
