/**
 * HUD - 状态栏
 * 游戏界面上方的状态信息显示
 */

const { strWidth, stripAnsi, padEndDisplay, center, repeatChar } = require('../rendering/ScreenBuffer');
const { COLORS } = require('../rendering/Renderer');

class HUD {
  constructor(width) {
    this.width = width;
  }

  /**
   * 渲染HUD到缓冲区
   * @param {ScreenBuffer} buffer - 屏幕缓冲区
   * @param {Object} gameState - 游戏状态
   */
  render(buffer, gameState) {
    const {
      score = 0,
      wave = 1,
      waveEnemiesKilled = 0,
      waveTotalEnemies = 10,
      lives = 3,
      powerCount = 0,
      missileCapacity = 10,
      missileReload = null,
      invincibleTimer = 0,
      player = null,
      boss = null
    } = gameState;

    // 第一行 - 分数、波次、敌人数
    const hpBarLen = 10;
    let line1 = `${COLORS.white} ${COLORS.bold}${COLORS.yellow}★ ${COLORS.white}${score.toString().padStart(10, '0')}  `;
    line1 += `${COLORS.magenta}波次 ${COLORS.white}${wave}/6  `;
    line1 += `${COLORS.cyan}敌 ${COLORS.white}${waveEnemiesKilled}/${waveTotalEnemies}`;

    if (boss) {
      const bossHpPercent = boss.hp / boss.maxHp;
      const bossHpFilled = Math.floor(bossHpPercent * hpBarLen);
      const bossHpBar = '█'.repeat(Math.max(0, bossHpFilled)) + '░'.repeat(Math.max(0, hpBarLen - bossHpFilled));
      const bossHpColor = bossHpPercent > 0.5 ? COLORS.green : bossHpPercent > 0.25 ? COLORS.yellow : COLORS.red;
      line1 += `  ${COLORS.red}BOSS ${COLORS.white}${boss.name} ${bossHpColor}${bossHpBar}${COLORS.red} ${Math.floor(bossHpPercent * 100)}%`;
    }
    line1 = padEndDisplay(line1, this.width);

    // 第二行 - HP、护盾、导弹、生命
    const shieldBarLen = 6;
    const shieldPercent = player ? player.shield / 30 : 0;
    const shieldFilled = Math.floor(shieldPercent * shieldBarLen);
    const shieldBar = '█'.repeat(Math.max(0, shieldFilled)) + '░'.repeat(Math.max(0, shieldBarLen - shieldFilled));
    const shieldActive = player ? player.shieldActive : false;
    const shieldColor = shieldActive ? (shieldPercent > 0.5 ? COLORS.blue : shieldPercent > 0.25 ? COLORS.brightBlue : COLORS.dim) : COLORS.dim;
    const hpPercent = player ? player.hp / player.maxHp : 1;
    const hpFilled = Math.floor(hpPercent * hpBarLen);
    const hpBar = '█'.repeat(Math.max(0, hpFilled)) + '░'.repeat(Math.max(0, hpBarLen - hpFilled));
    const hpColor = hpPercent > 0.5 ? COLORS.green : hpPercent > 0.25 ? COLORS.yellow : COLORS.red;

    let line2 = `${COLORS.white} ${hpColor}HP ${hpBar} ${player ? Math.max(0, player.hp) : 0}/${player ? player.maxHp : 100}  `;
    line2 += `${shieldColor}护盾 ${shieldBar} ${player ? player.shield : 0}/30${COLORS.white}  `;
    line2 += `${COLORS.yellow}★ 导弹 ${powerCount}/${missileCapacity}`;
    if (missileReload) {
      const reloadColor = missileReload.full ? COLORS.green : COLORS.yellow;
      line2 += `  ${reloadColor}↻${missileReload.percent}%${COLORS.white}`;
    }
    line2 += '  ';
    line2 += `${COLORS.red}♥生命 ${lives}`;
    if (invincibleTimer > 0) line2 += `  ${COLORS.yellow}◐无敌 ${Math.ceil(invincibleTimer/20)}秒`;
    line2 = padEndDisplay(line2, this.width);

    // 边框
    const borderColor = COLORS.cyan;
    const borderLine1 = `${borderColor}╔${'═'.repeat(this.width)}╗`;
    const borderLine2 = `${borderColor}║${line1}${borderColor}║`;
    const borderLine3 = `${borderColor}╠${'═'.repeat(this.width)}╣`;
    const borderLine4 = `${borderColor}║${line2}${borderColor}║`;
    const borderLine5 = `${borderColor}╚${'═'.repeat(this.width)}╝`;

    // 写入缓冲区 (层级100)
    const layer = 100;
    for (let x = 0; x < this.width + 2; x++) {
      if (x < borderLine1.length) {
        const char = borderLine1[x] || '';
        if (char !== '═' && char !== '╔' && char !== '╗') {
          // 边框字符单独处理
        }
      }
    }

    // 简化处理：直接在对应位置绘制
    // 第一行边框
    buffer.drawString(0, 0, borderLine1, borderColor, false, layer);
    buffer.drawString(0, 1, borderLine2, borderColor, false, layer);
    buffer.drawString(0, 2, borderLine3, borderColor, false, layer);
    buffer.drawString(0, 3, borderLine4, borderColor, false, layer);
    buffer.drawString(0, 4, borderLine5, borderColor, false, layer);
  }

