const assert = require('assert');
const engine = require('../../src/engine');

function run() {
  console.log('Testing Engine Exports...');

  assert.ok(engine.EngineApp);
  assert.ok(engine.EngineTime);
  assert.ok(engine.Sequence);
  assert.ok(engine.Scene);
  assert.ok(engine.SpriteNode);
  assert.ok(engine.Renderer);
  assert.ok(engine.RenderSpace);
  assert.ok(engine.ResourceManager);
  assert.ok(engine.AnimationPlayer);
  assert.ok(engine.PanelWidget);
  assert.ok(engine.DialogWidget);
  assert.ok(engine.measureText);

  console.log('✓ Engine Exports tests passed');
  return true;
}

module.exports = { run };
