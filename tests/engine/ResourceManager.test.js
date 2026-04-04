const assert = require('assert');
const path = require('path');
const { ResourceManager } = require('../../src/engine/resources/ResourceManager');

function run() {
  console.log('Testing ResourceManager...');

  const resources = new ResourceManager();
  const json = resources.loadJsonSync(
    'tetrominoes',
    path.join(__dirname, '../../example/tetris/assets/tetrominoes.json')
  );

  assert.ok(Array.isArray(json));
  assert.strictEqual(resources.has('tetrominoes'), true);
  assert.strictEqual(resources.get('tetrominoes').length > 0, true);

  resources.unload('tetrominoes');
  assert.strictEqual(resources.has('tetrominoes'), false);

  console.log('✓ ResourceManager tests passed');
  return true;
}

module.exports = { run };
