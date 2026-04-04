/**
 * InputHandler - 终端按键处理
 * 处理终端输入事件
 */

const readline = require('readline');

class InputHandler {
  constructor(options = {}) {
    this.stdout = process.stdout;
    this.stdin = process.stdin;
    this.keyCallbacks = [];
    this.enabled = false;
    this.rl = null;
    this.pressedKeys = new Set();
    this.lastKey = null;
    this.keyStates = new Map();
    this.actionContexts = new Set();
    this.releaseTimeoutMs = options.releaseTimeoutMs || 180;
    this._keypressHandler = null;
  }

  /**
   * 初始化终端输入
   */
  init() {
    if (this.enabled) return;

    this.rl = readline.createInterface({
      input: this.stdin
    });

    readline.emitKeypressEvents(this.stdin);
    if (this.stdin.isTTY) {
      this.stdin.setRawMode(true);
    }

    this.enabled = true;

    this._keypressHandler = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.cleanup();
        process.exit(0);
      }

      // 转换方向键
      let normalizedKey = key.name;
      if (key.sequence === '\x1b[A') normalizedKey = 'ArrowUp';
      else if (key.sequence === '\x1b[B') normalizedKey = 'ArrowDown';
      else if (key.sequence === '\x1b[C') normalizedKey = 'ArrowRight';
      else if (key.sequence === '\x1b[D') normalizedKey = 'ArrowLeft';
      else if (key.name === 'return') normalizedKey = 'Enter';
      else if (key.name === 'escape') normalizedKey = 'Escape';
      else if (key.name === 'space') normalizedKey = ' ';
      else if (str) normalizedKey = str;

      // 跟踪按下的键
      this.pressedKeys.add(normalizedKey);
      this.lastKey = normalizedKey;
      const state = this.keyStates.get(normalizedKey) || {
        pressed: false,
        justPressed: false,
        justReleased: false,
        lastSeen: 0
      };
      state.justPressed = !state.pressed;
      state.justReleased = false;
      state.pressed = true;
      state.lastSeen = Date.now();
      this.keyStates.set(normalizedKey, state);

      for (const context of this.actionContexts) {
        context._handleKey(normalizedKey);
      }

      this._notifyListeners(normalizedKey, key, 'keypress');
    };

    this.stdin.on('keypress', this._keypressHandler);
  }

  /**
   * 获取当前按下的所有键
   */
  getPressedKeys() {
    return this.pressedKeys;
  }

  /**
   * 释放指定键
   */
  releaseKey(key) {
    this.pressedKeys.delete(key);
  }

  /**
   * 清除所有按下的键
   */
  clearPressedKeys() {
    this.pressedKeys.clear();
    this.keyStates.clear();
  }

  isPressed(key) {
    const state = this.keyStates.get(key);
    return Boolean(state && state.pressed);
  }

  isJustPressed(key) {
    const state = this.keyStates.get(key);
    return Boolean(state && state.justPressed);
  }

  isJustReleased(key) {
    const state = this.keyStates.get(key);
    return Boolean(state && state.justReleased);
  }

  afterFrame(now = Date.now()) {
    for (const [key, state] of this.keyStates) {
      if (state.pressed && now - state.lastSeen > this.releaseTimeoutMs) {
        state.pressed = false;
        state.justReleased = true;
        this.pressedKeys.delete(key);
      } else {
        state.justReleased = false;
      }
      state.justPressed = false;
    }
  }

  createContext(actionMap) {
    const context = new InputActionContext(this, actionMap);
    this.actionContexts.add(context);
    return context;
  }

  removeContext(context) {
    this.actionContexts.delete(context);
  }

  /**
   * 注册按键监听
   * @param {Function} callback - 回调函数 (key, keyInfo) => void
   * @returns {Function} 取消注册的函数
   */
  onKey(callback) {
    this.keyCallbacks.push(callback);
    return () => {
      const index = this.keyCallbacks.indexOf(callback);
      if (index !== -1) {
        this.keyCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器
   */
  _notifyListeners(key, keyInfo) {
    for (const callback of this.keyCallbacks) {
      try {
        callback(key, keyInfo);
      } catch (error) {
        console.error('Error in key callback:', error);
      }
    }
  }

  /**
   * 清理终端设置
   */
  cleanup() {
    if (!this.enabled) return;

    try {
      this.stdout.write('\x1b[?1049l'); // Back to normal buffer
      this.stdout.write('\x1b[?25h'); // Show cursor
      this.stdout.write('\x1b[2J\x1b[H');
    } catch (e) {
      // Ignore cleanup errors
    }

    if (this.stdin.isTTY) {
      this.stdin.setRawMode(false);
    }

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    if (this._keypressHandler) {
      this.stdin.off('keypress', this._keypressHandler);
      this._keypressHandler = null;
    }

    this.enabled = false;
    this.keyCallbacks = [];
    this.keyStates.clear();
    this.actionContexts.clear();
  }

  /**
   * 初始化终端显示
   */
  initTerminal() {
    this.stdout.write('\x1b[?1049h'); // Alternate buffer
    this.stdout.write('\x1b[2J\x1b[H');
    this.stdout.write('\x1b[?25l'); // Hide cursor
  }
}

class InputActionContext {
  constructor(input, actionMap) {
    this.input = input;
    this.actionMap = actionMap;
    this.buffer = new Map();
  }

  _handleKey(key) {
    const action = this.actionMap.getAction(key);
    if (!action) return;
    this.buffer.set(action, (this.buffer.get(action) || 0) + 1);
  }

  consume(action) {
    const count = this.buffer.get(action) || 0;
    if (count <= 0) return false;
    if (count === 1) this.buffer.delete(action);
    else this.buffer.set(action, count - 1);
    return true;
  }

  peek(action) {
    return (this.buffer.get(action) || 0) > 0;
  }

  clear() {
    this.buffer.clear();
  }

  destroy() {
    this.input.removeContext(this);
    this.clear();
  }
}

module.exports = { InputHandler, InputActionContext };
