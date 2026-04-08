/**
 * Boss 实体单元测试
 */

const { Boss } = require('../../src/game/entities/Boss');
const { handleBossPhaseEntry } = require('../../src/game/configs/bosses');
const { EventBus } = require('../../../../src/engine/core/EventBus');
const { StarHunter } = require('../../src/game/StarHunter');
const { StarHunterEntityManager } = require('../../src/game/StarHunterEntityManager');

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
  console.log('Testing Boss entity...\n');

  let passed = 0;
  let failed = 0;

  if (test('should keep wave 4 boss drifting smoothly', () => {
    const boss = Boss.create(4, 80);
    boss.entered = true;
    boss.y = boss.targetY;
    boss.moveTimer = 41;

    const startX = boss.x;
    boss.update(16, 1, null);

    assert(Math.abs(boss.x - startX) <= boss.maxMoveStepX + 1e-6, 'Drift movement should stay smooth');
  })) passed++; else failed++;

  if (test('should suppress shooting while diving', () => {
    const boss = Boss.create(2, 80);
    boss.entered = true;
    boss.y = boss.targetY;
    boss.isDiving = true;

    const bullets = [];
    boss.updateShooting(bullets, null, { getEnemies: () => [] });

    assert(bullets.length === 0, 'Boss should not fire while diving');
    assert(boss.fireTimer === 0, 'Fire timer should pause during dive');
  })) passed++; else failed++;

  if (test('should trigger immediate summon on wave 1 phase entry', () => {
    const boss = Boss.create(1, 80);
    boss.phase = 1;
    const created = [];
    const entities = {
      getEnemies: () => [],
      create: (type, entity) => {
        if (type === 'enemy') created.push(entity);
      }
    };

    handleBossPhaseEntry(boss, entities);

    assert(created.length === 1, 'Wave 1 should summon immediately on phase entry');
  })) passed++; else failed++;

  if (test('should trigger immediate dive on wave 2 phase entry', () => {
    const boss = Boss.create(2, 80);
    boss.phase = 1;
    boss.entered = true;
    boss.y = boss.targetY;

    handleBossPhaseEntry(boss, { getEnemies: () => [] });

    assert(boss.isDiving === true, 'Wave 2 should start diving immediately on phase entry');
    assert(boss.behaviorState.divePhase === 'down' || boss.behaviorState.divePhase === 'up', 'Dive state should be initialized');
    assert(boss.y > boss.targetY, 'Wave 2 should move down immediately');
  })) passed++; else failed++;

  if (test('should trigger immediate summon on wave 5 phase entry', () => {
    const boss = Boss.create(5, 80);
    boss.phase = 1;
    const created = [];
    const entities = {
      getEnemies: () => [],
      create: (type, entity) => {
        if (type === 'enemy') created.push(entity);
      }
    };

    handleBossPhaseEntry(boss, entities);

    assert(created.length === 1, 'Wave 5 should summon immediately on phase entry');
  })) passed++; else failed++;

  if (test('should restore player during boss transition when player is missing', () => {
    const game = Object.create(StarHunter.prototype);
    game.entities = new StarHunterEntityManager(new EventBus());
    game.selectedShip = 0;
    game.missileCapacity = 10;
    game.missileReloadFrames = null;
    game.missileReloadTimer = 0;
    game.powerCount = 3;
    game._syncMissileState = StarHunter.prototype._syncMissileState;
    game._getOrRestoreTransitionPlayer = StarHunter.prototype._getOrRestoreTransitionPlayer;

    const player = game._getOrRestoreTransitionPlayer();
    assert(player !== null, 'Player should be recreated');
    assert(game.entities.getPlayer() === player, 'Recreated player should be stored in entity manager');
    assert(player.active === true, 'Recreated player should be active');
    assert(player.invincibleTimer === 30, 'Recreated player should get transition invincibility');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
