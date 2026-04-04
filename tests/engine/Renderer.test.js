const assert = require('assert');
const { Renderer, COLORS, Layer } = require('../../src/engine/rendering/Renderer');
const { Camera2D } = require('../../src/engine/rendering/Camera2D');

function run() {
  console.log('Testing Renderer...');

  const stdout = { writes: [], write(chunk) { this.writes.push(chunk); } };
  const renderer = new Renderer(20, 10, stdout);
  const camera = new Camera2D({ x: 2, y: 1 });

  renderer.setCamera(camera);
  const projected = renderer.worldToScreen(5, 4);
  assert.deepStrictEqual(projected, { x: 3, y: 3 });

  renderer.clear();
  renderer.drawCell(2, 1, 'A', COLORS.green, true, Layer.PLAYER);
  renderer.drawString(3, 1, 'Hi', COLORS.red, false, Layer.HUD);
  renderer.drawText(0, 2, ['L1', 'L2'], COLORS.blue, false, Layer.HUD);
  renderer.drawArt(1, 4, ['@@'], COLORS.yellow, true, Layer.PLAYER);
  renderer.fillRect(0, 0, 2, 1, '.', COLORS.dim, false, Layer.BACKGROUND);
  renderer.renderBackground();
  renderer.scrollBackground();

  renderer.renderPlayer({ x: 4, y: 4 }, ['<>'], 0);
  renderer.renderShield({ x: 4, y: 4, height: 1, shieldActive: true, shield: 10, maxShield: 20 }, 2);
  renderer.renderEnemy({ x: 1, y: 1, width: 2, height: 1, art: ['EE'], color: COLORS.red, active: true, invincibleTimer: 0 });
  renderer.renderBoss({ x: 1, y: 2, art: ['BB'], active: true, invincibleTimer: 0 });
  renderer.renderBullet({ x: 2, y: 3, char: '|', active: true, isEnemy: false });
  renderer.renderPowerup({ x: 2, y: 5, char: '*', color: COLORS.yellow, active: true });
  renderer.renderPowerup({ x: 5, y: 5, art: ['[]'], color: COLORS.cyan, active: true, width: 2, height: 1 });
  renderer.renderParticle({ x: 4, y: 6, char: '.', active: true, life: 1, maxLife: 4 });

  assert.ok(renderer.toString().includes('A'));
  assert.ok(renderer.getBuffer());

  renderer.present();
  assert.ok(stdout.writes.length > 0);

  console.log('✓ Renderer tests passed');
  return true;
}

module.exports = { run };
