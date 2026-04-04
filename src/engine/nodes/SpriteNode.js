const { Node2D } = require('./Node2D');

class SpriteNode extends Node2D {
  constructor(options = {}) {
    super(options);
    this.art = options.art || ['?'];
    this.color = options.color || null;
    this.bold = options.bold || false;
  }

  render(renderer) {
    const { x, y } = this.getWorldPosition();
    renderer.drawArt(Math.floor(x), Math.floor(y), this.art, this.color, this.bold, this.layer);
  }
}

module.exports = { SpriteNode };
