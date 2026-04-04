class Camera2D {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.viewportWidth = options.viewportWidth || null;
    this.viewportHeight = options.viewportHeight || null;
    this.target = null;
    this.deadZone = options.deadZone || null;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    return this;
  }

  follow(target, options = {}) {
    this.target = target;
    this.deadZone = options.deadZone || this.deadZone;
    return this;
  }

  unfollow() {
    this.target = null;
    return this;
  }

  update() {
    if (!this.target) return;

    const targetX = this.target.x || 0;
    const targetY = this.target.y || 0;

    if (!this.deadZone || !this.viewportWidth || !this.viewportHeight) {
      this.x = Math.floor(targetX - this.viewportWidth / 2);
      this.y = Math.floor(targetY - this.viewportHeight / 2);
      return;
    }

    const left = this.x + this.deadZone.x;
    const right = left + this.deadZone.width;
    const top = this.y + this.deadZone.y;
    const bottom = top + this.deadZone.height;

    if (targetX < left) this.x = Math.floor(targetX - this.deadZone.x);
    if (targetX > right) this.x = Math.floor(targetX - this.deadZone.x - this.deadZone.width);
    if (targetY < top) this.y = Math.floor(targetY - this.deadZone.y);
    if (targetY > bottom) this.y = Math.floor(targetY - this.deadZone.y - this.deadZone.height);
  }
}

module.exports = { Camera2D };
