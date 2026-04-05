const assert = require('assert');
const { ScreenBuffer } = require('../../../../src/engine/rendering/ScreenBuffer');
const { HUD } = require('../../src/game/ui/HUD');

function run() {
  console.log('Testing StarHunter HUD...');

  const hud = new HUD(80);
  const state = {
    title: 'STATUS',
    rows: [
      {
        left: [
          { label: 'Score', value: '123' },
          { label: 'Wave', value: '2/6' }
        ],
        right: [
          { label: 'Boss', value: 'Dreadnought' }
        ]
      },
      [
        { label: 'HP', bar: { current: 75, max: 100, width: 10 }, value: '75/100' },
        { label: 'Shield', bar: { current: 15, max: 30, width: 6 }, value: '15/30' },
        { text: 'Invincible', color: '\x1b[33m' }
      ]
    ]
  };

  const text = hud.renderToString(state);
  assert.ok(text.includes('Dreadnought'));
  assert.ok(text.includes('Invincible'));
  assert.ok(text.includes('STATUS'));

  const buffer = new ScreenBuffer(82, 8);
  hud.render(buffer, state);
  assert.strictEqual(buffer.getCell(0, 0).char, '╔');

  console.log('✓ StarHunter HUD tests passed');
  return true;
}

module.exports = { run };
