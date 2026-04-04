const assert = require('assert');
const engine = require('../../src/engine');

function run() {
  console.log('Testing Engine Exports...');

  assert.ok(engine.EngineApp);
  assert.ok(engine.Scene);
  assert.ok(engine.SpriteNode);
  assert.ok(engine.Renderer);
  assert.ok(engine.ResourceManager);
  assert.ok(engine.AnimationPlayer);

  console.log('✓ Engine Exports tests passed');
  return true;
}

module.exports = { run };
