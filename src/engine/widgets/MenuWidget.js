const { Widget } = require('./Widget');
const {
  normalizeLines,
  styleText,
  alignText,
  measureText
} = require('../layout');

class MenuWidget extends Widget {
  constructor(options = {}) {
    super(options);
    this.items = normalizeLines(options.items);
    this.selectedIndex = Math.max(0, Number(options.selectedIndex) || 0);
    this.selectedPrefix = options.selectedPrefix == null ? ' ▸ ' : String(options.selectedPrefix);
    this.unselectedPrefix = options.unselectedPrefix == null ? '   ' : String(options.unselectedPrefix);
    this.align = options.align || 'left';
    this.itemColor = options.itemColor || null;
    this.selectedColor = options.selectedColor || this.itemColor;
    this.selectedBold = options.selectedBold !== false;
  }

  measure() {
    const widths = this.items.map((item, index) => measureText(`${index === this.selectedIndex ? this.selectedPrefix : this.unselectedPrefix}${item}`));
    return {
      width: widths.length ? Math.max(...widths) : 0,
      height: this.items.length
    };
  }

  render(width = null) {
    const targetWidth = width == null ? this.measure().width : width;
    return this.items.map((item, index) => {
      const selected = index === this.selectedIndex;
      const prefix = selected ? this.selectedPrefix : this.unselectedPrefix;
      return styleText(
        alignText(`${prefix}${item}`, targetWidth, this.align),
        {
          color: selected ? this.selectedColor : this.itemColor,
          bold: selected && this.selectedBold
        }
      );
    });
  }
}

module.exports = { MenuWidget };
