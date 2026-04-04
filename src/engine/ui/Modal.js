/**
 * Modal - 弹窗系统
 * 用于显示暂停菜单、确认对话框等
 */

const { strWidth, stripAnsi, padEndDisplay, center, repeatChar } = require('../rendering/ScreenBuffer');
const { COLORS } = require('../rendering/Renderer');

class Modal {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.active = false;
    this.modals = [];
  }

  /**
   * 显示弹窗
   */
  show(options) {
    const {
      title = '',
      content = [],
      items = [],
      selectedIndex = 0,
      onSelect = null,
      onClose = null
    } = options;

    this.active = true;
    this.modals.push({
      title,
      content,
      items,
      selectedIndex,
      onSelect,
      onClose,
      closed: false
    });
  }

  /**
   * 关闭弹窗
   */
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

  /**
   * 选择选项
   */
  select(index) {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = Math.max(0, Math.min(index, modal.items.length - 1));
      }
    }
  }

  /**
   * 上一个选项
   */
  selectPrev() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = (modal.selectedIndex - 1 + modal.items.length) % modal.items.length;
      }
    }
  }

  /**
   * 下一个选项
   */
  selectNext() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        modal.selectedIndex = (modal.selectedIndex + 1) % modal.items.length;
      }
    }
  }

  /**
   * 确认选择
   */
  confirm() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.onSelect) {
        modal.onSelect(modal.selectedIndex);
      }
      this.close();
    }
  }

  /**
   * 获取当前选中项
   */
  getSelectedIndex() {
    if (this.modals.length > 0) {
      return this.modals[0].selectedIndex;
    }
    return 0;
  }

  /**
   * 获取当前选中项文本
   */
  getSelectedItem() {
    if (this.modals.length > 0) {
      const modal = this.modals[0];
      if (modal.items && modal.items.length > 0) {
        return modal.items[modal.selectedIndex];
      }
    }
    return null;
  }

  /**
   * 是否活动
   */
  isActive() {
    return this.active;
  }

  /**
   * 渲染到缓冲区
   */
  render(buffer) {
    if (!this.active || this.modals.length === 0) return;

    const modal = this.modals[0];
    const boxWidth = 28; // 固定宽度，确保对齐
    const innerWidth = boxWidth - 2; // 内部宽度

    // 计算高度
    let boxHeight = 2; // 上下边框
    if (modal.title) boxHeight++;
    if (modal.content.length > 0) {
      boxHeight += modal.content.length;
      if (modal.items.length > 0) boxHeight++; // 分隔线
    }
    if (modal.items.length > 0) boxHeight += modal.items.length;

    const boxY = Math.floor((this.height - boxHeight) / 2);
    const boxX = Math.floor((this.width - boxWidth) / 2);

    const layer = 300;

    // 绘制半透明背景
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        buffer.setCell(x, y, ' ', '\x1b[48;5;236m', false, layer - 1);
      }
    }

    // 绘制边框（加粗显示）
    const horizontalLine = repeatChar('─', innerWidth);
    
    // 上边框
    buffer.drawString(boxX, boxY, '┌' + horizontalLine + '┐', null, true, layer);
    
    // 中间行
    let currentY = boxY + 1;
    
    // 标题（加粗显示）
    if (modal.title) {
      const titleText = ' ' + modal.title + ' ';
      const titleLine = center(titleText, innerWidth);
      buffer.drawString(boxX, currentY, '│' + titleLine + '│', null, true, layer);
      currentY++;
      
      // 标题下分隔线
      buffer.drawString(boxX, currentY, '├' + horizontalLine + '┤', null, false, layer);
      currentY++;
    }
    
    // 内容
    for (const line of modal.content) {
      const contentLine = ' ' + line;
      buffer.drawString(boxX, currentY, '│' + padEndDisplay(contentLine, innerWidth) + '│', null, false, layer);
      currentY++;
    }
    
    // 内容和选项之间的分隔线
    if (modal.content.length > 0 && modal.items.length > 0) {
      buffer.drawString(boxX, currentY, '├' + horizontalLine + '┤', null, false, layer);
      currentY++;
    }
    
    // 选项（选中项加粗，未选中项正常）
    for (let i = 0; i < modal.items.length; i++) {
      const isSelected = i === modal.selectedIndex;
      const prefix = isSelected ? ' ▸ ' : '   ';
      const itemText = prefix + modal.items[i];
      buffer.drawString(boxX, currentY, '│' + padEndDisplay(itemText, innerWidth) + '│', null, isSelected, layer);
      currentY++;
    }
    
    // 下边框
    buffer.drawString(boxX, currentY, '└' + horizontalLine + '┘', null, true, layer);
  }

  /**
   * 生成弹窗字符串
   */
  renderToString() {
    if (!this.active || this.modals.length === 0) return '';

    const modal = this.modals[0];
    const boxWidth = 28; // 固定宽度
    const innerWidth = boxWidth - 2;

    // 计算高度
    let boxHeight = 2;
    if (modal.title) boxHeight++;
    if (modal.content.length > 0) {
      boxHeight += modal.content.length;
      if (modal.items.length > 0) boxHeight++;
    }
    if (modal.items.length > 0) boxHeight += modal.items.length;

    const boxY = Math.floor((this.height - boxHeight) / 2);
    const boxX = Math.floor((this.width - boxWidth) / 2);

    const borderColor = COLORS.brightYellow;
    const horizontalLine = repeatChar('─', innerWidth);
    
    let result = '\n'.repeat(boxY);
    
    // 上边框
    result += ' '.repeat(boxX) + '┌' + horizontalLine + '┐\n';
    
    // 标题
    if (modal.title) {
      const titleText = ' ' + modal.title + ' ';
      const titleLine = center(titleText, innerWidth);
      result += ' '.repeat(boxX) + '│' + titleLine + '│\n';
      result += ' '.repeat(boxX) + '├' + horizontalLine + '┤\n';
    }
    
    // 内容
    for (const line of modal.content) {
      const contentLine = ' ' + line;
      result += ' '.repeat(boxX) + '│' + padEndDisplay(contentLine, innerWidth) + '│\n';
    }
    
    // 分隔线
    if (modal.content.length > 0 && modal.items.length > 0) {
      result += ' '.repeat(boxX) + '├' + horizontalLine + '┤\n';
    }
    
    // 选项
    for (let i = 0; i < modal.items.length; i++) {
      const isSelected = i === modal.selectedIndex;
      const prefix = isSelected ? ' ▸ ' : '   ';
      const itemText = prefix + modal.items[i];
      result += ' '.repeat(boxX) + '│' + padEndDisplay(itemText, innerWidth) + '│\n';
    }
    
    // 下边框
    result += ' '.repeat(boxX) + '└' + horizontalLine + '┘';

    return result;
  }

  /**
   * 创建暂停弹窗
   */
  showPause(onResume, onExit) {
    this.show({
      title: '暂 停',
      content: [],
      items: ['继续游戏', '返回菜单', '退出游戏'],
      selectedIndex: 0,
      onSelect: (index) => {
        if (index === 0 && onResume) onResume();
        else if (index === 1 && onExit) onExit();
        else if (index === 2) process.exit(0);
      }
    });
  }

  /**
   * 创建确认对话框
   */
  showConfirm(message, onConfirm, onCancel) {
    this.show({
      title: '确 认',
      content: [message],
      items: ['确认', '取消'],
      selectedIndex: 1,
      onSelect: (index) => {
        if (index === 0 && onConfirm) onConfirm();
        else if (index === 1 && onCancel) onCancel();
      }
    });
  }
}

module.exports = { Modal };
