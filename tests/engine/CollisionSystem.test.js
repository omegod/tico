/**
 * CollisionSystem 单元测试
 */

const { CollisionSystem } = require('../../src/engine/core/CollisionSystem');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

function run() {
  console.log('Testing CollisionSystem...\n');

  const collision = new CollisionSystem();

  // Test: 基本AABB碰撞
  if (test('should detect basic AABB collision', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    assert(collision.checkCollision(a, b) === true, 'Should collide');
  })) passed++; else failed++;

  // Test: AABB 不碰撞
  if (test('should not detect collision when apart', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 20, width: 10, height: 10 };
    assert(collision.checkCollision(a, b) === false, 'Should not collide');
  })) passed++; else failed++;

  // Test: 碰撞容差 - standard AABB considers touching as colliding
  // margin allows "nearly touching" boxes to be considered colliding
  if (test('should respect collision margin', () => {
    // Touching boxes - AABB standard says they collide
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    assert(collision.checkCollision(a, b, 0) === true, 'Touching boxes collide with margin 0');
    // With margin, boxes 1 unit apart will collide
    const c = { x: 11, y: 0, width: 10, height: 10 };
    assert(collision.checkCollision(a, c, 0) === false, 'Apart boxes should not collide');
    assert(collision.checkCollision(a, c, 1) === true, 'With margin 1, apart boxes collide');
  })) passed++; else failed++;

  // Test: 点在矩形内
  if (test('should detect point in rect', () => {
    const rect = { x: 0, y: 0, width: 10, height: 10 };
    assert(collision.pointInRect(5, 5, rect) === true, 'Point inside should be true');
    assert(collision.pointInRect(15, 15, rect) === false, 'Point outside should be false');
  })) passed++; else failed++;

  // Test: 圆形碰撞
  if (test('should detect circle collision', () => {
    const a = { x: 0, y: 0, radius: 5 };
    const b = { x: 3, y: 3, radius: 5 };
    assert(collision.circleCollision(a, b) === true, 'Circles should collide');
  })) passed++; else failed++;

  if (test('should find collision pairs between collections', () => {
    const sources = [
      { x: 0, y: 0, width: 2, height: 2, active: true },
      { x: 10, y: 10, width: 2, height: 2, active: true }
    ];
    const targets = [
      { x: 1, y: 1, width: 2, height: 2, active: true },
      { x: 20, y: 20, width: 2, height: 2, active: true }
    ];

    const pairs = collision.findPairs(sources, targets, { stopOnFirstTarget: true });
    assert(pairs.length === 1, `Expected 1 pair, got ${pairs.length}`);
    assert(pairs[0].source === sources[0], 'Expected first source to collide');
    assert(pairs[0].target === targets[0], 'Expected first target to collide');
  })) passed++; else failed++;

  if (test('should check collision against any target in a collection', () => {
    const entity = { x: 0, y: 0, width: 2, height: 2, active: true };
    const targets = [
      { x: 5, y: 5, width: 2, height: 2, active: true },
      { x: 1, y: 1, width: 2, height: 2, active: true }
    ];

    assert(collision.collidesWithAny(entity, targets) === true, 'Entity should collide with at least one target');
    assert(collision.findCollisionsFor(entity, targets).length === 1, 'Should return only overlapping targets');
  })) passed++; else failed++;

  // Test: 屏幕内检测
  if (test('should detect on screen', () => {
    const entity = { x: 5, y: 5, width: 10, height: 10 };
    assert(collision.isOnScreen(entity, 80, 32) === true, 'Entity on screen');
    const offScreen = { x: -5, y: 5, width: 10, height: 10 };
    assert(collision.isOnScreen(offScreen, 80, 32) === false, 'Entity off screen');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
