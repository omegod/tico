const { COLORS } = require('../../../../../src/engine/rendering/Renderer');
const { Layer } = require('./Layer');

const STARFIELD_PERIOD = 17;

function advanceStarfield(offset) {
  return (offset - 1 + STARFIELD_PERIOD) % STARFIELD_PERIOD;
}

function renderStarfield(renderer, offset, layer = Layer.BACKGROUND) {
  for (let y = 0; y < renderer.height; y++) {
    for (let x = 0; x < renderer.width; x++) {
      const scrollY = (y + offset) % STARFIELD_PERIOD;
      const star = (x * 7 + scrollY * 13) % STARFIELD_PERIOD === 0 ? '.' :
        (x * 3 + scrollY * 5) % 23 === 0 ? '·' : ' ';
      const color = star !== ' ' ? COLORS.dim : null;
      renderer.drawCell(x, y, star, color, false, layer);
    }
  }
}

function isBlinkVisible(timer) {
  return timer <= 0 || Math.floor(timer / 4) % 2 === 0;
}

function renderPlayer(renderer, player, shipArt, invincibleTimer, layer = Layer.PLAYER) {
  renderer.renderSprite(player, {
    art: shipArt,
    align: 'center',
    bold: true,
    layer,
    visible: () => isBlinkVisible(invincibleTimer),
    color: () => (invincibleTimer > 0 ? COLORS.yellow : COLORS.cyan)
  });
}

function renderShield(renderer, player, maxWidth, layer = Layer.SHIELD) {
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

  const drawShieldCell = (x, y, char, color = shellColor) => {
    if (x >= 0 && x < renderer.width && y >= 0 && y < renderer.height) {
      renderer.drawCell(x, y, char, color, true, layer);
    }
  };

  for (let sx = shieldLeft + 1; sx <= shieldRight - 1; sx++) {
    drawShieldCell(sx, shieldTop, '═');
    drawShieldCell(sx, shieldBottom, '═');
  }

  for (let sy = shieldTop + 1; sy <= shieldBottom - 1; sy++) {
    drawShieldCell(shieldLeft, sy, '│');
    drawShieldCell(shieldRight, sy, '│');
  }

  drawShieldCell(shieldLeft, shieldTop, '◜');
  drawShieldCell(shieldRight, shieldTop, '◝');
  drawShieldCell(shieldLeft, shieldBottom, '◟');
  drawShieldCell(shieldRight, shieldBottom, '◞');
  drawShieldCell(centerX, shieldTop, '•');
  drawShieldCell(centerX, shieldBottom, '•');
}

function renderEnemy(renderer, enemy, layer = Layer.ENEMIES) {
  renderer.renderSprite(enemy, {
    layer,
    visible: () => isBlinkVisible(enemy.invincibleTimer)
  });
}

function renderBoss(renderer, boss, layer = Layer.BOSS) {
  renderer.renderSprite(boss, {
    layer,
    visible: () => isBlinkVisible(boss.invincibleTimer),
    color: ({ row }) => (row === 0 ? COLORS.yellow : COLORS.magenta)
  });
}

function renderBullet(renderer, bullet, layer = Layer.BULLETS) {
  renderer.renderGlyph(bullet, {
    layer,
    bold: true,
    color: bullet.color || (bullet.isEnemy ? COLORS.brightRed : COLORS.brightGreen)
  });
}

function renderPowerup(renderer, powerup, layer = Layer.POWERUPS) {
  if (!powerup || powerup.active === false) return;

  const px = Math.floor(powerup.x);
  const py = Math.floor(powerup.y);
  if (py < 0 || py >= renderer.height || px < 0 || px >= renderer.width) return;

  if (Array.isArray(powerup.art) && powerup.art.length > 0) {
    renderer.renderSprite(powerup, {
      layer,
      bold: true
    });

    const artWidth = powerup.width || Math.max(...powerup.art.map((line) => line.length));
    const artHeight = powerup.height || powerup.art.length;
    const glowChars = ['◉', '●', '○'];
    const buffer = renderer.getBuffer();

    for (let gy = -1; gy <= artHeight; gy++) {
      for (let gx = -1; gx <= artWidth; gx++) {
        const isBorder = gy === -1 || gy === artHeight || gx === -1 || gx === artWidth;
        if (!isBorder) continue;

        const gpx = px + gx;
        const gpy = py + gy;
        if (gpy >= 0 && gpy < renderer.height && gpx >= 0 && gpx < renderer.width) {
          const existingCell = buffer.getCell(gpx, gpy);
          if (!existingCell || existingCell.char.trim() === '') {
            renderer.drawCell(
              gpx,
              gpy,
              glowChars[Math.floor(Math.random() * glowChars.length)],
              powerup.color,
              false,
              layer
            );
          }
        }
      }
    }
    return;
  }

  renderer.renderGlyph(powerup, {
    layer,
    bold: true
  });

  const glowChars = ['◉', '●', '○'];
  const buffer = renderer.getBuffer();
  for (let gy = -1; gy <= 1; gy++) {
    for (let gx = -1; gx <= 1; gx++) {
      if (gx === 0 && gy === 0) continue;

      const gpx = px + gx;
      const gpy = py + gy;
      if (gpy >= 0 && gpy < renderer.height && gpx >= 0 && gpx < renderer.width) {
        const existingCell = buffer.getCell(gpx, gpy);
        if (!existingCell || existingCell.char.trim() === '') {
          renderer.drawCell(
            gpx,
            gpy,
            glowChars[Math.floor(Math.random() * glowChars.length)],
            powerup.color,
            false,
            layer
          );
        }
      }
    }
  }
}

function renderParticle(renderer, particle, layer = Layer.PARTICLES) {
  if (!particle || particle.active === false) return;

  const lifeRatio = particle.life / particle.maxLife;
  const color = lifeRatio > 0.5
    ? COLORS.yellow
    : lifeRatio > 0.25
      ? COLORS.red
      : COLORS.dim;

  renderer.renderGlyph(particle, {
    layer,
    color
  });
}

module.exports = {
  advanceStarfield,
  renderStarfield,
  renderPlayer,
  renderShield,
  renderEnemy,
  renderBoss,
  renderBullet,
  renderPowerup,
  renderParticle
};
