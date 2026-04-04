const assert = require('assert');
const { Scene } = require('../../src/engine/scene/Scene');
const { Renderer } = require('../../src/engine/rendering/Renderer');
const { AnimationPlayer } = require('../../src/engine/animation/AnimationPlayer');

class DemoScene extends Scene {
  constructor() {
    super('demo');
    this.entered = 0;
    this.exited = 0;
    this.updated = 0;
    this.fixed = 0;
    this.rendered = 0;
    this.inputs = 0;
  }

  onEnter() { this.entered++; }
  onExit() { this.exited++; }
  onUpdate() { this.updated++; }
  onFixedUpdate() { this.fixed++; }
  onRender({ renderer }) {
    this.rendered++;
    renderer.drawString(1, 1, 'scene');
  }
  onInput() { this.inputs++; }
}

function run() {
  console.log('Testing Scene...');

  const stdout = { writes: [], write(chunk) { this.writes.push(chunk); } };
  const callbacks = [];
  const app = {
    width: 20,
    height: 10,
    stdout,
    renderer: new Renderer(20, 10, stdout),
    animations: new AnimationPlayer(),
    engine: {
      registered: [],
      registerSystem(system) { this.registered.push(system); },
      unregisterSystem(system) { this.registered = this.registered.filter((item) => item !== system); },
      onRender(callback) { this.renderCallback = callback; }
    },
    input: {
      onKey(callback) {
        callbacks.push(callback);
        return () => {
          const index = callbacks.indexOf(callback);
          if (index !== -1) callbacks.splice(index, 1);
        };
      },
      afterFrameCalled: 0,
      afterFrame() { this.afterFrameCalled++; }
    }
  };

  const scene = new DemoScene();
  scene.attach(app);
  scene.enter();

  assert.strictEqual(scene.entered, 1);
  assert.strictEqual(app.engine.registered.length, 1);

  app.engine.registered[0].fixedUpdate(16, 1);
  app.engine.registered[0].update(16, 1, {});
  app.engine.renderCallback(16, 1, 0);
  callbacks[0]('Enter', {});

  assert.strictEqual(scene.fixed, 1);
  assert.strictEqual(scene.updated, 1);
  assert.strictEqual(scene.rendered, 1);
  assert.strictEqual(scene.inputs, 1);
  assert.ok(stdout.writes.length >= 2);

  scene.exit();
  assert.strictEqual(scene.exited, 1);
  assert.strictEqual(app.engine.registered.length, 0);
  assert.strictEqual(app.renderer.getCamera(), null);

  scene.detach();
  assert.strictEqual(scene.app, null);

  console.log('✓ Scene tests passed');
  return true;
}

module.exports = { run };
