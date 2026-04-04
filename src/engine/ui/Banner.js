/**
 * Banner - 横幅系统
 * 用于显示剧情文本、Boss警告等
 */

const { strWidth, stripAnsi, padEndDisplay, center, repeatChar } = require('../rendering/ScreenBuffer');
const { COLORS } = require('../rendering/Renderer');

class Banner {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.active = false;
    this.banners = [];
    this.overlay = false;
  }

  /**
   * 显示横幅
   * @param {Object} options - 配置
   * @param {string} options.title - 标题
   * @param {Array<string>} options.lines - 内容行
   * @param {boolean} options.overlay - 是否覆盖游戏画面
   * @param {number} options.duration - 显示时长(ms)，0表示手动关闭
   * @param {Function} options.onClose - 关闭回调
   * @param {string} options.color - 边框颜色
   * @param {boolean} options.closable - 是否可手动关闭
   */
  show(options) {
    const {
      title = '',
      lines = [],
      overlay = false,
      duration = 0,
      onClose = null,
      color = null,
      closable = true
    } = options;

    this.active = true;
    this.overlay = overlay;

    this.banners.push({
      title,
      lines,
      overlay,
      duration,
      onClose,
      color,
      closable,
      startTime: Date.now(),
      closed: false
    });

    if (duration > 0) {
      setTimeout(() => {
        this.close();
      }, duration);
    }
  }

  /**
   * 关闭当前横幅
   */
  close() {
    if (this.banners.length > 0) {
      const banner = this.banners[0];
      if (!banner.closed) {
        banner.closed = true;
        if (banner.onClose) {
          banner.onClose();
        }
      }
      this.banners.shift();
      if (this.banners.length === 0) {
        this.active = false;
      }
    }
  }

  /**
   * 关闭所有横幅
   */
  closeAll() {
    for (const banner of this.banners) {
      if (banner.onClose && !banner.closed) {
        banner.onClose();
      }
    }
    this.banners = [];
    this.active = false;
  }

  /**
   * 是否有活动的横幅
   */
  isActive() {
    return this.active;
  }

  /**
   * 当前横幅是否可手动关闭
   */
  isClosable() {
    if (this.banners.length > 0) {
      return this.banners[0].closable !== false;
    }
    return true;
  }

  /**
   * 是否覆盖模式
   */
  isOverlay() {
    return this.overlay && this.active;
  }

  /**
   * 渲染横幅到缓冲区
   */
  render(buffer) {
    if (!this.active || this.banners.length === 0) return;

    const banner = this.banners[0];
    const contentWidth = Math.max(
      strWidth(banner.title),
      ...banner.lines.map(l => strWidth(l)),
      20
    );
    const boxWidth = Math.min(contentWidth + 4, this.width - 4);

    const boxHeight = 4 + banner.lines.length;
    const boxY = Math.floor((this.height - boxHeight) / 2);
    const boxX = Math.floor((this.width - boxWidth) / 2);

    const layer = 200;

    // 绘制背景（如果覆盖模式）
    if (this.overlay) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          buffer.setCell(x, y, ' ', '\x1b[48;5;236m', false, layer - 1);
        }
      }
    }

    // 使用指定颜色或默认白色
    const color = banner.color || null;
    
    // 绘制边框
    buffer.drawString(boxX, boxY, '╔' + repeatChar('═', boxWidth - 2) + '╗', color, true, layer);
    for (let i = 0; i < boxHeight - 2; i++) {
      buffer.drawString(boxX, boxY + 1 + i, '║' + repeatChar(' ', boxWidth - 2) + '║', color, false, layer);
    }
    buffer.drawString(boxX, boxY + boxHeight - 1, '╚' + repeatChar('═', boxWidth - 2) + '╝', color, true, layer);

    // 绘制标题
    if (banner.title) {
      const titleLine = center(banner.title, boxWidth - 2);
      buffer.drawString(boxX + 1, boxY + 1, titleLine, color, true, layer);
    }

    // 绘制内容行
    for (let i = 0; i < banner.lines.length; i++) {
      const line = padEndDisplay(banner.lines[i], boxWidth - 2);
      buffer.drawString(boxX + 1, boxY + 2 + i, line, color, false, layer);
    }

    // 提示按Enter键关闭
    if (banner.duration === 0) {
      const tip = '按Enter键继续...';
      const tipLine = center(tip, boxWidth - 2);
      buffer.drawString(boxX + 1, boxY + boxHeight - 1, tipLine, COLORS.dim, false, layer);
    }
  }

  /**
   * 生成横幅字符串
   */
  renderToString() {
    if (!this.active || this.banners.length === 0) return '';

    const banner = this.banners[0];
    const contentWidth = Math.max(
      strWidth(banner.title),
      ...banner.lines.map(l => strWidth(l)),
      20
    );
    const boxWidth = Math.min(contentWidth + 4, this.width - 4);

    const boxHeight = 4 + banner.lines.length;
    const boxY = Math.floor((this.height - boxHeight) / 2);
    const boxX = Math.floor((this.width - boxWidth) / 2);

    let result = '';

    // 如果是覆盖模式，先生成背景
    if (this.overlay) {
      for (let y = 0; y < boxY; y++) {
        result += '\n';
      }
    }

    const borderColor = COLORS.brightYellow;
    const topLine = ' '.repeat(boxX) + '╔' + repeatChar('═', boxWidth - 2) + '╗';
    result += topLine + '\n';

    for (let i = 0; i < boxHeight - 2; i++) {
      let content = ' '.repeat(boxX) + '║';
      if (i === 0 && banner.title) {
        content += center(banner.title, boxWidth - 2);
      } else if (i >= 1 && i - 1 < banner.lines.length) {
        content += padEndDisplay(banner.lines[i - 1], boxWidth - 2);
      } else {
        content += repeatChar(' ', boxWidth - 2);
      }
      content += '║';
      result += content + '\n';
    }

    const bottomLine = ' '.repeat(boxX) + '╚' + repeatChar('═', boxWidth - 2) + '╝';
    result += bottomLine;

    return result;
  }

  /**
   * 创建BOSS警告横幅
   */
  showBossWarning(bossName, hp, defense, wave, options = {}) {
    const { overlay = false, duration = 3000, onClose = null, subtitle = '' } = options;
    const lines = [
      `Wave ${wave}: ${bossName}`,
      `HP: ${hp} | Defense: ${Math.floor(defense * 100)}%`
    ];
    if (subtitle) {
      lines.push(subtitle);
    }
    this.show({
      title: '⚠ BOSS WARNING ⚠',
      lines,
      overlay,
      duration,
      onClose,
      color: COLORS.orange, // 橘红色
      closable: false // 不可手动关闭
    });
  }

  /**
   * 创建剧情横幅
   */
  showStory(title, lines, onClose = null) {
    this.show({
      title: title,
      lines: lines,
      overlay: true,
      duration: 0,  // 手动关闭
      onClose: onClose
    });
  }
}

module.exports = { Banner };
