const assert = require('assert');
const { Renderer, COLORS, Layer, RenderSpace } = require('../../src/engine/rendering/Renderer');
const { Camera2D } = require('../../src/engine/rendering/Camera2D');

function run() {
  console.log('Testing Renderer...');

  const stdout = { writes: [], write(chunk) { this.writes.push(chunk); } };
  const renderer = new Renderer(20, 10, stdout);
  const camera = new Camera2D({ x: 2, y: 1 });

  renderer.setCamera(camera);
  const projected = renderer.worldToScreen(5, 4);
  assert.deepStrictEqual(projected, { x: 3, y: 3 });

  renderer.clear();
  renderer.drawCell(2, 1, 'A', COLORS.green, true, Layer.PLAYER);
  renderer.drawString(3, 1, 'Hi', COLORS.red, false, 100);
  renderer.withRenderSpace(RenderSpace.SCREEN, () => {
    renderer.drawString(3, 1, 'UI', COLORS.cyan, false, 200);
  });
  renderer.drawText(0, 2, ['L1', 'L2'], COLORS.blue, false, 100);
  renderer.drawArt(1, 4, ['@@'], COLORS.yellow, true, Layer.PLAYER);
  renderer.fillRect(6, 6, 2, 1, '.', COLORS.dim, false, Layer.BACKGROUND);

  renderer.renderSprite({
    x: 4,
    y: 4,
    art: ['<>'],
    color: COLORS.cyan,
    active: true
  }, {
    align: 'center',
    bold: true,
    layer: Layer.PLAYER
  });

  renderer.renderSprite({
    x: 5,
    y: 5,
    art: ['BB'],
    active: true
  }, {
    layer: Layer.BACKGROUND,
    color: ({ row }) => (row === 0 ? COLORS.yellow : COLORS.magenta)
  });

  renderer.renderGlyph({
    x: 2,
    y: 3,
    char: '|',
    active: true
  }, {
    color: COLORS.brightGreen,
    bold: true,
    layer: Layer.PLAYER
  });

  renderer.renderGlyph({
    x: 7,
    y: 2,
    char: '*',
    width: 2,
    height: 2,
    active: true
  }, {
    color: COLORS.yellow,
    layer: Layer.PLAYER
  });

  assert.ok(renderer.toString().includes('A'));
  assert.ok(renderer.getBuffer());
  assert.strictEqual(renderer.getBuffer().getCell(0, 0).char, 'A');
  assert.strictEqual(renderer.getBuffer().getCell(3, 1).char, 'U');
  assert.strictEqual(renderer.getBuffer().getCell(5, 1).char, '*');

  renderer.present();
  assert.ok(stdout.writes.length > 0);

  console.log('✓ Renderer tests passed');
  return true;
}

module.exports = { run };
