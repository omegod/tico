const assert = require('assert');
const { Scene } = require('../../src/engine/scene/Scene');
const { SceneManager } = require('../../src/engine/scene/SceneManager');

class TestScene extends Scene {
  constructor(name) {
    super(name);
    this.managed = false;
    this.entered = 0;
    this.exited = 0;
  }

  onEnter() {
    this.entered++;
  }

  onExit() {
    this.exited++;
  }
}

function run() {
  console.log('Testing SceneManager...');

  const app = {};
  const manager = new SceneManager(app);
  const menu = new TestScene('menu');
  const game = new TestScene('game');

  manager.add('menu', menu);
  manager.add('game', game);

  manager.start('menu');
  assert.strictEqual(menu.entered, 1);
  assert.strictEqual(manager.current, menu);

  manager.switchTo('game');
  assert.strictEqual(menu.exited, 1);
  assert.strictEqual(game.entered, 1);
  assert.strictEqual(manager.current, game);

  manager.stop();
  assert.strictEqual(game.exited, 1);
  assert.strictEqual(manager.current, null);

  console.log('✓ SceneManager tests passed');
  return true;
}

module.exports = { run };
