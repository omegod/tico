const assert = require('assert');
const { Modal } = require('../../src/engine/ui/Modal');
const { ScreenBuffer } = require('../../src/engine/rendering/ScreenBuffer');

function run() {
  console.log('Testing Modal...');

  const modal = new Modal(80, 32);
  let resumed = 0;
  let exited = 0;
  let confirmed = 0;
  let canceled = 0;

  modal.showPause(() => { resumed++; }, () => { exited++; });
  assert.strictEqual(modal.isActive(), true);
  assert.strictEqual(modal.getSelectedIndex(), 0);
  assert.strictEqual(modal.getSelectedItem(), '继续游戏');

  modal.selectNext();
  assert.strictEqual(modal.getSelectedIndex(), 1);
  modal.selectPrev();
  assert.strictEqual(modal.getSelectedIndex(), 0);
  modal.confirm();
  assert.strictEqual(resumed, 1);
  assert.strictEqual(modal.isActive(), false);

  modal.showConfirm('确认删除', () => { confirmed++; }, () => { canceled++; });
  modal.select(1);
  assert.strictEqual(modal.getSelectedItem(), '取消');

  const buffer = new ScreenBuffer(80, 32);
  modal.render(buffer);
  const text = modal.renderToString();
  assert.ok(text.includes('确认删除'));

  modal.confirm();
  assert.strictEqual(canceled, 1);

  modal.showConfirm('再次确认', () => { confirmed++; }, () => { canceled++; });
  modal.select(0);
  modal.confirm();
  assert.strictEqual(confirmed, 1);

  modal.close();
  assert.strictEqual(modal.isActive(), false);

  console.log('✓ Modal tests passed');
  return true;
}

module.exports = { run };
