const assert = require('assert');
const { BORDER_STYLES } = require('../../src/engine/layout');
const { PanelWidget } = require('../../src/engine/widgets/PanelWidget');
const { MenuWidget } = require('../../src/engine/widgets/MenuWidget');
const { TextWidget } = require('../../src/engine/widgets/TextWidget');
const { DialogWidget } = require('../../src/engine/widgets/DialogWidget');
const { strWidth, stripAnsi } = require('../../src/engine/rendering/ScreenBuffer');

function run() {
  console.log('Testing Widgets...');

  const roundedPanel = new PanelWidget({
    border: 'rounded',
    title: '标题',
    width: 12,
    children: [new TextWidget({ text: '生命值 １２３' })]
  });
  const roundedLines = roundedPanel.render({ availableWidth: 40 });
  assert.ok(roundedLines[0].includes('╭'));
  assert.ok(roundedLines[roundedLines.length - 1].includes('╯'));
  assert.strictEqual(strWidth(stripAnsi(roundedLines[0])), strWidth(stripAnsi(roundedLines[1])));

  const menu = new MenuWidget({
    items: ['开始', '设置', '退出'],
    selectedIndex: 1
  });
  const menuLines = menu.render();
  assert.ok(menuLines[1].includes('设置'));
  assert.strictEqual(strWidth(stripAnsi(menuLines[0])), strWidth(stripAnsi(menuLines[1])));

  const dialog = new DialogWidget({
    title: '菜单',
    border: 'double',
    content: ['选择一项'],
    items: ['继续', '返回主菜单']
  });
  const dialogLines = dialog.render({ availableWidth: 60 });
  assert.ok(dialogLines[0].includes('╔'));
  assert.ok(dialogLines.some((line) => line.includes('返回主菜单')));

  const serializedStyles = Object.entries(BORDER_STYLES)
    .filter(([, value]) => value)
    .map(([name, value]) => [name, JSON.stringify(value)]);
  assert.strictEqual(new Set(serializedStyles.map(([, value]) => value)).size, serializedStyles.length);

  console.log('✓ Widget tests passed');
  return true;
}

module.exports = { run };
