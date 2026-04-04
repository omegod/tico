const assert = require('assert');
const { GameEngine, GAME_STATE } = require('../../src/engine/core/GameEngine');

function run() {
  console.log('Testing GameEngine...');

  const engine = new GameEngine({
    frameRate: 16,
    fixedDelta: 10,
    initialState: GAME_STATE.RUNNING
  });

  let fixedCalls = 0;
  let updateCalls = 0;

  engine.registerSystem({
    fixedUpdate() {
      fixedCalls++;
    },
    update() {
      updateCalls++;
    }
  });

  engine.running = true;
  engine.lastFrameTime = Date.now() - 35;
  engine.loopTimeout = null;
  engine.loop();
  engine.stop();

  assert.ok(fixedCalls >= 3);
  assert.strictEqual(updateCalls, 1);

  console.log('✓ GameEngine tests passed');
  return true;
}

module.exports = { run };
