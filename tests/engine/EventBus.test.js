/**
 * EventBus 单元测试
 */

const { EventBus } = require('../../src/engine/core/EventBus');

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

// 测试计数
let passed = 0;
let failed = 0;

function run() {
  console.log('Testing EventBus...\n');

  // Test: 基本订阅和发布
  if (test('should emit event to subscriber', () => {
    const bus = new EventBus();
    let received = null;
    bus.on('test', (data) => { received = data; });
    bus.emit('test', { value: 42 });
    assert(received !== null && received.value === 42, 'Event not received');
  })) passed++; else failed++;

  // Test: 取消订阅
  if (test('should unsubscribe', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => { count++; };
    bus.on('test', handler);
    bus.emit('test', {});
    bus.off('test', handler);
    bus.emit('test', {});
    assert(count === 1, `Expected 1, got ${count}`);
  })) passed++; else failed++;

  // Test: 多个订阅者
  if (test('should notify multiple subscribers', () => {
    const bus = new EventBus();
    let a = 0, b = 0;
    bus.on('test', () => { a++; });
    bus.on('test', () => { b++; });
    bus.emit('test', {});
    assert(a === 1 && b === 1, `Expected a=1, b=1, got a=${a}, b=${b}`);
  })) passed++; else failed++;

  // Test: once 一次性订阅
  if (test('should only call once handler once', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('test', () => { count++; });
    bus.emit('test', {});
    bus.emit('test', {});
    assert(count === 1, `Expected 1, got ${count}`);
  })) passed++; else failed++;

  // Test: 清除所有监听
  if (test('should clear all listeners', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('test1', () => { count++; });
    bus.on('test2', () => { count++; });
    bus.emit('test1', {});
    bus.emit('test2', {});
    assert(count === 2, 'Should have 2 calls before clear');
    bus.clear();
    bus.emit('test1', {});
    bus.emit('test2', {});
    assert(count === 2, 'Should not receive events after clear');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

// 如果直接运行
if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
