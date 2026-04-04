const assert = require('assert');
const { EventBus } = require('../../../src/engine/core/EventBus');
const { GameEngine } = require('../../../src/engine/core/GameEngine');
const { EntityManager } = require('../../../src/engine/core/EntityManager');
const { Renderer } = require('../../../src/engine/rendering/Renderer');
const { ResourceManager } = require('../../../src/engine/resources/ResourceManager');
const { AnimationPlayer } = require('../../../src/engine/animation/AnimationPlayer');
const { PhysicsWorld } = require('../../../src/engine/physics/PhysicsWorld');
const { TetrisScene } = require('../src/TetrisScene');

function createTestApp() {
  const stdout = { write() {} };
  const eventBus = new EventBus();
  const engine = new GameEngine({ width: 80, height: 32, frameRate: 50 });
  const entities = new EntityManager(eventBus);
  const renderer = new Renderer(80, 32, stdout);
  const callbacks = [];
  const input = {
    onKey(callback) {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    },
    emit(key) {
      callbacks.forEach((callback) => callback(key));
    }
  };

  return {
    width: 80,
    height: 32,
    stdout,
    engine,
    entities,
    renderer,
    input,
    resources: new ResourceManager(),
    animations: new AnimationPlayer(),
    physics: new PhysicsWorld(),
    getRuntime() {
      return { width: 80, height: 32, stdout, eventBus, engine, entities, renderer, input };
    }
  };
}

function run() {
  console.log('Testing TetrisScene...');

  const app = createTestApp();
  const scene = new TetrisScene();
  scene.attach(app);
  scene.enter();

  app.engine.systems[0].update(16, 1);
  app.engine.renderCallback(16, 1, 0);
  const menuFrame = app.renderer.toString();

  assert.ok(menuFrame.includes('Tetris / Terminal Cabinet'));
  assert.strictEqual(scene.mode, 'menu');

  scene.onInput('Enter');
  app.engine.systems[0].update(400, 2);
  app.engine.renderCallback(400, 2, 0);
  const frame = app.renderer.toString();

  assert.ok(frame.includes('CONTROL / NEXT'));
  assert.ok(scene.currentPiece);
  assert.strictEqual(scene.mode, 'playing');

  scene.exit();
  console.log('✓ TetrisScene tests passed');
  return true;
}

module.exports = { run };
