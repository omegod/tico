/**
 * Powerup 配置单元测试
 */

const { Powerup } = require('../../src/game/entities/Powerup');
const { PowerupType, getPowerupConfig } = require('../../src/game/configs/powerups');

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
  console.log('Testing Powerup config...\n');

  let passed = 0;
  let failed = 0;

  if (test('should rename POWER to 导弹', () => {
    const config = getPowerupConfig(PowerupType.POWER);
    assert(config.name === '导弹', `Expected 导弹, got ${config.name}`);
  })) passed++; else failed++;

  if (test('should create 2-line missile powerup art', () => {
    const powerup = Powerup.create(PowerupType.MISSILE, 10, 5);
    assert(Array.isArray(powerup.art), 'Missile powerup should have art');
    assert(powerup.art.length === 2, `Expected 2 lines, got ${powerup.art.length}`);
    assert(powerup.width > 1, 'Missile powerup should have width > 1');
    assert(powerup.height === 2, `Expected height 2, got ${powerup.height}`);
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
