/**
 * Bullet 实体单元测试
 */

const { Bullet, BulletType, MissileBehavior, ENEMY_BULLET_SPEED_SCALE } = require('../../src/game/entities/Bullet');

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
  console.log('Testing Bullet entity...\n');

  // Test: 创建普通子弹
  if (test('should create normal bullet', () => {
    const bullet = new Bullet({ x: 40, y: 20, damage: 10, isEnemy: false });
    assert(bullet !== null, 'Bullet should be created');
    assert(bullet.isEnemy === false, 'Should be player bullet');
  })) passed++; else failed++;

  // Test: 玩家子弹向上飞
  if (test('should move upward for player bullet', () => {
    const bullet = new Bullet({ x: 40, y: 20, damage: 10, isEnemy: false });
    const initialY = bullet.y;
    bullet.update(16, 1);
    assert(bullet.y < initialY, 'Player bullet should move up');
  })) passed++; else failed++;

  // Test: 敌人子弹向下飞
  if (test('should move downward for enemy bullet', () => {
    const bullet = new Bullet({ x: 40, y: 10, damage: 15, isEnemy: true });
    const initialY = bullet.y;
    bullet.update(16, 1);
    assert(bullet.y > initialY, 'Enemy bullet should move down');
  })) passed++; else failed++;

  // Test: 出界检测
  if (test('should detect off screen', () => {
    const bullet = new Bullet({ x: 40, y: -10, damage: 10, isEnemy: false });
    assert(bullet.isOffScreen(80, 32), 'Should be off screen');
  })) passed++; else failed++;

  // Test: createPlayerBullet - DOUBLE
  if (test('should create double bullets', () => {
    const bullets = Bullet.createPlayerBullet(40, 20, BulletType.DOUBLE, 10);
    assert(bullets.length === 2, 'Should create 2 bullets');
  })) passed++; else failed++;

  // Test: createPlayerBullet - TRIPLE
  if (test('should create triple bullets', () => {
    const bullets = Bullet.createPlayerBullet(40, 20, BulletType.TRIPLE, 10);
    assert(bullets.length === 3, 'Should create 3 bullets');
  })) passed++; else failed++;

  // Test: createPlayerBullet - PIERCE
  if (test('should create piercing bullet', () => {
    const bullets = Bullet.createPlayerBullet(40, 20, BulletType.PIERCE, 10);
    assert(bullets.length === 1, 'Should create 1 bullet');
    assert(bullets[0].pierce === true, 'Bullet should pierce');
    assert(bullets[0].char === '│', 'Sniper shot should use a laser-like glyph');
  })) passed++; else failed++;

  if (test('should use symmetric glyph for homing missile', () => {
    const bullets = Bullet.createPlayerBullet(40, 20, BulletType.MISSILE, 10);
    assert(bullets.length === 1, 'Should create 1 missile');
    assert(!['➤', '►', '▸'].includes(bullets[0].char), 'Missile should avoid asymmetric arrow glyphs');
  })) passed++; else failed++;

  if (test('should anchor orbital bullets to the core', () => {
    const core = new Bullet({
      x: 20,
      y: 18,
      behavior: MissileBehavior.GYRO_CORE,
      targetX: 20,
      targetY: 18,
      speed: 0,
      baseSpeed: 0
    });
    core.phase = 'anchor';

    const orbital = new Bullet({
      x: 20,
      y: 18,
      behavior: MissileBehavior.ORBITAL,
      orbitCenter: core,
      orbitRadius: 4,
      orbitAngle: 0,
      orbitSpeed: 0.5
    });

    orbital.update(16, 1);
    assert(orbital.x !== 20 || orbital.y !== 18, 'Orbital bullet should move around the core');
  })) passed++; else failed++;

  if (test('should keep packed orbitals together before the core bursts', () => {
    const core = new Bullet({
      x: 20,
      y: 18,
      behavior: MissileBehavior.GYRO_CORE,
      vx: 0,
      vy: -2,
      deployFrames: 5,
      speed: 2,
      baseSpeed: 2
    });

    const orbital = new Bullet({
      x: 20,
      y: 18,
      behavior: MissileBehavior.ORBITAL,
      orbitCenter: core,
      orbitRadius: 4,
      orbitAngle: 0,
      orbitSpeed: 0.5,
      releaseOnAnchor: true,
      packedChar: '◌'
    });

    core.update(16, 1);
    orbital.update(16, 1);
    assert(orbital.x === core.x && orbital.y === core.y, 'Packed orbital should stay attached before burst');
    assert(orbital.char === '◌', 'Packed orbital should use packed glyph before release');
  })) passed++; else failed++;

  if (test('should bounce ricochet bullets inside the screen', () => {
    const bullet = new Bullet({
      x: 2,
      y: 2,
      behavior: MissileBehavior.RICOCHET,
      vx: -1.5,
      vy: -1.2
    });
    bullet.screenWidth = 80;
    bullet.screenHeight = 32;

    bullet.update(16, 1);
    assert(bullet.vx > 0, 'Ricochet bullet should bounce on X axis');
    assert(bullet.vy > 0, 'Ricochet bullet should bounce on Y axis');
  })) passed++; else failed++;

  if (test('should animate missile color frames', () => {
    const bullet = new Bullet({
      x: 10,
      y: 10,
      char: '▓',
      color: '\x1b[91m',
      colorFrames: ['\x1b[91m', '\x1b[2m\x1b[37m']
    });

    bullet.update(16, 1);
    assert(bullet.color === '\x1b[2m\x1b[37m', 'Bullet should switch to the next color frame');
  })) passed++; else failed++;

  // Test: createEnemyBullet
  if (test('should create enemy bullet', () => {
    const bullet = Bullet.createEnemyBullet(40, 10, 15);
    assert(bullet.isEnemy === true, 'Should be enemy bullet');
    assert(bullet.damage === 15, 'Should have correct damage');
    assert(bullet.vy === 0.56 * ENEMY_BULLET_SPEED_SCALE, 'Enemy bullet speed should be reduced');
  })) passed++; else failed++;

  if (test('should scale custom enemy bullet velocity by speed multiplier', () => {
    const bullet = Bullet.createEnemyBulletWithVelocity(40, 10, 12, 1, 2, 3, '◆', true);
    assert(bullet.vx === 1 * ENEMY_BULLET_SPEED_SCALE, 'Enemy bullet vx should be scaled');
    assert(bullet.vy === 2 * ENEMY_BULLET_SPEED_SCALE, 'Enemy bullet vy should be scaled');
    assert(bullet.baseSpeed === 3 * ENEMY_BULLET_SPEED_SCALE, 'Enemy bullet baseSpeed should be scaled');
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

module.exports = { run };

if (require.main === module) {
  const success = run();
  process.exit(success ? 0 : 1);
}
