const assert = require('assert');
const { AnimationPlayer } = require('../../src/engine/animation/AnimationPlayer');

function run() {
  console.log('Testing AnimationPlayer...');

  const animations = new AnimationPlayer();
  const target = { value: 0 };

  animations.tween(target, 'value', 100, 200, { easing: 'linear' });
  animations.update(100);
  assert.ok(target.value > 0 && target.value < 100);

  animations.update(100);
  assert.strictEqual(target.value, 100);

  console.log('✓ AnimationPlayer tests passed');
  return true;
}

module.exports = { run };
