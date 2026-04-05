const { Layer } = require('../rendering/Layer');
const { PanelWidget } = require('../../../../../src/engine/widgets/PanelWidget');
const { TextWidget } = require('../../../../../src/engine/widgets/TextWidget');
const { measureLines } = require('../../../../../src/engine/layout');
const { COLORS } = require('../../../../../src/engine/rendering/Renderer');

class Banner {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.active = false;
    this.banners = [];
    this.scheduler = options.scheduler || options.time || null;
    this.layer = options.layer == null ? Layer.BANNER : options.layer;
    this.overlayColor = options.overlayColor || '\x1b[48;5;236m';
    this.border = options.border == null ? 'double' : options.border;
    this.borderColor = options.borderColor || null;
    this.paddingX = options.paddingX == null ? 1 : options.paddingX;
    this.paddingY = options.paddingY == null ? 0 : options.paddingY;
  }

  show(options = {}) {
    const {
      title = '',
      lines = [],
      footer = '',
      overlay = false,
      duration = 0,
      onClose = null,
      color = null,
      closable = true,
      width = null,
      border = this.border
    } = options;

    const banner = {
      title,
      lines: Array.isArray(lines) ? lines.slice() : [String(lines)],
      footer,
      overlay,
      duration,
      onClose,
      color,
      closable,
      width,
      border,
      closed: false,
      closeHandle: null,
      closeHandleType: null
    };

    this.banners.push(banner);
    this.active = true;

    if (this.banners.length === 1) {
      this._activateCurrentBanner();
    }
  }

  close() {
    return this._closeBanner(this.banners[0] || null);
  }

  closeAll() {
    for (const banner of this.banners) {
      this._finalizeBanner(banner);
    }
    this.banners = [];
    this.active = false;
  }

  isActive() {
    return this.active;
  }

  isClosable() {
    if (this.banners.length > 0) {
      return this.banners[0].closable !== false;
    }
    return true;
  }

  isOverlay() {
    return Boolean(this.active && this.banners[0] && this.banners[0].overlay);
  }

  render(buffer) {
    if (!this.active || this.banners.length === 0) return;

    const banner = this.banners[0];
    const widget = this._buildWidget(banner);
    const placement = widget.resolvePlacement(this.width, this.height, this.width);
    const lines = widget.render({ availableWidth: this.width });

    if (banner.overlay) {
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
    if (!this.active || this.banners.length === 0) return '';

    const banner = this.banners[0];
    const widget = this._buildWidget(banner);
    const placement = widget.resolvePlacement(this.width, this.height, this.width);
    const lines = widget.render({ availableWidth: this.width });
    const indent = ' '.repeat(Math.max(0, placement.x));
    const offset = banner.overlay ? '\n'.repeat(Math.max(0, placement.y)) : '';
    return `${offset}${lines.map((line) => `${indent}${line}`).join('\n')}${COLORS.reset}`;
  }

  setScheduler(scheduler) {
    this.scheduler = scheduler || null;
    return this;
  }

  _buildWidget(banner) {
    const children = banner.lines.map((line) => new TextWidget({
      text: line,
      align: 'left',
      color: banner.color || null
    }));

    if (banner.footer) {
      children.push(new TextWidget({
        text: banner.footer,
        align: 'center',
        color: COLORS.dim
      }));
    }

    return new PanelWidget({
      width: banner.width || this._suggestWidth(banner),
      maxWidth: this.width - 4,
      border: banner.border,
      borderColor: banner.color || this.borderColor,
      title: banner.title,
      titleColor: banner.color || this.borderColor,
      titleDivider: false,
      paddingX: this.paddingX,
      paddingY: this.paddingY,
      alignX: 'center',
      alignY: 'center',
      gap: 0,
      children
    });
  }

  _suggestWidth(banner) {
    return Math.max(20, measureLines([banner.title, ...banner.lines, banner.footer]).width);
  }

  _activateCurrentBanner() {
    const banner = this.banners[0];
    if (!banner) {
      this.active = false;
      return;
    }

    if (banner.duration > 0) {
      this._scheduleBannerClose(banner);
    }
  }

  _scheduleBannerClose(banner) {
    this._cancelBannerClose(banner);
    if (!banner || banner.duration <= 0) return;

    if (this.scheduler && typeof this.scheduler.after === 'function') {
      banner.closeHandle = this.scheduler.after(
        banner.duration,
        () => {
          this._closeBanner(banner);
        },
        { owner: banner }
      );
      banner.closeHandleType = 'scheduler';
      return;
    }

    banner.closeHandle = setTimeout(() => {
      banner.closeHandle = null;
      banner.closeHandleType = null;
      this._closeBanner(banner);
    }, banner.duration);
    banner.closeHandleType = 'timeout';
  }

  _cancelBannerClose(banner) {
    if (!banner || !banner.closeHandle) return;

    if (banner.closeHandleType === 'scheduler' && this.scheduler && typeof this.scheduler.cancel === 'function') {
      this.scheduler.cancel(banner.closeHandle);
    } else if (banner.closeHandleType === 'timeout') {
      clearTimeout(banner.closeHandle);
    }

    banner.closeHandle = null;
    banner.closeHandleType = null;
  }

  _finalizeBanner(banner) {
    if (!banner) return;

    this._cancelBannerClose(banner);

    if (!banner.closed) {
      banner.closed = true;
      if (banner.onClose) {
        banner.onClose();
      }
    }
  }

  _closeBanner(targetBanner) {
    if (!targetBanner || this.banners.length === 0 || this.banners[0] !== targetBanner) {
      return false;
    }

    this._finalizeBanner(targetBanner);
    this.banners.shift();

    if (this.banners.length === 0) {
      this.active = false;
      return true;
    }

    this._activateCurrentBanner();
    return true;
  }
}

module.exports = { Banner };