  /**
   * 生成HUD字符串
   */
  renderToString(gameState) {
    const {
      score = 0,
      wave = 1,
      waveEnemiesKilled = 0,
      waveTotalEnemies = 10,
      lives = 3,
      powerCount = 0,
      missileCapacity = 10,
      missileReload = null,
      invincibleTimer = 0,
      player = null,
      boss = null
    } = gameState;

    const hpBarLen = 10;
    let line1 = `${COLORS.white} ${COLORS.bold}${COLORS.yellow}★ ${COLORS.white}${score.toString().padStart(10, '0')}  `;
    line1 += `${COLORS.magenta}波次 ${COLORS.white}${wave}/6  `;
    line1 += `${COLORS.cyan}敌 ${COLORS.white}${waveEnemiesKilled}/${waveTotalEnemies}`;

    if (boss) {
      const bossHpPercent = boss.hp / boss.maxHp;
      const bossHpFilled = Math.floor(bossHpPercent * hpBarLen);
      const bossHpBar = '█'.repeat(Math.max(0, bossHpFilled)) + '░'.repeat(Math.max(0, hpBarLen - bossHpFilled));
      const bossHpColor = bossHpPercent > 0.5 ? COLORS.green : bossHpPercent > 0.25 ? COLORS.yellow : COLORS.red;
      line1 += `  ${COLORS.red}BOSS ${COLORS.white}${boss.name} ${bossHpColor}${bossHpBar}${COLORS.red} ${Math.floor(bossHpPercent * 100)}%`;
    }
    line1 = padEndDisplay(line1, this.width);

    const shieldBarLen = 6;
    const shieldPercent = player ? player.shield / 30 : 0;
    const shieldFilled = Math.floor(shieldPercent * shieldBarLen);
    const shieldBar = '█'.repeat(Math.max(0, shieldFilled)) + '░'.repeat(Math.max(0, shieldBarLen - shieldFilled));
    const shieldActive = player ? player.shieldActive : false;
    const shieldColor = shieldActive ? (shieldPercent > 0.5 ? COLORS.blue : shieldPercent > 0.25 ? COLORS.brightBlue : COLORS.dim) : COLORS.dim;
    const hpPercent = player ? player.hp / player.maxHp : 1;
    const hpFilled = Math.floor(hpPercent * hpBarLen);
    const hpBar = '█'.repeat(Math.max(0, hpFilled)) + '░'.repeat(Math.max(0, hpBarLen - hpFilled));
    const hpColor = hpPercent > 0.5 ? COLORS.green : hpPercent > 0.25 ? COLORS.yellow : COLORS.red;

    let line2 = `${COLORS.white} ${hpColor}HP ${hpBar} ${player ? Math.max(0, player.hp) : 0}/${player ? player.maxHp : 100}  `;
    line2 += `${shieldColor}护盾 ${shieldBar} ${player ? player.shield : 0}/30${COLORS.white}  `;
    line2 += `${COLORS.yellow}★ 导弹 ${powerCount}/${missileCapacity}`;
    if (missileReload) {
      const reloadColor = missileReload.full ? COLORS.green : COLORS.yellow;
      line2 += `  ${reloadColor}↻${missileReload.percent}%${COLORS.white}`;
    }
    line2 += '  ';
    line2 += `${COLORS.red}♥生命 ${lives}`;
    if (invincibleTimer > 0) line2 += `  ${COLORS.yellow}◐无敌 ${Math.ceil(invincibleTimer/20)}秒`;
    line2 = padEndDisplay(line2, this.width);

    const borderColor = COLORS.cyan;
    let result = `${borderColor}╔${'═'.repeat(this.width)}╗\n`;
    result += `${borderColor}║${line1}${borderColor}║\n`;
    result += `${borderColor}╠${'═'.repeat(this.width)}╣\n`;
    result += `${borderColor}║${line2}${borderColor}║\n`;
    result += `${borderColor}╚${'═'.repeat(this.width)}╝${COLORS.reset}`;

    return result;
  }
}

module.exports = { HUD };
