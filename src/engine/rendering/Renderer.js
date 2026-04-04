/**
 * Renderer - ASCII渲染器
 * 将帧缓冲渲染到终端
 */

const { ScreenBuffer, strWidth, stripAnsi, padEndDisplay, center, repeatChar } = require('./ScreenBuffer');
const { Layer } = require('./Layer');

// ANSI 颜色代码 - 兼容黑白控制台
// 使用加粗和变暗来创建视觉层次
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',           // 加粗 - 用于重要内容、选中项
  dim: '\x1b[2m',            // 变暗 - 用于次要内容、未选中项
  
  // 以下颜色在黑白控制台中显示为不同灰度
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgBrightRed: '\x1b[101m',
  bgBrightGreen: '\x1b[102m',
  bgBrightYellow: '\x1b[103m',
  bgBrightBlue: '\x1b[104m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightCyan: '\x1b[106m',
  bgBrightWhite: '\x1b[107m',
  bgDarkGray: '\x1b[48;5;236m',
  bgMediumGray: '\x1b[48;5;238m',
  bgLightGray: '\x1b[48;5;250m',
  
  // UI专用样式（黑白兼容）
  selected: '\x1b[1m',       // 选中项 - 加粗白色
  normal: '',                // 普通项 - 默认
  inactive: '\x1b[2m',       // 未激活项 - 变暗
  border: '\x1b[1m',         // 边框 - 加粗
  title: '\x1b[1m',          // 标题 - 加粗
  warning: '\x1b[5m',        // 警告 - 闪烁
  
  // 特殊颜色
  orange: '\x1b[38;5;208m',  // 橘红色（256色）
  dimYellow: '\x1b[1m',      // 改为加粗
  darkGray: '\x1b[2m',       // 变暗
  mediumGray: '\x1b[2m'      // 变暗
};

