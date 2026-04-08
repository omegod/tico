const assert = require('assert');
const { PhysicsWorld } = require('../../src/engine/physics/PhysicsWorld');
const { Entity } = require('../../src/engine/core/EntityManager');

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

  const moving = new Entity('particle', {
    x: 1,
    y: 1,
    width: 1,
    height: 1,
    vx: 6,
    gravityScale: 1,
    restitution: 0.5,
    physicsEnabled: true
  });
  physics.add('particles', moving, {
    bodyType: 'dynamic',
    bounds: { x: 0, y: 0, width: 5, height: 5 }
  });
  physics.setGravity(0, 4);
  physics.update(1000);

  assert.strictEqual(moving.x, 4);
  assert.strictEqual(moving.y, 4);
  assert.strictEqual(moving.vx, -3);
  assert.strictEqual(moving.vy, -2);

  console.log('✓ PhysicsWorld tests passed');
  return true;
}

module.exports = { run };
