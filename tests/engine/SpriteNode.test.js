const assert = require('assert');
const { Renderer } = require('../../src/engine/rendering/Renderer');
const { SpriteNode } = require('../../src/engine/nodes/SpriteNode');

function run() {
  console.log('Testing SpriteNode...');

  const renderer = new Renderer(10, 5, { write() {} });
  const node = new SpriteNode({
    x: 2,
    y: 1,
    art: ['##'],
    color: null,
    bold: false
  });

  renderer.clear();
  node.render(renderer);
  assert.strictEqual(renderer.getBuffer().getCell(2, 1).char, '#');

  console.log('✓ SpriteNode tests passed');
  return true;
}

module.exports = { run };
