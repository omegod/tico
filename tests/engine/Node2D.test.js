const assert = require('assert');
const { Node2D } = require('../../src/engine/nodes/Node2D');

function run() {
  console.log('Testing Node2D...');

  const root = new Node2D({ x: 2, y: 3 });
  const child = new Node2D({ x: 5, y: 7 });

  root.addChild(child);
  const world = child.getWorldPosition();

  assert.strictEqual(world.x, 7);
  assert.strictEqual(world.y, 10);

  root.removeChild(child);
  assert.strictEqual(child.parent, null);

  console.log('✓ Node2D tests passed');
  return true;
}

module.exports = { run };
