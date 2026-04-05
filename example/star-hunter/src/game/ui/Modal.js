const { Layer } = require('../../../../../src/engine/rendering/Layer');
const { DialogWidget } = require('../../../../../src/engine/widgets/DialogWidget');

class Modal {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.active = false;
    this.modals = [];
    this.layer = options.layer == null ? Layer.MODAL : options.layer;
    this.overlayColor = options.overlayColor || '\x1b[48;5;236m';
    this.border = options.border == null ? 'single' : options.border;
    this.borderColor = options.borderColor || null;
  }

  show(options = {}) {
    const {
      title = '',
      content = [],
      items = [],
      selectedIndex = 0,
      onSelect = null,
      onClose = null,
      width = null,
      overlay = true,
      selectedPrefix = ' ▸ ',
      unselectedPrefix = '   ',
      border = this.border
    } = options;

    this.active = true;
    this.modals.push({
      title,
      content: Array.isArray(content) ? content.slice() : [String(content)],
      items: Array.isArray(items) ? items.slice() : [String(items)],
      selectedIndex,
      onSelect,
      onClose,
      width,
      overlay,
      selectedPrefix,
      unselectedPrefix,
      border,
      closed: false
    });
  }

  close() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (!modal.closed) {
        modal.closed = true;
        if (modal.onClose) {
          modal.onClose();
        }
      }
      this.modals.shift();
      if (this.modals.length === 0) {
        this.active = false;
      }
    }
  }

  select(index) {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = Math.max(0, Math.min(index, modal.items.length - 1));
      }
    }
  }

  selectPrev() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = (modal.selectedIndex - 1 + modal.items.length) % modal.items.length;
      }
    }
  }

  selectNext() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = (modal.selectedIndex + 1) % modal.items.length;
      }
    }
  }

  confirm() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.onSelect) {
        modal.onSelect(modal.selectedIndex);
      }
      this.close();
    }
  }

  getSelectedIndex() {
    if (this.modals.length > 0) {
      return this.modals[0].selectedIndex;
    }
    return 0;
  }

  getSelectedItem() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        return modal.items[modal.selectedIndex];
      }
    }
    return null;
  }

  isActive() {
    return this.active;
  }

  render(buffer) {
    if (!this.active || this.modals.length === 0) return;

    const modal = this.modals[0];
    const widget = this._buildWidget(modal);
    const placement = widget.resolvePlacement(this.width, this.height, this.width);
    const lines = widget.render({ availableWidth: this.width });

    if (modal.overlay) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          buffer.setCell(x, y, ' ', this.overlayColor, false, this.layer - 1);
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      buffer.drawString(placement.x, placement.y + i, lines[i], null, false, this.layer);
    }
  }

  renderToString() {
    if (!this.active || this.modals.length === 0) return '';

    const modal = this.modals[0];
    const widget = this._buildWidget(modal);
    const placement = widget.resolvePlacement(this.width, this.height, this.width);
    const lines = widget.render({ availableWidth: this.width });
    const indent = ' '.repeat(Math.max(0, placement.x));
    return `${'\n'.repeat(Math.max(0, placement.y))}${lines.map((line) => `${indent}${line}`).join('\n')}`;
  }

  _buildWidget(modal) {
    return new DialogWidget({
      title: modal.title,
      content: modal.content,
      items: modal.items,
      selectedIndex: modal.selectedIndex,
      selectedPrefix: modal.selectedPrefix,
      unselectedPrefix: modal.unselectedPrefix,
      width: modal.width,
      maxWidth: this.width - 4,
      border: modal.border,
      borderColor: this.borderColor,
      alignX: 'center',
      alignY: 'center'
    });
  }
}

module.exports = { Modal };
