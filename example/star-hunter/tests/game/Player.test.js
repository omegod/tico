/**
 * Player 实体单元测试
 */

const { Player } = require('../../src/game/entities/Player');

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
  console.log('Testing Player entity...\n');

  // Test: 创建玩家
  if (test('should create player', () => {
    const player = Player.create(0, 80, 32);
    assert(player !== null, 'Player should be created');
    assert(player.type === 'player', 'Type should be player');
    assert(player.missileCapacity === 10, `Expected missile capacity 10, got ${player.missileCapacity}`);
  })) passed++; else failed++;

  if (test('should configure missile auto reload for ship 1 and ship 3', () => {
    const ship1 = Player.create(0, 80, 32);
    const ship3 = Player.create(2, 80, 32);
    assert(ship1.missileReloadFrames === 200, `Expected ship 1 reload 200, got ${ship1.missileReloadFrames}`);
    assert(ship3.missileReloadFrames === 300, `Expected ship 3 reload 300, got ${ship3.missileReloadFrames}`);
    assert(ship3.speed === 1.5, `Expected ship 3 speed 1.5, got ${ship3.speed}`);
  })) passed++; else failed++;

  // Test: 移动
  if (test('should move player', () => {
    const player = Player.create(0, 80, 32);
    const initialX = player.x;
    player.move(1, 0, 80, 32);
    assert(player.x > initialX, 'X should increase');
  })) passed++; else failed++;

  // Test: 边界限制
  if (test('should not move beyond boundaries', () => {
    const player = Player.create(0, 80, 32);
    player.x = 1;
    player.move(-1, 0, 80, 32);
    assert(player.x >= 1, 'Should not go beyond left boundary');
  })) passed++; else failed++;

  // Test: 护盾开关
  if (test('should toggle shield', () => {
    const player = Player.create(0, 80, 32);
    player.shield = 10;
    assert(player.shieldActive === false, 'Shield should start inactive');
    player.toggleShield();
    assert(player.shieldActive === true, 'Shield should be active after toggle');
    player.toggleShield();
    assert(player.shieldActive === false, 'Shield should be inactive after second toggle');
  })) passed++; else failed++;

  // Test: 护盾耗尽自动关闭
  if (test('should auto disable shield when depleted', () => {
    const player = Player.create(0, 80, 32);
    player.shield = 1;
    player.shieldActive = true;
    player.takeDamage(100); // 大量伤害
    assert(player.shield === 0, 'Shield should be 0');
    assert(player.shieldActive === false, 'Shield should auto disable');
  })) passed++; else failed++;

  // Test: 无敌状态
  if (test('should be invincible when timer > 0', () => {
    const player = Player.create(0, 80, 32);
    player.setInvincible(60);
    const result = player.takeDamage(100);
    assert(result.blocked === true, 'Damage should be blocked');
    assert(player.hp === 100, 'HP should not change');
  })) passed++; else failed++;

  // Test: 防御力减伤
  if (test('should reduce damage based on defense', () => {
    const player = Player.create(0, 80, 32);
    player.defense = 0.5; // 50% defense
    player.setInvincible(0);
    const initialHp = player.hp;
    const result = player.takeDamage(100);
    assert(result.actualDamage === 50, 'Should take 50 damage (100 * 0.5)');
    assert(player.hp === initialHp - 50, 'HP should reduce by 50');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
