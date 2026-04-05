/**
 * EntityManager 单元测试
 */

const { EntityManager, EntityType, Entity } = require('../../src/engine/core/EntityManager');
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

  // Test: 创建实体
  if (test('should create entity', () => {
    const entity = manager.create(EntityType.PLAYER, { x: 10, y: 20 });
    assert(entity !== null, 'Entity should be created');
    assert(entity.type === EntityType.PLAYER, 'Entity type should match');
  })) passed++; else failed++;

  // Test: 获取玩家
  if (test('should get player', () => {
    manager.create(EntityType.PLAYER, { x: 10, y: 20 });
    const player = manager.getPlayer();
    assert(player !== null, 'Player should exist');
  })) passed++; else failed++;

  // Test: 销毁实体
  if (test('should destroy entity', () => {
    const enemy = manager.create(EntityType.ENEMY, { x: 5, y: 5 });
    const id = enemy.id;
    manager.destroy(enemy);
    const retrieved = manager.getEnemies().find(e => e.id === id);
    assert(retrieved === undefined, 'Enemy should be destroyed');
  })) passed++; else failed++;

  // Test: 清除所有实体
  if (test('should clear all entities', () => {
    manager.create(EntityType.ENEMY, {});
    manager.create(EntityType.ENEMY, {});
    manager.create(EntityType.POWERUP, {});
    manager.clear();
    assert(manager.getEnemies().length === 0, 'Enemies should be cleared');
    assert(manager.getPowerups().length === 0, 'Powerups should be cleared');
  })) passed++; else failed++;

  // Test: 子弹分类
  if (test('should categorize bullets as enemy or player', () => {
    const bullet1 = manager.create(EntityType.BULLET, { isEnemy: false });
    const bullet2 = manager.create(EntityType.BULLET, { isEnemy: true });
    const playerBullets = manager.getPlayerBullets();
    const enemyBullets = manager.getEnemyBullets();
    assert(playerBullets.length === 1, 'Should have 1 player bullet');
    assert(enemyBullets.length === 1, 'Should have 1 enemy bullet');
  })) passed++; else failed++;

  // Test: 实体统计
  if (test('should return entity stats', () => {
    manager.clearAll();
    manager.create(EntityType.PLAYER, {});
    manager.create(EntityType.ENEMY, {});
    manager.create(EntityType.ENEMY, {});
    const stats = manager.getStats();
    assert(stats.enemies === 2, 'Should have 2 enemies');
    assert(stats.hasPlayer === true, 'Should have player');
  })) passed++; else failed++;

  if (test('should integrate kinematics with force and gravity', () => {
    const entity = new Entity(EntityType.PARTICLE, {
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
    const entity = new Entity(EntityType.PARTICLE, {
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
