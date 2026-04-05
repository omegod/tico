const assert = require('assert');
const { ScreenBuffer } = require('../../../../src/engine/rendering/ScreenBuffer');
const { Modal } = require('../../src/game/ui/Modal');

function run() {
  console.log('Testing StarHunter Modal...');

  const modal = new Modal(80, 32);
  let resumed = 0;
  let exited = 0;
  let quit = 0;
  let confirmed = 0;
  let canceled = 0;

  modal.show({
    title: 'Pause',
    items: ['Resume', 'Menu', 'Quit'],
    selectedIndex: 0,
    onSelect: (index) => {
      if (index === 0) resumed++;
      else if (index === 1) exited++;
      else if (index === 2) quit++;
    }
  });
  assert.strictEqual(modal.isActive(), true);
  assert.strictEqual(modal.getSelectedIndex(), 0);
  assert.strictEqual(modal.getSelectedItem(), 'Resume');

  modal.selectNext();
  assert.strictEqual(modal.getSelectedIndex(), 1);
  modal.selectPrev();
  assert.strictEqual(modal.getSelectedIndex(), 0);
  modal.confirm();
  assert.strictEqual(resumed, 1);
  assert.strictEqual(modal.isActive(), false);

  modal.show({
    title: 'Pause',
    items: ['Resume', 'Menu', 'Quit'],
    selectedIndex: 0,
    onSelect: (index) => {
      if (index === 0) resumed++;
      else if (index === 1) exited++;
      else if (index === 2) quit++;
    }
  });
  modal.select(2);
  modal.confirm();
  assert.strictEqual(quit, 1);
  assert.strictEqual(modal.isActive(), false);

  modal.show({
    title: 'Confirm',
    content: ['Delete file?'],
    items: ['Confirm', 'Cancel'],
    selectedIndex: 1,
    onSelect: (index) => {
      if (index === 0) confirmed++;
      else if (index === 1) canceled++;
    }
  });
  modal.select(1);
  assert.strictEqual(modal.getSelectedItem(), 'Cancel');

  const buffer = new ScreenBuffer(80, 32);
  modal.render(buffer);
  const text = modal.renderToString();
  assert.ok(text.includes('Delete file?'));

  modal.confirm();
  assert.strictEqual(canceled, 1);

  modal.show({
    title: 'Confirm',
    content: ['Try again?'],
    items: ['Confirm', 'Cancel'],
    selectedIndex: 1,
    onSelect: (index) => {
      if (index === 0) confirmed++;
      else if (index === 1) canceled++;
    }
  });
  modal.select(0);
  modal.confirm();
  assert.strictEqual(confirmed, 1);

  modal.close();
  assert.strictEqual(modal.isActive(), false);

  console.log('✓ StarHunter Modal tests passed');
  return true;
}

module.exports = { run };
