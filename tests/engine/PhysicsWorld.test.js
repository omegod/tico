const assert = require('assert');
const { PhysicsWorld } = require('../../src/engine/physics/PhysicsWorld');

function run() {
  console.log('Testing PhysicsWorld...');

  const physics = new PhysicsWorld();
  const a = { x: 0, y: 0, width: 2, height: 2 };
  const b = { x: 1, y: 1, width: 2, height: 2 };

  physics.add('actors', a, { layer: 'player', mask: ['enemy'] });
  physics.add('actors', b, { layer: 'enemy', mask: ['player'] });

  const found = physics.queryRect({ x: 0, y: 0, width: 2, height: 2 });
  assert.strictEqual(found.includes(a), true);

  let collisions = 0;
  physics.testGroup('actors', 'actors', () => {
    collisions++;
  });
  assert.ok(collisions > 0);

  const hit = physics.raycast({ x: 0, y: 0 }, { x: 3, y: 3 });
  assert.ok(hit);

  console.log('✓ PhysicsWorld tests passed');
  return true;
}

module.exports = { run };
