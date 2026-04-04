const { Node2D } = require('./Node2D');

class TextNode extends Node2D {
  constructor(options = {}) {
    super(options);
    this.text = options.text || '';
    this.color = options.color || null;
    this.bold = options.bold || false;
  }

  setText(text) {
    this.text = text;
    return this;
  }

  render(renderer) {
    const { x, y } = this.getWorldPosition();
    renderer.drawString(Math.floor(x), Math.floor(y), this.text, this.color, this.bold, this.layer);
  }
}

module.exports = { TextNode };
