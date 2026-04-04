const assert = require('assert');
const { EventEmitter } = require('events');
const readline = require('readline');
const { InputHandler } = require('../../src/engine/input/InputHandler');
const { ActionMap } = require('../../src/engine/input/ActionMap');

function run() {
  console.log('Testing InputHandler...');

  const stdin = new EventEmitter();
  stdin.isTTY = true;
  stdin.setRawModeCalls = [];
  stdin.setRawMode = function(value) { this.setRawModeCalls.push(value); };

  const stdout = { writes: [], write(chunk) { this.writes.push(chunk); } };

  const originalCreateInterface = readline.createInterface;
  const originalEmit = readline.emitKeypressEvents;
  let closed = 0;
  readline.createInterface = () => ({ close() { closed++; } });
  readline.emitKeypressEvents = () => {};

  try {
    const input = new InputHandler({ releaseTimeoutMs: 10 });
    input.stdin = stdin;
    input.stdout = stdout;

    let received = null;
    const off = input.onKey((key) => { received = key; });
    input.init();
    assert.strictEqual(input.enabled, true);
    assert.deepStrictEqual(stdin.setRawModeCalls, [true]);

    stdin.emit('keypress', 'w', { name: 'w', sequence: 'w' });
    assert.strictEqual(received, 'w');
    assert.strictEqual(input.isPressed('w'), true);
    assert.strictEqual(input.isJustPressed('w'), true);

    const context = input.createContext(new ActionMap({ UP: ['w'] }));
    stdin.emit('keypress', 'w', { name: 'w', sequence: 'w' });
    assert.strictEqual(context.peek('UP'), true);
    assert.strictEqual(context.consume('UP'), true);
    assert.strictEqual(context.consume('UP'), false);

    input.afterFrame(Date.now() + 20);
    assert.strictEqual(input.isJustReleased('w'), true);

    input.releaseKey('w');
    input.clearPressedKeys();
    assert.strictEqual(input.getPressedKeys().size, 0);

    off();
    context.destroy();
    input.initTerminal();
    assert.ok(stdout.writes.some((chunk) => chunk.includes('\x1b[?1049h')));

    input.cleanup();
    assert.strictEqual(closed, 1);
    assert.deepStrictEqual(stdin.setRawModeCalls, [true, false]);
  } finally {
    readline.createInterface = originalCreateInterface;
    readline.emitKeypressEvents = originalEmit;
  }

  console.log('✓ InputHandler tests passed');
  return true;
}

module.exports = { run };
