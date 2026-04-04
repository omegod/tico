/**
 * DamageSystem 单元测试
 */

const { DamageSystem } = require('../../src/game/systems/DamageSystem');
const { EntityManager } = require('../../../../src/engine/core/EntityManager');
const { EventBus } = require('../../../../src/engine/core/EventBus');
const { Player } = require('../../src/game/entities/Player');
const { Enemy } = require('../../src/game/entities/Enemy');
const { Bullet, BulletType } = require('../../src/game/entities/Bullet');

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

function run() {
  console.log('Testing DamageSystem...\n');

  let passed = 0;
  let failed = 0;

  // Test: 创建 DamageSystem
  if (test('should create DamageSystem', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);
    assert(damageSystem !== null, 'DamageSystem should be created');
  })) passed++; else failed++;

  // Test: update 方法存在且可调用
  if (test('should have update method', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);
    assert(typeof damageSystem.update === 'function', 'update should be a function');
  })) passed++; else failed++;

  // Test: update 接受 dt 和 frameCount 参数
  if (test('should accept dt and frameCount parameters', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);
    // 这应该不会抛出错误
    damageSystem.update(16, 1);
  })) passed++; else failed++;

  // Test: _updateBullets 内部使用 dt 和 frameCount
  if (test('should update bullets with dt and frameCount', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    // 创建一个玩家子弹
    const bullet = new Bullet({
      x: 40,
      y: 20,
      char: '◉',
      damage: 10,
      speed: 2,
      isEnemy: false,
      pierce: false
    });
    entities.create('bullet', bullet);

    // 更新（这应该传递 dt 和 frameCount 给子弹的 update）
    damageSystem.update(16, 1);

    // 子弹位置应该改变（向上移动）
    assert(bullet.y < 20, 'Player bullet should move upward');
  })) passed++; else failed++;

  // Test: 敌人子弹向下移动
  if (test('should move enemy bullets downward', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    // 创建一个敌人子弹
    const bullet = Bullet.createEnemyBullet(40, 10, 15);
    entities.create('bullet', bullet);

    const initialY = bullet.y;
    damageSystem.update(16, 1);

    assert(bullet.y > initialY, 'Enemy bullet should move downward');
    assert(bullet.y - initialY < 0.56, 'Enemy bullet should move slower than before');
  })) passed++; else failed++;

  // Test: 出界子弹被标记为 inactive
  if (test('should mark off-screen bullets as inactive', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);
    damageSystem.screenWidth = 80;
    damageSystem.screenHeight = 32;

    // 创建一个在屏幕外的子弹
    const bullet = new Bullet({
      x: 40,
      y: 100, // 屏幕外
      char: '◉',
      damage: 10,
      speed: 2,
      isEnemy: false,
      pierce: false
    });
    entities.create('bullet', bullet);

    damageSystem.update(16, 1);

    assert(bullet.active === false, 'Off-screen bullet should be inactive');
  })) passed++; else failed++;

  // Test: 玩家子弹击中敌人
  if (test('should detect player bullet hitting enemy', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    // 创建一个玩家子弹在敌人位置
    const bullet = new Bullet({
      x: 40,
      y: 10,
      char: '◉',
      damage: 100,
      speed: 2,
      isEnemy: false,
      pierce: false
    });
    entities.create('bullet', bullet);

    // 创建一个敌人
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.x = 38;
    enemy.y = 8;
    entities.create('enemy', enemy);

    const initialEnemyHp = enemy.hp;
    damageSystem.update(16, 1);

    // 敌人应该受到伤害
    assert(enemy.hp < initialEnemyHp, 'Enemy should take damage');
  })) passed++; else failed++;

  // Test: 敌人被击中后被销毁
  if (test('should destroy enemy when HP <= 0', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    let enemyDestroyed = false;
    damageSystem.onEnemyDestroyed = () => { enemyDestroyed = true; };

    // 创建一个能一击消灭敌人的子弹
    const bullet = new Bullet({
      x: 40,
      y: 10,
      char: '◉',
      damage: 1000,
      speed: 2,
      isEnemy: false,
      pierce: false
    });
    entities.create('bullet', bullet);

    // 创建一个敌人
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.x = 38;
    enemy.y = 8;
    entities.create('enemy', enemy);

    damageSystem.update(16, 1);

    assert(enemyDestroyed === true, 'onEnemyDestroyed callback should be called');
    assert(enemy.active === false, 'Enemy should be inactive');
  })) passed++; else failed++;

  if (test('should respect bullet hit cooldown for sustained damage missiles', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.x = 38;
    enemy.y = 8;
    entities.create('enemy', enemy);

    const bullet = new Bullet({
      x: 40,
      y: 10,
      char: '✦',
      damage: 10,
      speed: 0,
      isEnemy: false,
      pierce: true,
      hitCooldown: 3
    });
    entities.create('bullet', bullet);

    damageSystem.update(16, 1);
    const hpAfterFirstHit = enemy.hp;
    damageSystem.update(16, 2);
    assert(enemy.hp === hpAfterFirstHit, 'Enemy should not take repeated damage before cooldown expires');
  })) passed++; else failed++;

  if (test('should wear down piercing missiles with integrity', () => {
    const eventBus = new EventBus();
    const entities = new EntityManager(eventBus);
    const damageSystem = new DamageSystem(eventBus, entities);

    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.x = 38;
    enemy.y = 8;
    entities.create('enemy', enemy);

    const bullet = new Bullet({
      x: 40,
      y: 10,
      char: '◎',
      damage: 20,
      speed: 0,
      isEnemy: false,
      pierce: true,
      integrity: 2,
      damageDecay: 5,
      minDamage: 8
    });
    entities.create('bullet', bullet);

    damageSystem.update(16, 1);
    assert(bullet.integrity === 1, `Expected integrity 1, got ${bullet.integrity}`);
    assert(bullet.damage === 15, `Expected damage to decay to 15, got ${bullet.damage}`);
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
