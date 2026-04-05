const { Widget } = require('./Widget');
const {
  normalizeLines,
  measureLines,
  styleText,
  alignText
} = require('../layout');

class TextWidget extends Widget {
  constructor(options = {}) {
    super(options);
    this.lines = normalizeLines(options.lines != null ? options.lines : options.text || '');
    this.align = options.align || 'left';
    this.color = options.color || null;
    this.bold = Boolean(options.bold);
  }

  measure() {
    return measureLines(this.lines);
  }

  render(width = null) {
    const targetWidth = width == null ? this.measure().width : width;
    return this.lines.map((line) => styleText(alignText(line, targetWidth, this.align), {
      color: this.color,
      bold: this.bold
    }));
  }
}

module.exports = { TextWidget };
