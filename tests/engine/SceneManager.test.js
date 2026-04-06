const assert = require('assert');
const { Scene } = require('../../src/engine/scene/Scene');
const { SceneManager } = require('../../src/engine/scene/SceneManager');
const { Renderer } = require('../../src/engine/rendering/Renderer');

class TestScene extends Scene {
  constructor(name, options = {}) {
    super(name, options);
    this.entered = 0;
    this.exited = 0;
    this.covered = 0;
    this.revealed = 0;
    this.updated = 0;
    this.rendered = 0;
    this.inputs = 0;
    this.drawX = options.drawX || 0;
  }

  onEnter() {
    this.entered++;
  }

  onExit() {
    this.exited++;
  }

  onCovered() {
    this.covered++;
  }

  onRevealed() {
    this.revealed++;
  }

  onUpdate() {
    this.updated++;
  }

  onRender({ renderer }) {
    this.rendered++;
    renderer.drawString(this.drawX, 0, this.name[0].toUpperCase());
  }

  onInput() {
    this.inputs++;
  }
}

function run() {
  console.log('Testing SceneManager...');

  const stdout = { writes: [], write(chunk) { this.writes.push(chunk); } };
  const inputCallbacks = [];
  const app = {
    width: 20,
    height: 10,
    stdout,
    renderer: new Renderer(20, 10, stdout),
    animations: { updates: 0, update() { this.updates++; } },
    time: {
      cancelledOwners: [],
      cancelByOwner(owner) {
        this.cancelledOwners.push(owner);
      }
    },
    engine: {
      registered: [],
      renderCallback: null,
      registerSystem(system) {
        this.registered.push(system);
      },
      unregisterSystemsByOwner(owner) {
        this.registered = [];
        this.lastOwner = owner;
      },
      onRender(callback) {
        this.renderCallback = callback;
      }
    },
    input: {
      afterFrameCalled: 0,
      onKey(callback) {
        inputCallbacks.push(callback);
        return () => {
          const index = inputCallbacks.indexOf(callback);
          if (index !== -1) {
            inputCallbacks.splice(index, 1);
          }
        };
      },
      afterFrame() {
        this.afterFrameCalled++;
      }
    }
  };
  const manager = new SceneManager(app);
  const menu = new TestScene('menu', { drawX: 0 });
  const pause = new TestScene('pause', {
    drawX: 1,
    opaque: false,
    blocksUpdate: true,
    blocksInput: true
  });
  const hud = new TestScene('hud', {
    drawX: 2,
    opaque: false,
    blocksUpdate: false,
    blocksInput: false
  });
  const game = new TestScene('game', { drawX: 3 });

  manager.add('menu', menu);
  manager.add('pause', pause);
  manager.add('hud', hud);
  manager.add('game', game);

  manager.start('menu');
  assert.strictEqual(menu.entered, 1);
  assert.strictEqual(manager.current, menu);
  assert.strictEqual(app.engine.registered.length, 1);

  manager.push('pause');
  assert.strictEqual(menu.covered, 1);
  assert.strictEqual(pause.entered, 1);
  assert.strictEqual(manager.current, pause);

  app.engine.registered[0].update(16, 1, {});
  app.engine.renderCallback(16, 1, 0);
  inputCallbacks[0]('Enter', {});

  assert.strictEqual(menu.updated, 0);
  assert.strictEqual(pause.updated, 1);
  assert.strictEqual(menu.rendered, 1);
  assert.strictEqual(pause.rendered, 1);
  assert.strictEqual(menu.inputs, 0);
  assert.strictEqual(pause.inputs, 1);
  assert.strictEqual(app.renderer.getBuffer().getCell(0, 0).char, 'M');
  assert.strictEqual(app.renderer.getBuffer().getCell(1, 0).char, 'P');

  manager.pop();
  assert.strictEqual(pause.exited, 1);
  assert.strictEqual(menu.revealed, 1);
  assert.strictEqual(manager.current, menu);

  manager.push('hud');
  app.engine.registered[0].update(16, 2, {});
  inputCallbacks[0]('Enter', {});
  assert.strictEqual(menu.updated, 1);
  assert.strictEqual(hud.updated, 1);
  assert.strictEqual(menu.inputs, 1);
  assert.strictEqual(hud.inputs, 1);

  manager.switchTo('game');
  assert.strictEqual(menu.exited, 1);
  assert.strictEqual(hud.exited, 1);
  assert.strictEqual(game.entered, 1);
  assert.strictEqual(manager.current, game);

  manager.stop();
  assert.strictEqual(game.exited, 1);
  assert.strictEqual(manager.current, null);
  assert.strictEqual(app.engine.registered.length, 0);
  assert.strictEqual(app.input.afterFrameCalled, 1);

  console.log('✓ SceneManager tests passed');
  return true;
}

module.exports = { run };
