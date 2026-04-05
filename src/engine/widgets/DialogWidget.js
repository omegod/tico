const { Widget } = require('./Widget');
const { PanelWidget } = require('./PanelWidget');
const { TextWidget } = require('./TextWidget');
const { MenuWidget } = require('./MenuWidget');

class DialogWidget extends Widget {
  constructor(options = {}) {
    super(options);
    this.panel = new PanelWidget({
      width: options.width,
      minWidth: options.minWidth == null ? 24 : options.minWidth,
      maxWidth: options.maxWidth,
      paddingX: options.paddingX == null ? 1 : options.paddingX,
      paddingY: options.paddingY == null ? 0 : options.paddingY,
      border: options.border == null ? 'single' : options.border,
      borderColor: options.borderColor,
      title: options.title || '',
      titleAlign: options.titleAlign || 'center',
      alignX: options.alignX || 'center',
      alignY: options.alignY || 'center',
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0,
      gap: options.gap == null ? 1 : options.gap,
      children: this._buildChildren(options)
    });
  }

  measure(availableWidth = null) {
    return this.panel.measure(availableWidth);
  }

  render(options = {}) {
    return this.panel.render(options);
  }

  resolvePlacement(containerWidth, containerHeight, availableWidth = null) {
    return this.panel.resolvePlacement(containerWidth, containerHeight, availableWidth);
  }

  _buildChildren(options) {
    const children = [];
    const content = Array.isArray(options.content) ? options.content : (options.content == null ? [] : [options.content]);
    if (content.length > 0) {
      children.push(new TextWidget({
        lines: content,
        align: options.contentAlign || 'left',
        color: options.contentColor || null,
        bold: options.contentBold || false
      }));
    }

    const items = Array.isArray(options.items) ? options.items : (options.items == null ? [] : [options.items]);
    if (items.length > 0) {
      children.push(new MenuWidget({
        items,
        selectedIndex: options.selectedIndex || 0,
        selectedPrefix: options.selectedPrefix,
        unselectedPrefix: options.unselectedPrefix,
        align: options.menuAlign || 'left',
        itemColor: options.itemColor || null,
        selectedColor: options.selectedColor || null,
        selectedBold: options.selectedBold
      }));
    }

    return children;
  }
}

module.exports = { DialogWidget };
