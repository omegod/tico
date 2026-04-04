const { Tween } = require('./Tween');

class AnimationPlayer {
  constructor() {
    this.tweens = [];
  }

  tween(target, property, to, duration, options = {}) {
    const tween = new Tween(target, property, to, duration, options);
    this.tweens.push(tween);
    return tween;
  }

  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i];
      if (tween.update(dt)) {
        this.tweens.splice(i, 1);
      }
    }
  }

  stopTweensFor(target, property = null) {
    this.tweens = this.tweens.filter((tween) => {
      if (tween.target !== target) return true;
      if (property && tween.property !== property) return true;
      return false;
    });
  }

  clear() {
    this.tweens = [];
  }
}

module.exports = { AnimationPlayer };
