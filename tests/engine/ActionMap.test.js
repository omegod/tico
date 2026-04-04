const assert = require('assert');
const { ActionMap } = require('../../src/engine/input/ActionMap');

function run() {
  console.log('Testing ActionMap...');

  const actions = new ActionMap({
    JUMP: ['w', 'ArrowUp'],
    FIRE: ' '
  });

  assert.strictEqual(actions.getAction('w'), 'JUMP');
  assert.strictEqual(actions.getAction('ArrowUp'), 'JUMP');
  assert.strictEqual(actions.getAction(' '), 'FIRE');
  assert.strictEqual(actions.matches('ArrowUp', 'JUMP'), true);
  assert.strictEqual(actions.matches('s', 'JUMP'), false);

  console.log('✓ ActionMap tests passed');
  return true;
}

module.exports = { run };
