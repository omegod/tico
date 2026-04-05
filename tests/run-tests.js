/**
 * 测试运行器
 * 运行所有单元测试
 */

console.log('='.repeat(50));
console.log('tico - Test Suite');
console.log('='.repeat(50));
console.log('');

// 手动运行测试并统计
function runAllTests() {
  const tests = [
    { name: 'EventBus', run: require('./engine/EventBus.test').run },
    { name: 'EntityManager', run: require('./engine/EntityManager.test').run },
    { name: 'CollisionSystem', run: require('./engine/CollisionSystem.test').run },
    { name: 'GameEngine', run: require('./engine/GameEngine.test').run },
    { name: 'EngineTime', run: require('./engine/EngineTime.test').run },
    { name: 'ScreenBuffer', run: require('./engine/ScreenBuffer.test').run },
    { name: 'ActionMap', run: require('./engine/ActionMap.test').run },
    { name: 'KeyMapping', run: require('./engine/KeyMapping.test').run },
    { name: 'SceneManager', run: require('./engine/SceneManager.test').run },
    { name: 'Scene', run: require('./engine/Scene.test').run },
    { name: 'Node2D', run: require('./engine/Node2D.test').run },
    { name: 'SpriteNode', run: require('./engine/SpriteNode.test').run },
    { name: 'EngineApp', run: require('./engine/EngineApp.test').run },
    { name: 'EngineExports', run: require('./engine/EngineExports.test').run },
    { name: 'InputHandler', run: require('./engine/InputHandler.test').run },
    { name: 'ResourceManager', run: require('./engine/ResourceManager.test').run },
    { name: 'AnimationPlayer', run: require('./engine/AnimationPlayer.test').run },
    { name: 'CameraTilemap', run: require('./engine/CameraTilemap.test').run },
    { name: 'Renderer', run: require('./engine/Renderer.test').run },
    { name: 'PhysicsWorld', run: require('./engine/PhysicsWorld.test').run },
    { name: 'Banner', run: require('./ui/Banner.test').run },
    { name: 'HUD', run: require('./ui/HUD.test').run },
    { name: 'Modal', run: require('./ui/Modal.test').run },
    { name: 'TetrisScene', run: require('../example/tetris/test/TetrisScene.test').run },
    { name: 'StarHunterBoot', run: require('../example/star-hunter/tests/game/StarHunter.test').run },
    { name: 'Player', run: require('../example/star-hunter/tests/game/Player.test').run },
    { name: 'Bullet', run: require('../example/star-hunter/tests/game/Bullet.test').run },
    { name: 'Powerup', run: require('../example/star-hunter/tests/game/Powerup.test').run },
    { name: 'PlayerSystem', run: require('../example/star-hunter/tests/game/PlayerSystem.test').run },
    { name: 'Boss', run: require('../example/star-hunter/tests/game/Boss.test').run },
    { name: 'Enemy', run: require('../example/star-hunter/tests/game/Enemy.test').run },
    { name: 'DamageSystem', run: require('../example/star-hunter/tests/game/DamageSystem.test').run }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const success = test.run();
      if (success) passed++;
      else failed++;
    } catch (e) {
      console.error(`✗ ${test.name}`);
      console.error(`  ${e.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  return failed === 0;
}

module.exports = { runAllTests };

if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}
