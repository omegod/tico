/**
 * ScreenBuffer 单元测试
 */

const { ScreenBuffer, isFullWidth, strWidth, stripAnsi, padEndDisplay, center } = require('../../src/engine/rendering/ScreenBuffer');

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
  console.log('Testing ScreenBuffer...\n');

  // Test: isFullWidth
  if (test('should detect fullwidth characters', () => {
    assert(isFullWidth('中') === true, 'CJK character should be fullwidth');
    assert(isFullWidth('A') === false, 'ASCII should not be fullwidth');
    assert(isFullWidth('。') === true, 'CJK punctuation should be fullwidth');
  })) passed++; else failed++;

  // Test: strWidth
  if (test('should calculate string width correctly', () => {
    assert(strWidth('ABC') === 3, 'ASCII should be 3');
    assert(strWidth('中文') === 4, 'CJK should be 4');
    assert(strWidth('A中B') === 4, 'Mixed should be 4');
    assert(strWidth('') === 0, 'Empty should be 0');
  })) passed++; else failed++;

  // Test: stripAnsi
  if (test('should strip ANSI codes', () => {
    const ansi = '\x1b[31mRed\x1b[0m';
    const stripped = stripAnsi(ansi);
    assert(stripped === 'Red', `Expected 'Red', got '${stripped}'`);
  })) passed++; else failed++;

  // Test: padEndDisplay
  if (test('should pad to display width', () => {
    const padded = padEndDisplay('Hi', 10);
    assert(padded.length === 10, `Expected length 10, got ${padded.length}`);
  })) passed++; else failed++;

  // Test: center
  if (test('should center string', () => {
    const centered = center('Hi', 10);
    assert(centered.length === 10, `Expected length 10, got ${centered.length}`);
    assert(centered.startsWith(' '), 'Should start with space');
  })) passed++; else failed++;

  // Test: ScreenBuffer clear
  if (test('should clear buffer', () => {
    const buffer = new ScreenBuffer(80, 32);
    buffer.setCell(5, 5, 'X');
    buffer.clear();
    const cell = buffer.getCell(5, 5);
    assert(cell.char === ' ', 'Cell should be empty after clear');
  })) passed++; else failed++;

  // Test: ScreenBuffer setCell
  if (test('should set and get cell', () => {
    const buffer = new ScreenBuffer(80, 32);
    buffer.setCell(10, 10, 'A', '#ff0000', true);
    const cell = buffer.getCell(10, 10);
    assert(cell.char === 'A', 'Char should be A');
    assert(cell.bold === true, 'Should be bold');
  })) passed++; else failed++;

  // Test: ScreenBuffer bounds check
  if (test('should ignore out of bounds', () => {
    const buffer = new ScreenBuffer(80, 32);
    buffer.setCell(-1, -1, 'X');
    buffer.setCell(100, 100, 'X');
    const cell = buffer.getCell(-1, -1);
    assert(cell === null, 'Out of bounds should return null');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
