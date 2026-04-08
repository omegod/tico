/**
 * Renderer - ASCII renderer built from generic drawing primitives.
 */

const { ScreenBuffer } = require('./ScreenBuffer');
const { Layer } = require('./Layer');

const RenderSpace = {
  WORLD: 'world',
  SCREEN: 'screen'
};

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgBrightRed: '\x1b[101m',
  bgBrightGreen: '\x1b[102m',
  bgBrightYellow: '\x1b[103m',
  bgBrightBlue: '\x1b[104m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightCyan: '\x1b[106m',
  bgBrightWhite: '\x1b[107m',
  bgDarkGray: '\x1b[48;5;236m',
  bgMediumGray: '\x1b[48;5;238m',
  bgLightGray: '\x1b[48;5;250m',
  selected: '\x1b[1m',
  normal: '',
  inactive: '\x1b[2m',
  border: '\x1b[1m',
  title: '\x1b[1m',
  warning: '\x1b[5m',
  orange: '\x1b[38;5;208m',
  dimYellow: '\x1b[1m',
  darkGray: '\x1b[2m',
  mediumGray: '\x1b[2m'
};

class Renderer {
  constructor(width, height, stdout = process.stdout) {
    this.width = width;
    this.height = height;
    this.stdout = stdout;
    this.buffer = new ScreenBuffer(width, height);
    this.camera = null;
    this.renderSpace = RenderSpace.WORLD;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  getCamera() {
    return this.camera;
  }

  setRenderSpace(space) {
    this.renderSpace = space === RenderSpace.SCREEN ? RenderSpace.SCREEN : RenderSpace.WORLD;
    return this;
  }

  getRenderSpace() {
    return this.renderSpace;
  }

  worldToScreen(x, y) {
    if (!this.camera) {
      return { x, y };
    }

    return {
      x: Math.floor(x - this.camera.x),
      y: Math.floor(y - this.camera.y)
    };
  }

  projectPoint(x, y, space = this.renderSpace) {
    if (space === RenderSpace.SCREEN) {
      return {
        x: Math.floor(x),
        y: Math.floor(y)
      };
    }

    return this.worldToScreen(x, y);
  }

  withRenderSpace(space, callback) {
    const previous = this.renderSpace;
    this.setRenderSpace(space);
    try {
      return callback(this);
    } finally {
      this.setRenderSpace(previous);
    }
  }

  drawCell(x, y, char, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.projectPoint(x, y);
    this.buffer.setCell(projected.x, projected.y, char, color, bold, layer, bgColor);
  }

  drawString(x, y, text, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.projectPoint(x, y);
    this.buffer.drawString(projected.x, projected.y, text, color, bold, layer, bgColor);
  }

  drawText(x, y, lines, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.projectPoint(x, y);
    this.buffer.drawText(projected.x, projected.y, lines, color, bold, layer, bgColor);
  }

  drawArt(x, y, art, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.projectPoint(x, y);
    this.buffer.drawArt(projected.x, projected.y, art, color, bold, layer, bgColor);
  }

  fillRect(x, y, width, height, char = ' ', color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.projectPoint(x, y);
    this.buffer.fillRect(projected.x, projected.y, width, height, char, color, bold, layer, bgColor);
  }

  clear() {
    this.buffer.clear();
  }

  renderSprite(sprite, options = {}) {
    if (!sprite || sprite.active === false) return;

    const art = Array.isArray(options.art) ? options.art : sprite.art;
    if (!Array.isArray(art) || !art.length) return;

    const x = Number.isFinite(options.x) ? options.x : sprite.x;
    const y = Number.isFinite(options.y) ? options.y : sprite.y;
    const layer = options.layer == null ? Layer.BACKGROUND : options.layer;
    const align = options.align === 'center' ? 'center' : 'left';
    const bold = options.bold === true;
    const visible = typeof options.visible === 'function' ? options.visible(sprite) : options.visible !== false;
    if (!visible) return;

    const artWidth = Math.max(...art.map((line) => line.length));
    for (let rowIndex = 0; rowIndex < art.length; rowIndex++) {
      const row = art[rowIndex];
      const offsetX = align === 'center' ? Math.floor((artWidth - row.length) / 2) : 0;

      for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
        const char = row[columnIndex];
        if (char === ' ') continue;

        const color = typeof options.color === 'function'
          ? options.color({
              sprite,
              row: rowIndex,
              column: columnIndex,
              char
            })
          : (options.color || sprite.color || null);

        this.drawCell(
          Math.floor(x) + offsetX + columnIndex,
          Math.floor(y) + rowIndex,
          char,
          color,
          bold,
          layer
        );
      }
    }
  }

  renderGlyph(glyph, options = {}) {
    if (!glyph || glyph.active === false) return;

    const char = options.char || glyph.char;
    if (!char || char === ' ') return;

    const x = Number.isFinite(options.x) ? options.x : glyph.x;
    const y = Number.isFinite(options.y) ? options.y : glyph.y;
    const width = Math.max(1, options.width || glyph.width || 1);
    const height = Math.max(1, options.height || glyph.height || 1);
    const layer = options.layer == null ? Layer.BACKGROUND : options.layer;
    const bold = options.bold === true;
    const color = typeof options.color === 'function' ? options.color(glyph) : (options.color || glyph.color || null);

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.drawCell(Math.floor(x) + dx, Math.floor(y) + dy, char, color, bold, layer);
      }
    }
  }

  present() {
    this.stdout.write('\x1b[2J\x1b[H');
    this.stdout.write(this.buffer.render());
  }

  getBuffer() {
    return this.buffer;
  }

  toString() {
    return this.buffer.render();
  }
}

module.exports = { Renderer, COLORS, Layer, RenderSpace };
