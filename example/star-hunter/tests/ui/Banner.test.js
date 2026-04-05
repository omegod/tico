const assert = require('assert');
const { EngineTime } = require('../../../../src/engine/core/EngineTime');
const { ScreenBuffer } = require('../../../../src/engine/rendering/ScreenBuffer');
const { Banner } = require('../../src/game/ui/Banner');

function run() {
  console.log('Testing StarHunter Banner...');

  const banner = new Banner(80, 32);
  let closed = 0;
  banner.show({
    title: 'Title',
    lines: ['Line 1', 'Line 2'],
    overlay: true,
    duration: 0,
    closable: false,
    onClose: () => { closed++; }
  });

  assert.strictEqual(banner.isActive(), true);
  assert.strictEqual(banner.isOverlay(), true);
  assert.strictEqual(banner.isClosable(), false);

  const buffer = new ScreenBuffer(80, 32);
  banner.render(buffer);
  const rendered = banner.renderToString();
  assert.ok(rendered.includes('Title'));
  assert.ok(rendered.includes('Line 1'));

  banner.close();
  assert.strictEqual(closed, 1);
  assert.strictEqual(banner.isActive(), false);

  banner.show({
    title: 'Warning',
    lines: ['Boss incoming', 'HP 100'],
    footer: 'Press confirm',
    closable: false
  });
  assert.strictEqual(banner.isClosable(), false);
  assert.ok(banner.renderToString().includes('Boss incoming'));

  banner.show({
    title: 'Story',
    lines: ['A', 'B'],
    overlay: true
  });
  banner.closeAll();
  assert.strictEqual(banner.isActive(), false);

  const time = new EngineTime();
  time.initialize(0);

  const queuedBanner = new Banner(80, 32, { scheduler: time });
  const queueClosed = [];
  queuedBanner.show({
    title: 'First',
    lines: ['A'],
    duration: 100,
    onClose: () => { queueClosed.push('first'); }
  });
  queuedBanner.show({
    title: 'Second',
    lines: ['B'],
    duration: 50,
    onClose: () => { queueClosed.push('second'); }
  });

  time.advance({ now: 99, delta: 99, unscaledDelta: 99 });
  assert.deepStrictEqual(queueClosed, []);
  assert.ok(queuedBanner.renderToString().includes('First'));

  time.advance({ now: 100, delta: 1, unscaledDelta: 1 });
  assert.deepStrictEqual(queueClosed, ['first']);
  assert.ok(queuedBanner.renderToString().includes('Second'));

  time.advance({ now: 149, delta: 49, unscaledDelta: 49 });
  assert.deepStrictEqual(queueClosed, ['first']);

  time.advance({ now: 150, delta: 1, unscaledDelta: 1 });
  assert.deepStrictEqual(queueClosed, ['first', 'second']);
  assert.strictEqual(queuedBanner.isActive(), false);

  const cancelledBanner = new Banner(80, 32, { scheduler: time });
  let cancelledClosed = 0;
  cancelledBanner.show({
    title: 'Timed',
    lines: ['C'],
    duration: 100,
    onClose: () => { cancelledClosed++; }
  });
  cancelledBanner.closeAll();
  time.advance({ now: 250, delta: 100, unscaledDelta: 100 });
  assert.strictEqual(cancelledClosed, 1);

  console.log('✓ StarHunter Banner tests passed');
  return true;
}

module.exports = { run };
