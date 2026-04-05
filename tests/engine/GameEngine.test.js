const assert = require('assert');
const { GameEngine, GAME_STATE } = require('../../src/engine/core/GameEngine');

function run() {
  console.log('Testing GameEngine...');

  const engine = new GameEngine({
    frameRate: 16,
    fixedDelta: 10,
    initialState: GAME_STATE.RUNNING
  });

  const owner = { name: 'scene-owner' };
  const hooks = [];
  const fixedCalls = [];
  const updateCalls = [];

  const lowPrioritySystem = {
    onAttach() {
      hooks.push('attach:low');
    },
    onEnable() {
      hooks.push('enable:low');
    },
    onDisable() {
      hooks.push('disable:low');
    },
    onDetach() {
      hooks.push('detach:low');
    },
    fixedUpdate() {
      fixedCalls.push('low');
    },
    update() {
      updateCalls.push('low');
    }
  };

  const highPrioritySystem = {
    onAttach() {
      hooks.push('attach:high');
    },
    onEnable() {
      hooks.push('enable:high');
    },
    onDisable() {
      hooks.push('disable:high');
    },
    onDetach() {
      hooks.push('detach:high');
    },
    fixedUpdate() {
      fixedCalls.push('high');
    },
    update() {
      updateCalls.push('high');
    }
  };

  engine.registerSystem(lowPrioritySystem, { owner, priority: 20, id: 'low' });
  engine.registerSystem(highPrioritySystem, { priority: 5, id: 'high' });

  assert.deepStrictEqual(engine.systems, [highPrioritySystem, lowPrioritySystem]);
  assert.deepStrictEqual(hooks, [
    'attach:low',
    'enable:low',
    'attach:high',
    'enable:high'
  ]);

  engine.running = true;
  engine.lastFrameTime = Date.now() - 35;
  engine.loopTimeout = null;
  engine.loop();

  assert.ok(fixedCalls.length >= 6);
  assert.deepStrictEqual(fixedCalls.slice(0, 2), ['high', 'low']);
  assert.deepStrictEqual(updateCalls, ['high', 'low']);
  assert.ok(engine.time);
  assert.ok(engine.time.now() > 0);

  assert.strictEqual(engine.setSystemEnabled(lowPrioritySystem, false), true);
  assert.strictEqual(hooks.includes('disable:low'), true);

  fixedCalls.length = 0;
  updateCalls.length = 0;
  engine.lastFrameTime = Date.now() - 16;
  engine.loop();

  assert.ok(fixedCalls.every((value) => value === 'high'));
  assert.deepStrictEqual(updateCalls, ['high']);

  assert.strictEqual(engine.unregisterSystemsByOwner(owner), 1);
  assert.strictEqual(engine.systems.length, 1);
  assert.strictEqual(engine.systems[0], highPrioritySystem);
  assert.strictEqual(hooks.includes('detach:low'), true);

  engine.unregisterSystem(highPrioritySystem);
  assert.strictEqual(engine.systems.length, 0);
  assert.strictEqual(hooks.includes('disable:high'), true);
  assert.strictEqual(hooks.includes('detach:high'), true);

  engine.stop();

  console.log('✓ GameEngine tests passed');
  return true;
}

module.exports = { run };
