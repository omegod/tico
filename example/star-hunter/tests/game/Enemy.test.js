/**
 * Enemy 实体单元测试
 */

const { Enemy } = require('../../src/game/entities/Enemy');

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
  console.log('Testing Enemy entity...\n');

  // Test: 创建敌人
  if (test('should create enemy', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    assert(enemy !== null, 'Enemy should be created');
    assert(enemy.type === 'enemy', 'Type should be enemy');
  })) passed++; else failed++;

  // Test: 敌人有正确的配置
  if (test('should have correct config', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    assert(enemy.hp === 25, 'HP should be 25 for type 0');
    assert(enemy.score === 80, 'Score should be 80');
    assert(enemy.defense === 0.05, 'Defense should be 0.05');
  })) passed++; else failed++;

  // Test: 入场状态
  if (test('should start not entered for top entry', () => {
    const enemy = Enemy.create(0, 0, 0, 2, 80);
    assert(enemy.entered === false, 'Should not be entered initially');
  })) passed++; else failed++;

  // Test: 移动计时器增加
  if (test('should increment move timer', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.entered = true;
    const initialTimer = enemy.moveTimer;
    enemy.update(16, 1);
    assert(enemy.moveTimer > initialTimer, 'Move timer should increase');
  })) passed++; else failed++;

  // Test: 可以射击
  if (test('should be able to shoot', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.fireTimer = enemy.fireRate; // 达到当前配置阈值
    assert(enemy.canShoot() === true, 'Should be able to shoot');
  })) passed++; else failed++;

  // Test: 重置射击计时器
  if (test('should reset shoot timer', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.fireTimer = 60;
    enemy.resetShootTimer();
    assert(enemy.fireTimer === 0, 'Fire timer should be reset');
  })) passed++; else failed++;

  // Test: HP <= 0 时销毁
  if (test('should destroy when HP <= 0', () => {
    const enemy = Enemy.create(0, 0, 0, 0, 80);
    enemy.takeDamage(100);
    assert(enemy.active === false, 'Enemy should be destroyed');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
