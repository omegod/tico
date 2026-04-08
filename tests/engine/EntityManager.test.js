/**
 * EntityManager 单元测试
 */

const { EntityManager, Entity } = require('../../src/engine/core/EntityManager');
const { EventBus } = require('../../src/engine/core/EventBus');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

function run() {
  console.log('Testing EntityManager...\n');

  const eventBus = new EventBus();
  const manager = new EntityManager(eventBus);

  if (test('should create entity and index it by type', () => {
    const entity = manager.create('player', { x: 10, y: 20 });
    assert(entity !== null, 'Entity should be created');
    assert(entity.type === 'player', 'Entity type should match');
    assert(manager.getFirstByType('player') === entity, 'Entity should be queryable by type');
  })) passed++; else failed++;

  if (test('should replace singleton-like entities via set', () => {
    const first = manager.create('camera-target', { x: 0, y: 0 });
    const second = manager.set('camera-target', new Entity('camera-target', { x: 5, y: 5 }));

    assert(manager.getByType('camera-target').length === 1, 'Type bucket should contain one entity');
    assert(manager.getFirstByType('camera-target') === second, 'Latest entity should be stored');
    assert(manager.getFirstByType('camera-target') !== first, 'Previous entity should be removed');
  })) passed++; else failed++;

  if (test('should destroy entities and remove them from indexes', () => {
    const enemy = manager.create('enemy', { x: 5, y: 5 });
    manager.destroy(enemy);
    assert(manager.getByType('enemy').includes(enemy) === false, 'Destroyed entity should be removed');
  })) passed++; else failed++;

  if (test('should support tags', () => {
    const entity = manager.create('pickup', {});
    manager.addTag(entity, 'collectible');
    assert(manager.getByTag('collectible').includes(entity), 'Tagged entity should be queryable');
    manager.destroy(entity);
    assert(manager.getByTag('collectible').length === 0, 'Destroyed tagged entity should be removed from tags');
  })) passed++; else failed++;

  if (test('should clear one type without affecting others', () => {
    manager.clear();
    manager.create('enemy', {});
    manager.create('enemy', {});
    manager.create('projectile', {});
    manager.clearType('enemy');
    assert(manager.getByType('enemy').length === 0, 'Enemy bucket should be cleared');
    assert(manager.getByType('projectile').length === 1, 'Other buckets should remain');
  })) passed++; else failed++;

  if (test('should return generic entity stats', () => {
    manager.clear();
    manager.create('player', {});
    manager.create('enemy', {});
    manager.create('enemy', {});
    const stats = manager.getStats();
    assert(stats.total === 3, 'Should count all entities');
    assert(stats.byType.enemy === 2, 'Should count entities by type');
    assert(stats.byType.player === 1, 'Should count singleton type');
  })) passed++; else failed++;

  if (test('should integrate kinematics with force and gravity', () => {
    const entity = new Entity('particle', {
      x: 0,
      y: 0,
      mass: 2,
      gravityScale: 1,
      gravity: { x: 0, y: 10 },
      physicsEnabled: true
    });

    entity.applyForce(4, 0);
    entity.update(1000);

    assert(entity.x === 2, `Expected x to be 2, got ${entity.x}`);
    assert(entity.y === 10, `Expected y to be 10, got ${entity.y}`);
    assert(entity.vx === 2, `Expected vx to be 2, got ${entity.vx}`);
    assert(entity.vy === 10, `Expected vy to be 10, got ${entity.vy}`);
  })) passed++; else failed++;

  if (test('should bounce on bounds using restitution', () => {
    const entity = new Entity('particle', {
      x: 4,
      y: 1,
      width: 1,
      height: 1,
      vx: 4,
      restitution: 0.5,
      bounds: { x: 0, y: 0, width: 5, height: 5 },
      physicsEnabled: true
    });

    entity.update(1000);

    assert(entity.x === 4, `Expected x to clamp at 4, got ${entity.x}`);
    assert(entity.vx === -2, `Expected vx to reverse with restitution, got ${entity.vx}`);
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
