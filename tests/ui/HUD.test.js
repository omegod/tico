const assert = require('assert');
const { HUD } = require('../../src/engine/ui/HUD');
const { ScreenBuffer } = require('../../src/engine/rendering/ScreenBuffer');

function run() {
  console.log('Testing HUD...');

  const hud = new HUD(80);
  const state = {
    score: 123,
    wave: 2,
    waveEnemiesKilled: 4,
    waveTotalEnemies: 10,
    lives: 2,
    powerCount: 3,
    missileCapacity: 5,
    missileReload: { percent: 50, full: false },
    invincibleTimer: 40,
    player: {
      hp: 75,
      maxHp: 100,
      shield: 15,
      shieldActive: true
    },
    boss: {
      hp: 120,
      maxHp: 200,
      name: 'Boss'
    }
  };

  const text = hud.renderToString(state);
  assert.ok(text.includes('Boss'));
  assert.ok(text.includes('无敌'));

  const buffer = new ScreenBuffer(82, 6);
  hud.render(buffer, state);
  assert.strictEqual(buffer.getCell(0, 0).char, '╔');

  console.log('✓ HUD tests passed');
  return true;
}

module.exports = { run };