class Renderer {
  constructor(width, height, stdout = process.stdout) {
    this.width = width;
    this.height = height;
    this.stdout = stdout;
    this.buffer = new ScreenBuffer(width, height);
    this.starScroll = 0;
    this.camera = null;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  getCamera() {
    return this.camera;
  }

  worldToScreen(x, y) {
    if (!this.camera) {
      return { x, y };
    }

    return {
      x: Math.floor(x - this.camera.x),
      y: Math.floor(y - this.camera.y)
    };
  }

  drawCell(x, y, char, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.worldToScreen(x, y);
    this.buffer.setCell(projected.x, projected.y, char, color, bold, layer, bgColor);
  }

  drawString(x, y, text, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.worldToScreen(x, y);
    this.buffer.drawString(projected.x, projected.y, text, color, bold, layer, bgColor);
  }

  drawText(x, y, lines, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.worldToScreen(x, y);
    this.buffer.drawText(projected.x, projected.y, lines, color, bold, layer, bgColor);
  }

  drawArt(x, y, art, color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.worldToScreen(x, y);
    this.buffer.drawArt(projected.x, projected.y, art, color, bold, layer, bgColor);
  }

  fillRect(x, y, width, height, char = ' ', color = null, bold = false, layer = Layer.BACKGROUND, bgColor = null) {
    const projected = this.worldToScreen(x, y);
    this.buffer.fillRect(projected.x, projected.y, width, height, char, color, bold, layer, bgColor);
  }

  /**
   * 清除屏幕
   */
  clear() {
    this.buffer.clear();
  }

  /**
   * 渲染星空背景
   */
  renderBackground(layer = Layer.BACKGROUND) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const scrollY = (y + this.starScroll) % 17;
        const star = (x * 7 + scrollY * 13) % 17 === 0 ? '.' :
                     (x * 3 + scrollY * 5) % 23 === 0 ? '·' : ' ';
        const color = star !== ' ' ? COLORS.dim : null;
        this.buffer.setCell(x, y, star, color, false, layer);
      }
    }
  }

  /**
   * 滚动星空背景
   */
  scrollBackground() {
    this.starScroll = (this.starScroll - 1 + 17) % 17;
  }

  /**
   * 绘制玩家
   */
  renderPlayer(player, shipArt, invincibleTimer, layer = Layer.PLAYER) {
    if (!player) return;

    const maxWidth = Math.max(...shipArt.map(r => r.length));
    const visible = invincibleTimer <= 0 || Math.floor(invincibleTimer / 4) % 2 === 0;

    if (visible) {
      for (let dy = 0; dy < shipArt.length; dy++) {
        const row = shipArt[dy];
        const rowOffset = Math.floor((maxWidth - row.length) / 2);
        for (let dx = 0; dx < row.length; dx++) {
          const char = row[dx];
          const py = Math.floor(player.y) + dy;
          const px = Math.floor(player.x) + rowOffset + dx;
          if (char !== ' ' && py >= 0 && py < this.height && px >= 0 && px < this.width) {
            let color = COLORS.cyan;
            if (invincibleTimer > 0) {
              color = Math.floor(invincibleTimer / 4) % 2 === 0 ? COLORS.yellow : COLORS.cyan;
            }
            this.drawCell(px, py, char, color, true, layer);
          }
        }
      }
    }
  }

  /**
   * 绘制护盾
   */
  renderShield(player, maxWidth, layer = Layer.SHIELD) {
    if (!player || !player.shieldActive) return;

    const shieldTop = Math.floor(player.y) - 1;
    const shieldBottom = Math.floor(player.y) + player.height;
    const shieldLeft = Math.floor(player.x) - 1;
    const shieldRight = Math.floor(player.x) + maxWidth;
    const centerX = Math.floor((shieldLeft + shieldRight) / 2);

    const shellColor = player.shield > player.maxShield * 0.5
      ? COLORS.brightCyan
      : player.shield > player.maxShield * 0.2
        ? COLORS.cyan
        : COLORS.blue;

    const drawCell = (x, y, char, color = shellColor) => {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.drawCell(x, y, char, color, true, layer);
      }
    };

    for (let sx = shieldLeft + 1; sx <= shieldRight - 1; sx++) {
      drawCell(sx, shieldTop, '═');
      drawCell(sx, shieldBottom, '═');
    }

    for (let sy = shieldTop + 1; sy <= shieldBottom - 1; sy++) {
      drawCell(shieldLeft, sy, '│');
      drawCell(shieldRight, sy, '│');
    }

    drawCell(shieldLeft, shieldTop, '◜');
    drawCell(shieldRight, shieldTop, '◝');
    drawCell(shieldLeft, shieldBottom, '◟');
    drawCell(shieldRight, shieldBottom, '◞');

    drawCell(centerX, shieldTop, '•');
    drawCell(centerX, shieldBottom, '•');
  }

  /**
   * 绘制敌人
   */
  renderEnemy(enemy, layer = Layer.ENEMIES) {
    if (!enemy || !enemy.active) return;

    const visible = enemy.invincibleTimer <= 0 || Math.floor(enemy.invincibleTimer / 4) % 2 === 0;
    if (!visible) return;

    for (let dy = 0; dy < enemy.height && enemy.y + dy < this.height; dy++) {
      const line = enemy.art[dy] || '';
      for (let dx = 0; dx < enemy.width && enemy.x + dx < this.width; dx++) {
        const char = line[dx] || ' ';
        if (char !== ' ') {
          const px = Math.floor(enemy.x + dx);
          const py = Math.floor(enemy.y + dy);
          if (py >= 0 && py < this.height && px >= 0 && px < this.width) {
            this.drawCell(px, py, char, enemy.color, false, layer);
          }
        }
      }
    }
  }

  /**
   * 绘制BOSS
   */
  renderBoss(boss, layer = Layer.BOSS) {
    if (!boss || !boss.active) return;

    const bossVisible = boss.invincibleTimer <= 0 || Math.floor(boss.invincibleTimer / 4) % 2 === 0;
    if (!bossVisible) return;

    for (let dy = 0; dy < boss.art.length; dy++) {
      const line = boss.art[dy];
      for (let dx = 0; dx < line.length; dx++) {
        const char = line[dx];
        const px = Math.floor(boss.x) + dx;
        const py = Math.floor(boss.y) + dy;
        if (char !== ' ' && py >= 0 && py < this.height && px >= 0 && px < this.width) {
          const color = dy === 0 ? COLORS.yellow : COLORS.magenta;
          this.drawCell(px, py, char, color, false, layer);
        }
      }
    }
  }

  /**
   * 绘制子弹
   */
  renderBullet(bullet, layer = Layer.BULLETS) {
    if (!bullet || !bullet.active) return;

    const px = Math.floor(bullet.x);
    const py = Math.floor(bullet.y);
    if ((bullet.width || 1) > 1 || (bullet.height || 1) > 1) {
      const maxX = px + (bullet.width || 1) - 1;
      const maxY = py + (bullet.height || 1) - 1;
      if (maxY < 0 || py >= this.height || maxX < 0 || px >= this.width) return;

      // Use ANSI colors: enemy bullets are red, player bullets are bright green
      const bulletColor = bullet.color || (bullet.isEnemy ? COLORS.brightRed : COLORS.brightGreen);
      for (let dy = 0; dy < (bullet.height || 1); dy++) {
        for (let dx = 0; dx < (bullet.width || 1); dx++) {
          this.drawCell(px + dx, py + dy, bullet.char, bulletColor, true, layer);
        }
      }
      return;
    }

    if (py < 0 || py >= this.height || px < 0 || px >= this.width) return;

    // Use ANSI colors: enemy bullets are red, player bullets are bright green
    const bulletColor = bullet.color || (bullet.isEnemy ? COLORS.brightRed : COLORS.brightGreen);
    this.drawCell(px, py, bullet.char, bulletColor, true, layer);
  }

  /**
   * 绘制道具（光晕始终显示）
   */
  renderPowerup(powerup, layer = Layer.POWERUPS) {
    if (!powerup || !powerup.active) return;

    const px = Math.floor(powerup.x);
    const py = Math.floor(powerup.y);
    if (py < 0 || py >= this.height || px < 0 || px >= this.width) return;

    if (Array.isArray(powerup.art) && powerup.art.length > 0) {
      const artWidth = powerup.width || Math.max(...powerup.art.map(line => strWidth(line)));
      const artHeight = powerup.height || powerup.art.length;
      for (let dy = 0; dy < powerup.art.length; dy++) {
        this.drawString(px, py + dy, powerup.art[dy], powerup.color, true, layer);
      }

      const glowChars = ['◉', '●', '○'];
      for (let gy = -1; gy <= artHeight; gy++) {
        for (let gx = -1; gx <= artWidth; gx++) {
          const isBorder = gy === -1 || gy === artHeight || gx === -1 || gx === artWidth;
          if (!isBorder) continue;
          const gpx = px + gx;
          const gpy = py + gy;
          if (gpy >= 0 && gpy < this.height && gpx >= 0 && gpx < this.width) {
            const existingCell = this.buffer.getCell(gpx, gpy);
            if (!existingCell || existingCell.char.trim() === '') {
              this.drawCell(gpx, gpy, glowChars[Math.floor(Math.random() * glowChars.length)], powerup.color, false, layer);
            }
          }
        }
      }
      return;
    }

    this.drawCell(px, py, powerup.char, powerup.color, true, layer);

    // 添加光晕效果（始终显示）
    const glowChars = ['◉', '●', '○'];
    for (let gy = -1; gy <= 1; gy++) {
      for (let gx = -1; gx <= 1; gx++) {
        if (gx === 0 && gy === 0) continue;
        const gpx = px + gx;
        const gpy = py + gy;
        if (gpy >= 0 && gpy < this.height && gpx >= 0 && gpx < this.width) {
          const existingCell = this.buffer.getCell(gpx, gpy);
          if (!existingCell || existingCell.char.trim() === '') {
            this.drawCell(gpx, gpy, glowChars[Math.floor(Math.random() * glowChars.length)], powerup.color, false, layer);
          }
        }
      }
    }
  }

  /**
   * 绘制粒子
   */
  renderParticle(particle, layer = Layer.PARTICLES) {
    if (!particle || !particle.active) return;

    const px = Math.floor(particle.x);
    const py = Math.floor(particle.y);
    if (py < 0 || py >= this.height || px < 0 || px >= this.width) return;

    const lifeRatio = particle.life / particle.maxLife;
    let color;
    if (lifeRatio > 0.5) color = COLORS.yellow;
    else if (lifeRatio > 0.25) color = COLORS.red;
    else color = COLORS.dim;

    this.drawCell(px, py, particle.char, color, false, layer);
  }

  /**
   * 渲染到终端
   */
  present() {
    this.stdout.write('\x1b[2J\x1b[H');
    this.stdout.write(this.buffer.render());
  }

  /**
   * 获取当前缓冲区
   */
  getBuffer() {
    return this.buffer;
  }

  /**
   * 导出ANSI字符串
   */
  toString() {
    return this.buffer.render();
  }
}

module.exports = { Renderer, COLORS, Layer };
