const assert = require('assert');
const { EngineApp } = require('../../src/engine/app/EngineApp');
const { Scene } = require('../../src/engine/scene/Scene');

class StubScene extends Scene {
  constructor(name) {
    super(name);
    this.managed = false;
    this.entered = 0;
    this.exited = 0;
  }
  onEnter() { this.entered++; }
  onExit() { this.exited++; }
}

function run() {
  console.log('Testing EngineApp...');

  const stdout = { write() {} };
  const input = {
    initTerminalCalls: 0,
    initCalls: 0,
    cleanupCalls: 0,
    initTerminal() { this.initTerminalCalls++; },
    init() { this.initCalls++; },
    cleanup() { this.cleanupCalls++; }
  };
  const engine = {
    entityManager: null,
    startLoopCalls: 0,
    stopCalls: 0,
    setEntityManager(manager) { this.entityManager = manager; },
    startLoop() { this.startLoopCalls++; },
    stop() { this.stopCalls++; }
  };

  const originalOn = process.on;
  const listeners = [];
  process.on = (event, callback) => {
    listeners.push({ event, callback });
    return process;
  };

  try {
    const app = new EngineApp({ width: 40, height: 20, stdout, input, engine });
    const menu = new StubScene('menu');
    const game = new StubScene('game');

    app.addScene('menu', menu).addScene('game', game);
    const runtime = app.getRuntime();
    assert.strictEqual(runtime.width, 40);
    assert.ok(runtime.resources);
    assert.ok(runtime.animations);
    assert.ok(runtime.physics);

    app.start('menu');
    assert.strictEqual(input.initTerminalCalls, 1);
    assert.strictEqual(input.initCalls, 1);
    assert.strictEqual(engine.startLoopCalls, 1);
    assert.strictEqual(menu.entered, 1);
    assert.ok(listeners.some((item) => item.event === 'exit'));
    assert.ok(listeners.some((item) => item.event === 'SIGINT'));

    app.switchScene('game');
    assert.strictEqual(menu.exited, 1);
    assert.strictEqual(game.entered, 1);

    app.stop();
    assert.strictEqual(engine.stopCalls, 1);
    assert.strictEqual(input.cleanupCalls, 1);
  } finally {
    process.on = originalOn;
  }

  console.log('✓ EngineApp tests passed');
  return true;
}

module.exports = { run };
