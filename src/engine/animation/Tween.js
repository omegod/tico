const EASING = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
};

class Tween {
  constructor(target, property, to, duration, options = {}) {
    this.target = target;
    this.property = property;
    this.from = options.from !== undefined ? options.from : Number(target[property] || 0);
    this.to = Number(to);
    this.duration = Math.max(1, duration || 1);
    this.elapsed = 0;
    this.easing = typeof options.easing === 'function' ? options.easing : EASING[options.easing || 'linear'];
    this.onComplete = options.onComplete || null;
    this.finished = false;
  }

  update(dt) {
    if (this.finished) return true;

    this.elapsed += dt;
    const ratio = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const eased = this.easing ? this.easing(ratio) : ratio;
    this.target[this.property] = this.from + (this.to - this.from) * eased;

    if (ratio >= 1) {
      this.target[this.property] = this.to;
      this.finished = true;
      if (this.onComplete) {
        this.onComplete(this.target);
      }
      return true;
    }

    return false;
  }
}

module.exports = { Tween, EASING };
