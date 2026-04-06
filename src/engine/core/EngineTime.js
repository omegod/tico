const { Sequence } = require('./Sequence');

class EngineTime {
  constructor() {
    this._now = 0;
    this._realNow = 0;
    this._delta = 0;
    this._unscaledDelta = 0;
    this._fixedDelta = 0;
    this._alpha = 0;
    this._frame = 0;
    this._paused = false;
    this._tasks = [];
    this._nextTaskId = 1;
    this._sequences = [];
    this._nextSequenceId = 1;
  }

  initialize(now = Date.now()) {
    this._now = 0;
    this._realNow = now;
    this._delta = 0;
    this._unscaledDelta = 0;
    this._fixedDelta = 0;
    this._alpha = 0;
    this._frame = 0;
    this._paused = false;
    this.clear();
  }

  now() {
    return this._now;
  }

  realNow() {
    return this._realNow;
  }

  delta() {
    return this._delta;
  }

  unscaledDelta() {
    return this._unscaledDelta;
  }

  fixedDelta() {
    return this._fixedDelta;
  }

  alpha() {
    return this._alpha;
  }

  frame() {
    return this._frame;
  }

  isPaused() {
    return this._paused;
  }

  after(delay, callback, options = {}) {
    return this._createTask('timeout', callback, {
      delay,
      scaled: options.scaled !== false,
      owner: options.owner || null
    });
  }

  every(interval, callback, options = {}) {
    return this._createTask('interval', callback, {
      delay: interval,
      interval,
      scaled: options.scaled !== false,
      owner: options.owner || null
    });
  }

  nextFrame(callback, options = {}) {
    return this._createTask('frame', callback, {
      owner: options.owner || null,
      frames: 1
    });
  }

  createSequence(options = {}) {
    const sequence = new Sequence(this, options);
    this._sequences.push(sequence);
    return sequence;
  }

  cancel(handleOrId) {
    const task = this._resolveTask(handleOrId);
    if (!task) return false;
    task.active = false;
    this._prune();
    return true;
  }

  cancelByOwner(owner) {
    let cancelled = 0;
    for (const task of this._tasks) {
      if (task.owner === owner) {
        task.active = false;
        cancelled++;
      }
    }
    for (const sequence of [...this._sequences]) {
      if (sequence.owner === owner && sequence.cancel()) {
        cancelled++;
      }
    }
    if (cancelled > 0) {
      this._prune();
    }
    return cancelled;
  }

  clear() {
    this._tasks = [];
    for (const sequence of this._sequences) {
      sequence._dispose();
    }
    this._sequences = [];
  }

  advance(options = {}) {
    const {
      now = Date.now(),
      delta = 0,
      unscaledDelta = delta,
      fixedDelta = 0,
      alpha = 0,
      frame = this._frame + 1,
      paused = false
    } = options;

    this._realNow = now;
    this._delta = Math.max(0, delta);
    this._unscaledDelta = Math.max(0, unscaledDelta);
    this._fixedDelta = Math.max(0, fixedDelta);
    this._alpha = Math.max(0, alpha);
    this._frame = frame;
    this._paused = paused;

    if (!paused) {
      this._now += this._delta;
    }

    if (!this._tasks.length) return;

    for (const task of this._tasks) {
      if (!task.active) continue;

      if (task.type === 'frame') {
        task.remainingFrames -= 1;
        if (task.remainingFrames <= 0) {
          this._runTask(task);
        }
        continue;
      }

      const step = task.scaled ? this._delta : this._unscaledDelta;
      if (step <= 0) continue;

      task.remaining -= step;
      while (task.active && task.remaining <= 0) {
        const keepRunning = this._runTask(task);
        if (!keepRunning) break;
        task.remaining += task.interval;
      }
    }

    this._prune();
  }

  _createTask(type, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('EngineTime task callback must be a function');
    }

    const delay = Math.max(0, Number(options.delay) || 0);
    const interval = Math.max(1, Number(options.interval) || delay || 1);
    const task = {
      id: this._nextTaskId++,
      type,
      callback,
      owner: options.owner || null,
      scaled: options.scaled !== false,
      interval,
      remaining: delay,
      remainingFrames: Math.max(1, Number(options.frames) || 1),
      active: true,
      cancel: () => this.cancel(task)
    };

    this._tasks.push(task);
    return task;
  }

  _resolveTask(handleOrId) {
    if (!handleOrId) return null;

    if (typeof handleOrId === 'number') {
      return this._tasks.find((task) => task.id === handleOrId) || null;
    }

    if (typeof handleOrId === 'object' && typeof handleOrId.id === 'number') {
      return this._tasks.find((task) => task.id === handleOrId.id) || null;
    }

    return null;
  }

  _runTask(task) {
    if (!task.active) return false;

    const result = task.callback({
      id: task.id,
      owner: task.owner,
      now: this._now,
      realNow: this._realNow,
      delta: this._delta,
      unscaledDelta: this._unscaledDelta,
      fixedDelta: this._fixedDelta,
      alpha: this._alpha,
      frame: this._frame,
      task
    });

    if (task.type !== 'interval' || result === false) {
      task.active = false;
      return false;
    }

    return true;
  }

  _prune() {
    this._tasks = this._tasks.filter((task) => task.active);
  }

  _detachSequence(sequence) {
    this._sequences = this._sequences.filter((item) => item !== sequence);
  }
}

module.exports = { EngineTime };
