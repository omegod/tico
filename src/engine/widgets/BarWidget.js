const { Widget } = require('./Widget');
const { styleText } = require('../layout');
const { repeatChar } = require('../rendering/ScreenBuffer');

class BarWidget extends Widget {
  constructor(options = {}) {
    super(options);
    this.width = Math.max(1, Number(options.width) || 10);
    this.current = options.current;
    this.max = options.max;
    this.value = options.value;
    this.color = options.color || null;
    this.emptyColor = options.emptyColor || null;
    this.bold = Boolean(options.bold);
    this.filledChar = options.filledChar || '█';
    this.emptyChar = options.emptyChar || '░';
  }

  measure() {
    return { width: this.width, height: 1 };
  }

  render() {
    const ratio = this._resolveRatio();
    const filled = Math.max(0, Math.min(this.width, Math.floor(ratio * this.width)));
    const empty = Math.max(0, this.width - filled);
    return [
      `${styleText(repeatChar(this.filledChar, filled), { color: this.color, bold: this.bold })}${styleText(repeatChar(this.emptyChar, empty), { color: this.emptyColor, bold: this.bold })}`
    ];
  }

  _resolveRatio() {
    if (typeof this.value === 'number') {
      return Math.max(0, Math.min(1, this.value));
    }

    const current = Number(this.current);
    const max = Number(this.max);
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, current / max));
  }
}

module.exports = { BarWidget };
