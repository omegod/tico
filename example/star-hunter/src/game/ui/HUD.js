const { Layer } = require('../../../../../src/engine/rendering/Layer');
const { PanelWidget } = require('../../../../../src/engine/widgets/PanelWidget');
const { TextWidget } = require('../../../../../src/engine/widgets/TextWidget');
const { BarWidget } = require('../../../../../src/engine/widgets/BarWidget');
const { measureText, styleText } = require('../../../../../src/engine/layout');
const { COLORS } = require('../../../../../src/engine/rendering/Renderer');

class HUD {
  constructor(width, options = {}) {
    this.width = width;
    this.layer = options.layer == null ? Layer.HUD : options.layer;
    this.border = options.border == null ? 'double' : options.border;
    this.borderColor = options.borderColor || COLORS.cyan;
    this.paddingX = options.paddingX == null ? 0 : options.paddingX;
    this.paddingY = options.paddingY == null ? 0 : options.paddingY;
    this.gap = options.gap == null ? 0 : options.gap;
  }

  render(buffer, definition = {}) {
    const widget = this._buildWidget(definition);
    const lines = widget.render({ availableWidth: this.width + 2 });
    for (let i = 0; i < lines.length; i++) {
      buffer.drawString(0, i, lines[i], null, false, definition.layer == null ? this.layer : definition.layer);
    }
  }

  renderToString(definition = {}) {
    return this._buildWidget(definition).render({ availableWidth: this.width + 2 }).join('\n');
  }

  _buildWidget(definition) {
    const rows = Array.isArray(definition.rows) ? definition.rows : [];
    return new PanelWidget({
      width: definition.width == null ? this.width : definition.width,
      border: definition.border == null ? this.border : definition.border,
      borderColor: definition.borderColor || this.borderColor,
      paddingX: definition.paddingX == null ? this.paddingX : definition.paddingX,
      paddingY: definition.paddingY == null ? this.paddingY : definition.paddingY,
      title: this._resolveTitle(definition.title),
      titleColor: this._resolveTitleColor(definition.title),
      titleBold: this._resolveTitleBold(definition.title),
      titleDivider: definition.titleDivider !== false,
      alignX: 'left',
      alignY: 'top',
      gap: definition.gap == null ? this.gap : definition.gap,
      children: rows.map((row) => new TextWidget({ text: this._renderRow(row) }))
    });
  }

  _resolveTitle(title) {
    if (!title) return '';
    if (typeof title === 'object') return title.text || '';
    return String(title);
  }

  _resolveTitleColor(title) {
    if (title && typeof title === 'object' && title.color) return title.color;
    return COLORS.white;
  }

  _resolveTitleBold(title) {
    if (title && typeof title === 'object') return title.bold !== false;
    return Boolean(title);
  }

  _renderRow(row) {
    if (row == null) return '';
    if (typeof row === 'string' || typeof row === 'number') return String(row);
    if (Array.isArray(row)) return this._renderSegments(row, row.gap);

    const left = this._renderSegments(row.left || row.segments || [], row.gap);
    const right = this._renderSegments(row.right || [], row.gap);
    if (!right) return left;
    if (!left) return right;

    const padding = Math.max(1, this.width - measureText(left) - measureText(right));
    return `${left}${' '.repeat(padding)}${right}`;
  }

  _renderSegments(segments, gap = 2) {
    return (Array.isArray(segments) ? segments : [])
      .filter((segment) => segment != null && segment !== false && segment !== '')
      .map((segment) => this._renderSegment(segment))
      .filter(Boolean)
      .join(' '.repeat(Math.max(0, gap)));
  }

  _renderSegment(segment) {
    if (segment == null) return '';
    if (typeof segment === 'string' || typeof segment === 'number') return String(segment);
    if (segment.text != null) {
      return styleText(segment.text, { color: segment.color, bold: segment.bold });
    }

    const parts = [];
    if (segment.icon) {
      parts.push(styleText(segment.icon, { color: segment.iconColor || segment.color, bold: segment.bold }));
    }
    if (segment.label) {
      parts.push(styleText(segment.label, { color: segment.labelColor || segment.color, bold: segment.bold }));
    }
    if (segment.bar) {
      parts.push(new BarWidget(segment.bar).render()[0]);
    }
    if (segment.value != null) {
      parts.push(styleText(String(segment.value), { color: segment.valueColor || segment.color, bold: segment.bold }));
    }
    if (segment.suffix) {
      parts.push(styleText(segment.suffix, { color: segment.suffixColor || segment.color, bold: segment.bold }));
    }
    return parts.join(segment.tight ? '' : ' ');
  }
}

module.exports = { HUD };
