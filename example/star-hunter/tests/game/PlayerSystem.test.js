/**
 * PlayerSystem 单元测试
 */

const { EventBus } = require('../../../../src/engine/core/EventBus');
const { StarHunterEntityManager } = require('../../src/game/StarHunterEntityManager');
const { Player } = require('../../src/game/entities/Player');
const { PlayerSystem } = require('../../src/game/systems/PlayerSystem');

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
  console.log('Testing PlayerSystem...\n');

  let passed = 0;
  let failed = 0;

  if (test('should deploy gyro field for TWO_ROW ships', () => {
    const eventBus = new EventBus();
    const entities = new StarHunterEntityManager(eventBus);
    const system = new PlayerSystem(eventBus, entities);
    entities.setPlayer(Player.create(1, 80, 32));

    const bullets = system.firePower(1);
    assert(bullets.length === 5, `Expected 5 bullets, got ${bullets.length}`);
    assert(bullets.some(b => b.behavior === 'GYRO_CORE'), 'Balanced ship should deploy a gyro core');
    assert(bullets.find(b => b.behavior === 'GYRO_CORE').deployFrames === 5, 'Balanced ship should burst earlier');
  })) passed++; else failed++;

  if (test('should charge and release rail salvo for sniper ships', () => {
    const eventBus = new EventBus();
    const entities = new StarHunterEntityManager(eventBus);
    const system = new PlayerSystem(eventBus, entities);
    entities.setPlayer(Player.create(2, 80, 32));

    const bullets = system.firePower(1);
    assert(bullets.length === 6, `Expected 6 bullets, got ${bullets.length}`);
    assert(bullets.filter(b => b.pierce).length === 5, 'Sniper missile should release five piercing rails');
    assert(bullets.some(b => b.delayFrames === 8), 'Sniper missile should have a charge delay');
  })) passed++; else failed++;

  if (test('should deploy hovering shield nodes and recover for guardian ships', () => {
    const eventBus = new EventBus();
    const entities = new StarHunterEntityManager(eventBus);
    const system = new PlayerSystem(eventBus, entities);
    const player = Player.create(3, 80, 32);
    player.hp = 120;
    player.shield = 5;
    entities.setPlayer(player);

    const bullets = system.firePower(1);
    assert(bullets.length === 5, `Expected 5 bullets, got ${bullets.length}`);
    assert(bullets.every(b => b.behavior === 'BARRIER_NODE'), 'Guardian missiles should become shield nodes');
    assert(bullets.every(b => b.width >= 5 && b.height === 3), 'Guardian missiles should render as blast zones');
    assert(player.hp === 150, `Expected recovered HP to be 150, got ${player.hp}`);
    assert(player.shield === 20, `Expected recovered shield to be 20, got ${player.shield}`);
  })) passed++; else failed++;

  if (test('should create three ricochet bullets for storm ships', () => {
    const eventBus = new EventBus();
    const entities = new StarHunterEntityManager(eventBus);
    const system = new PlayerSystem(eventBus, entities);
    entities.setPlayer(Player.create(4, 80, 32));

    const bullets = system.firePower(1);
    assert(bullets.length === 3, `Expected 3 bullets, got ${bullets.length}`);
    assert(bullets.every(b => b.behavior === 'RICOCHET'), 'Storm missiles should become ricochet bullets');
    assert(new Set(bullets.map(b => `${b.x},${b.y}`)).size === 3, 'Storm missiles should start from different areas');
  })) passed++; else failed++;

  if (test('should create upward barrage for ultimate ships', () => {
    const eventBus = new EventBus();
    const entities = new StarHunterEntityManager(eventBus);
    const system = new PlayerSystem(eventBus, entities);
    entities.setPlayer(Player.create(5, 80, 32));

    const bullets = system.firePower(1);
    assert(bullets.length > 20, `Expected barrage bullets, got ${bullets.length}`);
    assert(bullets.every(b => b.vy < 0), 'Ultimate missiles should move upward');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
