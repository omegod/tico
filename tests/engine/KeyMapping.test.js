const assert = require('assert');
const { KeyMapping, getAction, matches } = require('../../src/engine/input/KeyMapping');

function run() {
  console.log('Testing KeyMapping...');

  assert.ok(Array.isArray(KeyMapping.MOVE_UP));
  assert.ok(['MOVE_UP', 'MENU_UP'].includes(getAction('ArrowUp')));
  assert.strictEqual(getAction('q'), 'POWER');
  assert.strictEqual(matches('Escape', 'PAUSE'), true);
  assert.strictEqual(matches('x', 'PAUSE'), false);
  assert.strictEqual(getAction('unknown'), null);

  console.log('✓ KeyMapping tests passed');
  return true;
}

module.exports = { run };
