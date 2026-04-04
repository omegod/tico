const { Node2D } = require('./Node2D');

class TilemapNode extends Node2D {
  constructor(options = {}) {
    super(options);
    this.tiles = options.tiles || [];
    this.palette = options.palette || {};
    this.defaultLayer = options.layer || 0;
  }

  setTiles(tiles) {
    this.tiles = tiles;
    return this;
  }

  setPalette(palette) {
    this.palette = palette;
    return this;
  }

  render(renderer) {
    const { x, y } = this.getWorldPosition();
    for (let row = 0; row < this.tiles.length; row++) {
      const line = this.tiles[row];
      for (let column = 0; column < line.length; column++) {
        const tile = line[column];
        if (tile === null || tile === undefined || tile === ' ') continue;

        const entry = typeof tile === 'string' ? this.palette[tile] || { char: tile } : tile;
        renderer.drawCell(
          Math.floor(x + column),
          Math.floor(y + row),
          entry.char || ' ',
          entry.color || null,
          entry.bold || false,
          entry.layer || this.defaultLayer
        );
      }
    }
  }
}

module.exports = { TilemapNode };
