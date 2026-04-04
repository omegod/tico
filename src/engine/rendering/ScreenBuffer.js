/**
 * ScreenBuffer - 2D字符缓冲 + CJK宽度处理
 * 处理终端显示的字符缓冲区和Unicode宽度
 */

// CJK 字符判断
function isFullWidth(c) {
  const code = c.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK Unified Ideographs
         (code >= 0x3000 && code <= 0x303F) ||  // CJK Symbols and Punctuation
         (code >= 0xFF00 && code <= 0xFFEF);    // Fullwidth characters
}

// 计算字符串显示宽度
function strWidth(str) {
  if (!str) return 0;
  // 先去除 ANSI 颜色代码
  const cleanStr = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < cleanStr.length; i++) {
    width += isFullWidth(cleanStr[i]) ? 2 : 1;
  }
  return width;
}

// 移除 ANSI 颜色代码
function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// 按显示宽度填充到指定宽度
function padEndDisplay(str, width) {
  const stripped = stripAnsi(str);
  const actualWidth = strWidth(stripped);
  const padding = width - actualWidth;
  if (padding <= 0) {
    // Truncate to exact visual width
    return truncateToWidth(str, width);
  }
  // 在字符串末尾添加空格填充（保留原始字符串的ANSI代码）
  return str + ' '.repeat(padding);
}

// 按显示宽度截断字符串
function truncateToWidth(str, targetWidth) {
  const stripped = stripAnsi(str);
  let width = 0;
  let result = '';
  let strippedIdx = 0;
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\x1b') {
      // 保留ANSI代码
      const seqEnd = str.indexOf('m', i);
      if (seqEnd !== -1) {
        result += str.substring(i, seqEnd + 1);
        i = seqEnd;
        continue;
      }
    }
    
    const char = str[i];
    const charWidth = isFullWidth(char) ? 2 : 1;
    if (width + charWidth > targetWidth) break;
    width += charWidth;
    result += char;
    strippedIdx++;
  }
  
  // 添加末尾的ANSI重置代码（如果有）
  if (result.includes('\x1b[') && !result.endsWith('\x1b[0m')) {
    result += '\x1b[0m';
  }
  
  const remaining = targetWidth - width;
  return result + ' '.repeat(Math.max(0, remaining));
}

// 计算字符串居中时的左右填充宽度
function getCenterPadding(str, width) {
  const sWidth = strWidth(str);
  const padding = width - sWidth;
  const left = Math.floor(padding / 2);
  return { left, right: padding - left };
}

// 居中字符串（基于视觉宽度）
function center(str, width) {
  const sWidth = strWidth(stripAnsi(str));
  const padding = width - sWidth;
  const left = Math.floor(padding / 2);
  return ' '.repeat(left) + str + ' '.repeat(padding - left);
}

// 重复字符
function repeatChar(char, width) {
  return char.repeat(width);
}

class Cell {
  constructor(char = ' ', color = null, bold = false, bgColor = null) {
    this.char = char;
    this.color = color;
    this.bold = bold;
    this.bgColor = bgColor;
  }

  clone() {
    return new Cell(this.char, this.color, this.bold, this.bgColor);
  }

  isEmpty() {
    return (this.char === ' ' || this.char === '') && !this.color && !this.bold && !this.bgColor;
  }
}

class ScreenBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = [];
    this.layerBuffer = []; // 存储渲染层级

    this._init();
  }

  _init() {
    this.buffer = [];
    this.layerBuffer = [];
    for (let y = 0; y < this.height; y++) {
      this.buffer[y] = [];
      this.layerBuffer[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = new Cell();
        this.layerBuffer[y][x] = 0;
      }
    }
  }

  /**
   * 清除缓冲区
   */
  clear() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        cell.char = ' ';
        cell.color = null;
        cell.bold = false;
        cell.bgColor = null;
        this.layerBuffer[y][x] = 0;
      }
    }
  }

  /**
   * 设置单个单元格
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {string} char - 字符
   * @param {string} color - 颜色
   * @param {boolean} bold - 是否加粗
   * @param {number} layer - 渲染层级
   */
  setCell(x, y, char, color = null, bold = false, layer = 0, bgColor = null) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

    // 只允许更高层级的绘制覆盖低层级
    if (layer >= this.layerBuffer[y][x]) {
      this.buffer[y][x] = new Cell(char, color, bold, bgColor);
      this.layerBuffer[y][x] = layer;
    }
  }

  /**
   * 获取单个单元格
   */
  getCell(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.buffer[y][x];
  }

  /**
   * 绘制矩形区域
   */
  fillRect(x, y, w, h, char = ' ', color = null, bold = false, layer = 0, bgColor = null) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setCell(x + dx, y + dy, char, color, bold, layer, bgColor);
      }
    }
  }

  /**
   * 绘制字符串（自动处理CJK宽度和ANSI颜色代码）
   */
  drawString(x, y, str, color = null, bold = false, layer = 0, bgColor = null) {
    if (!str) return;
    let currentX = x;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '\x1b') {
        // Skip ANSI escape sequence (does not occupy cells)
        const seqEnd = str.indexOf('m', i);
        if (seqEnd !== -1) {
          i = seqEnd; // Skip to end of ANSI sequence
          continue;
        }
      }
      
      if (isFullWidth(char)) {
        // 全角字符：设置字符并跳过一个位置（第二个位置为空）
        this.setCell(currentX, y, char, color, bold, layer, bgColor);
        // 第二个位置标记为全角字符的延续（使用空字符）
        this.setCell(currentX + 1, y, '', color, bold, layer, bgColor);
        currentX += 2;
      } else {
        // 半角字符
        this.setCell(currentX, y, char, color, bold, layer, bgColor);
        currentX += 1;
      }
    }
  }

  /**
   * 绘制多行文本
   */
  drawText(x, y, lines, color = null, bold = false, layer = 0, bgColor = null) {
    if (!lines) return;
    for (let i = 0; i < lines.length; i++) {
      this.drawString(x, y + i, lines[i], color, bold, layer, bgColor);
    }
  }

  /**
   * 绘制ASCII艺术（居中对齐）
   */
  drawArt(x, y, art, color = null, bold = false, layer = 0, bgColor = null) {
    if (!art) return;
    for (let i = 0; i < art.length; i++) {
      this.drawString(x, y + i, art[i], color, bold, layer, bgColor);
    }
  }

  /**
   * 绘制居中的ASCII艺术
   */
  drawArtCentered(y, art, color = null, bold = false, layer = 0) {
    if (!art || art.length === 0) return;
    const artWidth = Math.max(...art.map(line => strWidth(line)));
    const x = Math.floor((this.width - artWidth) / 2);
    this.drawArt(x, y, art, color, bold, layer);
  }

  /**
   * 将缓冲区渲染为字符串
   */
  render() {
    let output = '';
    let prevColor = null;
    let prevBold = false;
    let prevBgColor = null;
    
    for (let y = 0; y < this.height; y++) {
      prevColor = null;
      prevBold = false;
      prevBgColor = null;
      
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        // 跳过空字符（全角字符的第二部分）
        if (cell.char === '') continue;
        
        // 只在颜色或粗体变化时输出颜色代码
        const colorChanged = cell.color !== prevColor;
        const boldChanged = cell.bold !== prevBold;
        const bgChanged = cell.bgColor !== prevBgColor;
        
        if (colorChanged || boldChanged || bgChanged) {
          // 重置之前的样式
          if (prevColor || prevBold || prevBgColor) {
            output += '\x1b[0m';
          }
          // 设置新样式
          if (cell.color) {
            output += cell.color;
          }
          if (cell.bgColor) {
            output += cell.bgColor;
          }
          if (cell.bold) {
            output += '\x1b[1m';
          }
        }
        
        output += cell.char;
        prevColor = cell.color;
        prevBold = cell.bold;
        prevBgColor = cell.bgColor;
      }
      
      // 行末重置样式
      if (prevColor || prevBold || prevBgColor) {
        output += '\x1b[0m';
      }
      output += '\n';
    }
    return output;
  }

  /**
   * 生成调试视图
   */
  debugRender() {
    let output = '';
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        const layer = this.layerBuffer[y][x];
        const layerStr = layer.toString().padStart(3, '0');
        if (cell.char !== ' ') {
          output += `\x1b[33m[${layerStr}]\x1b[0m`;
        } else {
          output += '     ';
        }
      }
      output += '\n';
    }
    return output;
  }
}

module.exports = {
  ScreenBuffer,
  Cell,
  isFullWidth,
  strWidth,
  stripAnsi,
  padEndDisplay,
  getCenterPadding,
  center,
  repeatChar
};
