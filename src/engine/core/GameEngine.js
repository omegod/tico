/**
 * GameEngine - 20FPS游戏循环 + 状态机
 * CLI游戏引擎核心
 */

const { EventBus } = require('./EventBus');
const { EngineTime } = require('./EngineTime');

const GAME_STATE = {
  BOOT: 'boot',
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused'
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
    this.time = options.time || new EngineTime();
    this.systems = [];
    this._systemEntries = [];
    this._nextSystemId = 1;
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
    this.time.initialize(this.lastFrameTime);
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
    if (this.time) {
      this.time.clear();
    }
    this.eventBus.clear();
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (this.state === GAME_STATE.BOOT || this.state === GAME_STATE.STOPPED || this.state === GAME_STATE.PAUSED) {
      return;
    }

    this.previousState = this.state;
    this.state = GAME_STATE.PAUSED;
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (this.state !== GAME_STATE.PAUSED) return;

    this.state = this.previousState || GAME_STATE.RUNNING;
    this.previousState = null;
  }

  /**
   * 切换暂停状态
   */
  togglePause() {
    if (this.state !== GAME_STATE.PAUSED && this.state !== GAME_STATE.STOPPED && this.state !== GAME_STATE.BOOT) {
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
    return oldState;
  }

  /**
   * 注册游戏系统
   * @param {Object} system - 系统对象，需要有 update(dt) 方法
   */
  registerSystem(system, options = {}) {
    if (!system || this._findSystemEntry(system)) return system;

    const entry = {
      id: options.id || system.id || `system:${this._nextSystemId++}`,
      owner: options.owner !== undefined ? options.owner : (system.owner || null),
      priority: this._resolveSystemPriority(system, options),
      enabled: options.enabled !== undefined ? options.enabled !== false : system.enabled !== false,
      order: this._systemEntries.length,
      system
    };

    this._systemEntries.push(entry);
    this._refreshSystems();
    this._callSystemHook(entry, 'onAttach');
    if (entry.enabled) {
      this._callSystemHook(entry, 'onEnable');
    }
    return system;
  }

  /**
   * 注销游戏系统
   * @param {Object} system - 系统对象
   */
  unregisterSystem(system) {
    const entry = this._findSystemEntry(system);
    if (!entry) return;

    if (entry.enabled) {
      this._callSystemHook(entry, 'onDisable');
    }
    this._callSystemHook(entry, 'onDetach');
    this._systemEntries = this._systemEntries.filter((item) => item !== entry);
    this._refreshSystems();
  }

  unregisterSystemsByOwner(owner) {
    if (owner === undefined || owner === null) return 0;

    const entries = this._systemEntries.filter((entry) => entry.owner === owner);
    if (!entries.length) return 0;

    for (const entry of entries) {
      if (entry.enabled) {
        this._callSystemHook(entry, 'onDisable');
      }
      this._callSystemHook(entry, 'onDetach');
    }

    this._systemEntries = this._systemEntries.filter((entry) => entry.owner !== owner);
    this._refreshSystems();
    return entries.length;
  }

  setSystemEnabled(system, enabled) {
    const entry = this._findSystemEntry(system);
    if (!entry) return false;

    const nextEnabled = enabled !== false;
    if (entry.enabled === nextEnabled) {
      return false;
    }

    entry.enabled = nextEnabled;
    if (nextEnabled) {
      this._callSystemHook(entry, 'onEnable');
    } else {
      this._callSystemHook(entry, 'onDisable');
    }
    return true;
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
    for (const entry of this._systemEntries) {
      if (!entry.enabled) continue;
      if (entry.system.fixedUpdate) {
        entry.system.fixedUpdate(step, this.frameCount);
      }
    }
  }

  _runFrameUpdate(deltaTime, alpha) {
    if (this.state === GAME_STATE.PAUSED || this.state === GAME_STATE.STOPPED) {
      return;
    }

    for (const entry of this._systemEntries) {
      if (!entry.enabled) continue;
      if (entry.system.update) {
        entry.system.update(deltaTime, this.frameCount, { alpha });
      }
    }
  }

  _resolveSystemPriority(system, options) {
    if (Number.isFinite(options.priority)) {
      return options.priority;
    }
    if (Number.isFinite(system.priority)) {
      return system.priority;
    }
    return 0;
  }

  _findSystemEntry(system) {
    return this._systemEntries.find((entry) => entry.system === system) || null;
  }

  _refreshSystems() {
    this._systemEntries.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.order - b.order;
    });
    this.systems = this._systemEntries.map((entry) => entry.system);
  }

  _callSystemHook(entry, hookName) {
    if (!entry || !entry.system || typeof entry.system[hookName] !== 'function') {
      return;
    }
    entry.system[hookName](this, {
      id: entry.id,
      owner: entry.owner,
      priority: entry.priority,
      enabled: entry.enabled
    });
  }

  /**
   * 主循环
   */
  loop() {
    if (!this.running) return;

    const currentTime = Date.now();
    const rawDelta = currentTime - this.lastFrameTime;
    const clampedDelta = Math.min(rawDelta, this.maxDelta);
    const paused = this.state === GAME_STATE.PAUSED || this.state === GAME_STATE.STOPPED;
    const deltaTime = paused ? 0 : clampedDelta * this.timeScale;

    // 更新帧计数
    this.frameCount++;

    this.accumulator += deltaTime;

    while (!paused && this.accumulator >= this.fixedDelta) {
      this._runFixedUpdate(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    const alpha = !paused && this.fixedDelta > 0 ? this.accumulator / this.fixedDelta : 0;
    this.time.advance({
      now: currentTime,
      delta: deltaTime,
      unscaledDelta: clampedDelta,
      fixedDelta: this.fixedDelta,
      alpha,
      frame: this.frameCount,
      paused
    });
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
    return this.state !== GAME_STATE.BOOT && this.state !== GAME_STATE.STOPPED;
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
    return this.state !== GAME_STATE.BOOT &&
      this.state !== GAME_STATE.STOPPED &&
      this.state !== GAME_STATE.PAUSED;
  }
}

module.exports = { GameEngine, GAME_STATE };
