const assert = require('assert');
const { Banner } = require('../../src/engine/ui/Banner');
const { ScreenBuffer } = require('../../src/engine/rendering/ScreenBuffer');

function run() {
  console.log('Testing Banner...');

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

  banner.showBossWarning('Boss', 100, 0.2, 3, { subtitle: 'Phase 1' });
  assert.strictEqual(banner.isClosable(), false);
  assert.ok(banner.renderToString().includes('Boss'));

  banner.showStory('Story', ['A', 'B']);
  banner.closeAll();
  assert.strictEqual(banner.isActive(), false);

  console.log('✓ Banner tests passed');
  return true;
}

module.exports = { run };
