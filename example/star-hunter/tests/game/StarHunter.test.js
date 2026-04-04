const assert = require('assert');
const { EventBus } = require('../../../../src/engine/core/EventBus');
const { GameEngine, GAME_STATE } = require('../../../../src/engine/core/GameEngine');
const { EntityManager } = require('../../../../src/engine/core/EntityManager');
const { Renderer } = require('../../../../src/engine/rendering/Renderer');
const { InputHandler } = require('../../../../src/engine/input/InputHandler');
const { ResourceManager } = require('../../../../src/engine/resources/ResourceManager');
const { AnimationPlayer } = require('../../../../src/engine/animation/AnimationPlayer');
const { PhysicsWorld } = require('../../../../src/engine/physics/PhysicsWorld');
const { StarHunter } = require('../../src/game/StarHunter');

function run() {
  console.log('Testing StarHunter boot...');

  const stdout = {
    chunks: [],
    write(chunk) {
      this.chunks.push(String(chunk));
    }
  };

  const eventBus = new EventBus();
  const engine = new GameEngine({
    width: 80,
    height: 32,
    frameRate: 50,
    initialState: GAME_STATE.RUNNING,
    eventBus
  });
  const runtime = {
    width: 80,
    height: 32,
    stdout,
    eventBus,
    engine,
    entities: new EntityManager(eventBus),
    renderer: new Renderer(80, 32, stdout),
    input: new InputHandler(),
    resources: new ResourceManager(),
    animations: new AnimationPlayer(),
    physics: new PhysicsWorld()
  };

  const game = new StarHunter({ stdout, runtime });
  assert.strictEqual(engine.getState(), GAME_STATE.MENU);

  engine.renderCallback(16, 1, 0);
  const output = stdout.chunks.join('');
  assert.ok(output.includes('星 际 猎 手'));

  game.cleanup();

  console.log('✓ StarHunter boot tests passed');
  return true;
}

module.exports = { run };
