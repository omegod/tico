const assert = require('assert');
const { Renderer } = require('../../src/engine/rendering/Renderer');
const { Camera2D } = require('../../src/engine/rendering/Camera2D');
const { TilemapNode } = require('../../src/engine/nodes/TilemapNode');

function run() {
  console.log('Testing Camera2D and TilemapNode...');

  const renderer = new Renderer(20, 10, { write() {} });
  const camera = new Camera2D({ x: 5, y: 3 });
  renderer.setCamera(camera);

  const tilemap = new TilemapNode({
    x: 6,
    y: 4,
    tiles: [['A']],
    palette: {
      A: { char: '#', color: null, bold: false, layer: 1 }
    }
  });

  renderer.clear();
  tilemap.render(renderer);
  const cell = renderer.getBuffer().getCell(1, 1);
  assert.strictEqual(cell.char, '#');

  console.log('✓ Camera2D and TilemapNode tests passed');
  return true;
}

module.exports = { run };
