const assert = require('assert');
const { EngineTime } = require('../../src/engine/core/EngineTime');

function run() {
  console.log('Testing EngineTime...');

  const time = new EngineTime();
  const owner = { name: 'scene' };
  const calls = [];

  time.initialize(1000);

  time.after(30, (ctx) => {
    calls.push(`after:${ctx.frame}`);
  }, { owner });

  time.every(10, (ctx) => {
    calls.push(`every:${ctx.frame}`);
    return calls.filter((value) => value.startsWith('every:')).length < 2;
  }, { owner });

  time.nextFrame((ctx) => {
    calls.push(`next:${ctx.frame}`);
  }, { owner });

  time.advance({ now: 1010, delta: 10, unscaledDelta: 10, fixedDelta: 10, alpha: 0, frame: 1, paused: false });
  time.advance({ now: 1020, delta: 10, unscaledDelta: 10, fixedDelta: 10, alpha: 0, frame: 2, paused: false });
  time.advance({ now: 1030, delta: 10, unscaledDelta: 10, fixedDelta: 10, alpha: 0, frame: 3, paused: false });

  assert.deepStrictEqual(calls, [
    'every:1',
    'next:1',
    'every:2',
    'after:3'
  ]);
  assert.strictEqual(time.now(), 30);
  assert.strictEqual(time.realNow(), 1030);
  assert.strictEqual(time.delta(), 10);
  assert.strictEqual(time.unscaledDelta(), 10);
  assert.strictEqual(time.frame(), 3);

  const unscaled = [];
  time.after(5, (ctx) => {
    unscaled.push(`wall:${ctx.frame}`);
  }, { scaled: false });

  time.advance({ now: 1040, delta: 0, unscaledDelta: 10, fixedDelta: 10, alpha: 0, frame: 4, paused: true });
  assert.deepStrictEqual(unscaled, ['wall:4']);
  assert.strictEqual(time.now(), 30);
  assert.strictEqual(time.isPaused(), true);

  time.after(20, () => {
    throw new Error('cancelByOwner should have removed this task');
  }, { owner });
  assert.strictEqual(time.cancelByOwner(owner), 1);

  const handle = time.after(20, () => {
    throw new Error('cancel should prevent execution');
  });
  assert.strictEqual(time.cancel(handle), true);

  const sequenceCalls = [];
  const sequenceOwner = { name: 'sequence-owner' };
  const sequence = time.createSequence({ owner: sequenceOwner, scaled: false });
  sequence
    .call((ctx) => {
      sequenceCalls.push(`start:${ctx.frame}`);
    })
    .wait(5)
    .call((ctx) => {
      sequenceCalls.push(`finish:${ctx.skipped}`);
    })
    .start();

  time.advance({ now: 1050, delta: 10, unscaledDelta: 10, fixedDelta: 10, alpha: 0, frame: 5, paused: false });
  assert.strictEqual(time.now(), 40);
  assert.deepStrictEqual(sequenceCalls, ['start:4', 'finish:false']);

  const skippedCalls = [];
  const skipped = time.createSequence();
  skipped
    .wait(20)
    .call((ctx) => {
      skippedCalls.push(`skip:${ctx.skipped}`);
    })
    .start();
  assert.strictEqual(skipped.skip(), true);
  assert.deepStrictEqual(skippedCalls, ['skip:true']);

  const cancelledSequence = time.createSequence({ owner: sequenceOwner });
  cancelledSequence.wait(20).call(() => {
    throw new Error('cancelByOwner should remove sequence');
  }).start();
  assert.strictEqual(time.cancelByOwner(sequenceOwner), 1);

  console.log('✓ EngineTime tests passed');
  return true;
}

module.exports = { run };
