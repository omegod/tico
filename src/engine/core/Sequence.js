class Sequence {
  constructor(time, options = {}) {
    this.time = time;
    this.id = options.id || `sequence:${time._nextSequenceId++}`;
    this.owner = options.owner || null;
    this.defaultScaled = options.scaled !== false;
    this.onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
    this.onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;
    this.steps = [];
    this.index = 0;
    this.active = false;
    this.completed = false;
    this.cancelled = false;
    this.skipped = false;
    this._currentHandle = null;
    this._lastContext = null;
  }

  call(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Sequence call step must be a function');
    }

    this.steps.push({
      type: 'call',
      callback
    });
    return this;
  }

  wait(delay, options = {}) {
    this.steps.push({
      type: 'wait',
      delay: Math.max(0, Number(delay) || 0),
      scaled: options.scaled !== undefined ? options.scaled !== false : this.defaultScaled
    });
    return this;
  }

  start() {
    if (this.active || this.completed || this.cancelled) {
      return this;
    }

    this.active = true;
    this._advance();
    return this;
  }

  cancel() {
    if (!this.active && !this._currentHandle) {
      return false;
    }

    this._clearCurrentHandle();
    this.active = false;
    this.cancelled = true;
    this.time._detachSequence(this);

    if (this.onCancel) {
      this.onCancel(this._createCallbackContext(null, null, { cancelled: true }));
    }

    return true;
  }

  skip() {
    if (this.completed || this.cancelled) {
      return false;
    }

    this.skipped = true;
    this.active = true;
    this._clearCurrentHandle();
    this._advance({ skipped: true, skipWaits: true });
    return true;
  }

  isActive() {
    return this.active;
  }

  _advance(state = {}) {
    const skipWaits = state.skipWaits === true;
    const skipped = state.skipped === true || this.skipped;
    const timerContext = state.context || this._lastContext;

    while (this.active && this.index < this.steps.length) {
      const step = this.steps[this.index++];

      if (step.type === 'wait') {
        if (skipWaits) {
          continue;
        }

        this._currentHandle = this.time.after(
          step.delay,
          (context) => {
            this._currentHandle = null;
            this._lastContext = context;
            this._advance({ context, skipped });
          },
          {
            scaled: step.scaled,
            owner: this
          }
        );
        return;
      }

      step.callback(this._createCallbackContext(timerContext, step, { skipped }));
    }

    if (!this.active) {
      return;
    }

    this.active = false;
    this.completed = true;
    this.time._detachSequence(this);

    if (this.onComplete) {
      this.onComplete(this._createCallbackContext(timerContext, null, { skipped }));
    }
  }

  _createCallbackContext(timerContext, step, overrides = {}) {
    return {
      id: this.id,
      owner: this.owner,
      sequence: this,
      step,
      stepIndex: Math.max(0, this.index - 1),
      skipped: overrides.skipped === true,
      cancelled: overrides.cancelled === true,
      now: timerContext ? timerContext.now : this.time.now(),
      realNow: timerContext ? timerContext.realNow : this.time.realNow(),
      delta: timerContext ? timerContext.delta : this.time.delta(),
      unscaledDelta: timerContext ? timerContext.unscaledDelta : this.time.unscaledDelta(),
      fixedDelta: timerContext ? timerContext.fixedDelta : this.time.fixedDelta(),
      alpha: timerContext ? timerContext.alpha : this.time.alpha(),
      frame: timerContext ? timerContext.frame : this.time.frame()
    };
  }

  _clearCurrentHandle() {
    if (!this._currentHandle) {
      return;
    }

    this.time.cancel(this._currentHandle);
    this._currentHandle = null;
  }

  _dispose() {
    this.active = false;
    this.completed = false;
    this.cancelled = true;
    this._clearCurrentHandle();
  }
}

module.exports = { Sequence };
