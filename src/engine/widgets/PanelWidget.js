const { Widget } = require('./Widget');
const {
  normalizeLines,
  measureLines,
  stackBlocks,
  resolvePosition,
  styleText,
  alignText,
  borderThickness,
  measureText,
  frameMetrics,
  resolveBorder
} = require('../layout');
const { repeatChar } = require('../rendering/ScreenBuffer');

class PanelWidget extends Widget {
  constructor(options = {}) {
    super(options);
    this.width = options.width == null ? null : Number(options.width) || null;
    this.minWidth = options.minWidth == null ? 0 : Math.max(0, Number(options.minWidth) || 0);
    this.maxWidth = options.maxWidth == null ? null : Math.max(0, Number(options.maxWidth) || 0);
    this.paddingX = options.paddingX == null ? 1 : Math.max(0, Number(options.paddingX) || 0);
    this.paddingY = options.paddingY == null ? 0 : Math.max(0, Number(options.paddingY) || 0);
    this.border = options.border == null ? 'single' : options.border;
    this.borderColor = options.borderColor || null;
    this.title = options.title || null;
    this.titleAlign = options.titleAlign || 'center';
    this.titleColor = options.titleColor || null;
    this.titleBold = options.titleBold !== false;
    this.titleDivider = options.titleDivider !== false;
    this.gap = options.gap == null ? 0 : Math.max(0, Number(options.gap) || 0);
    this.align = options.align || 'left';
    this.alignX = options.alignX || 'center';
    this.alignY = options.alignY || 'center';
    this.offsetX = Number(options.offsetX) || 0;
    this.offsetY = Number(options.offsetY) || 0;
    this.children = Array.isArray(options.children) ? options.children : [];
  }

  measure(availableWidth = null) {
    const innerWidth = this._resolveInnerWidth(availableWidth);
    const bodyLines = this._buildBodyLines(innerWidth);
    const metrics = frameMetrics(innerWidth, bodyLines.length + (this._hasTitle() ? (this.titleDivider ? 2 : 1) : 0), {
      border: this.border,
      paddingX: this.paddingX,
      paddingY: this.paddingY
    });
    return {
      width: metrics.width,
      height: metrics.height
    };
  }

  render(options = {}) {
    const availableWidth = options.availableWidth == null ? null : options.availableWidth;
    const innerWidth = this._resolveInnerWidth(availableWidth);
    const bodyLines = this._buildBodyLines(innerWidth);
    const border = resolveBorder(this.border);
    const borderColor = this.borderColor || '';
    const contentWidth = innerWidth + (this.paddingX * 2);
    const framed = [];

    if (!border) {
      const contentLines = [];
      if (this._hasTitle()) {
        contentLines.push(styleText(alignText(this.title, innerWidth, this.titleAlign), {
          color: this.titleColor,
          bold: this.titleBold
        }));
        if (this.titleDivider) {
          contentLines.push(repeatChar('─', innerWidth));
        }
      }
      contentLines.push(...bodyLines);
      return contentLines;
    }

    framed.push(`${borderColor}${border.topLeft}${repeatChar(border.horizontal, contentWidth)}${border.topRight}\x1b[0m`);

    if (this._hasTitle()) {
      framed.push(
        `${borderColor}${border.vertical}\x1b[0m${repeatChar(' ', this.paddingX)}${styleText(alignText(this.title, innerWidth, this.titleAlign), {
          color: this.titleColor,
          bold: this.titleBold
        })}${repeatChar(' ', this.paddingX)}${borderColor}${border.vertical}\x1b[0m`
      );
      if (this.titleDivider) {
        framed.push(`${borderColor}${border.leftDivider}${repeatChar(border.horizontal, contentWidth)}${border.rightDivider}\x1b[0m`);
      }
    }

    for (let i = 0; i < this.paddingY; i++) {
      framed.push(`${borderColor}${border.vertical}\x1b[0m${repeatChar(' ', contentWidth)}${borderColor}${border.vertical}\x1b[0m`);
    }

    for (const line of bodyLines) {
      framed.push(`${borderColor}${border.vertical}\x1b[0m${repeatChar(' ', this.paddingX)}${alignText(line, innerWidth, 'left')}${repeatChar(' ', this.paddingX)}${borderColor}${border.vertical}\x1b[0m`);
    }

    for (let i = 0; i < this.paddingY; i++) {
      framed.push(`${borderColor}${border.vertical}\x1b[0m${repeatChar(' ', contentWidth)}${borderColor}${border.vertical}\x1b[0m`);
    }

    framed.push(`${borderColor}${border.bottomLeft}${repeatChar(border.horizontal, contentWidth)}${border.bottomRight}\x1b[0m`);
    return framed;
  }

  resolvePlacement(containerWidth, containerHeight, availableWidth = null) {
    const measured = this.measure(availableWidth);
    return resolvePosition(containerWidth, containerHeight, measured.width, measured.height, {
      alignX: this.alignX,
      alignY: this.alignY,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    });
  }

  _hasTitle() {
    return this.title != null && this.title !== '';
  }

  _resolveInnerWidth(availableWidth = null) {
    const titleWidth = this._hasTitle() ? measureText(this.title) : 0;
    const childWidths = this.children.map((child) => {
      if (child && typeof child.measure === 'function') {
        return child.measure(availableWidth).width;
      }
      return measureLines(normalizeLines(child)).width;
    });
    const naturalWidth = Math.max(0, titleWidth, ...childWidths);
    const requested = this.width == null ? naturalWidth : this.width;
    const constrained = Math.max(this.minWidth, requested);
    const byMaxWidth = this.maxWidth == null ? constrained : Math.min(constrained, this.maxWidth);

    if (availableWidth == null) {
      return byMaxWidth;
    }

    const chrome = (this.paddingX * 2) + (borderThickness(this.border) * 2);
    return Math.max(0, Math.min(byMaxWidth, Math.max(0, availableWidth - chrome)));
  }

  _buildBodyLines(innerWidth) {
    const blocks = this.children.map((child) => {
      if (child && typeof child.render === 'function') {
        return child.render(innerWidth);
      }
      return normalizeLines(child).map((line) => alignText(line, innerWidth, this.align));
    });
    return stackBlocks(blocks, { gap: this.gap }).map((line) => alignText(line, innerWidth, this.align));
  }
}

module.exports = { PanelWidget };
