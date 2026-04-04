class Node2D {
  constructor(options = {}) {
    this.name = options.name || 'Node2D';
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.rotation = options.rotation || 0;
    this.scaleX = options.scaleX === undefined ? 1 : options.scaleX;
    this.scaleY = options.scaleY === undefined ? 1 : options.scaleY;
    this.anchorX = options.anchorX || 0;
    this.anchorY = options.anchorY || 0;
    this.visible = options.visible !== false;
    this.active = options.active !== false;
    this.layer = options.layer || 0;
    this.parent = null;
    this.children = [];
    this.tags = new Set(options.tags || []);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
    return this;
  }

  addChild(node) {
    node.parent = this;
    this.children.push(node);
    return node;
  }

  removeChild(node) {
    const index = this.children.indexOf(node);
    if (index !== -1) {
      this.children.splice(index, 1);
      node.parent = null;
    }
    return node;
  }

  getWorldPosition() {
    if (!this.parent) {
      return { x: this.x, y: this.y };
    }

    const parentPos = this.parent.getWorldPosition();
    return {
      x: parentPos.x + this.x,
      y: parentPos.y + this.y
    };
  }

  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  updateTree(dt, frameCount) {
    if (!this.active) return;
    this.update(dt, frameCount);
    for (const child of this.children) {
      child.updateTree(dt, frameCount);
    }
  }

  renderTree(renderer) {
    if (!this.visible) return;
    this.render(renderer);
    for (const child of this.children) {
      child.renderTree(renderer);
    }
  }

  update() {}

  render() {}
}

module.exports = { Node2D };
