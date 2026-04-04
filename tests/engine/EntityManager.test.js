/**
 * EntityManager 单元测试
 */

const { EntityManager, EntityType } = require('../../src/engine/core/EntityManager');
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

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
