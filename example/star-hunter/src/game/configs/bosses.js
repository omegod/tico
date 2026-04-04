/**
 * bosses.js - Boss配置
 * 定义Boss外观、阶段、移动轨迹和攻击模式
 */

const { Bullet } = require('../entities/Bullet');
const { Enemy } = require('../entities/Enemy');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const BOSS_ARTS = [
  [
    '         ╭───╮         ',
    '      ╭──╯▓▓▓╰──╮      ',
    '    ╭─╯▓▓█████▓▓╰─╮    ',
    '  ╭─╯█████████████╰─╮  ',
    '═══╣████╳███████╳████╠═══',
    '   ╰╮▓▓▓╳▓▓▓▓▓▓▓╳▓▓▓╭╯   ',
    '    ╰──╮╭───────╮╭──╯    ',
    '       ▓▓       ▓▓       '
  ],
  [
    '      ╔════════╗       ',
    '   ╔══╣ ░░░░░░ ╠══╗    ',
    '  ╔╝▓▓╣ ██████ ╠▓▓╚╗   ',
    '══╣▓▓▓╬══╦══╦══╬▓▓▓╠═══',
    '  ╚╗▓▓╣  ◉  ◉  ╠▓▓╔╝   ',
    '   ╚══╣  ╭──╮  ╠══╝    ',
    '      ╚══╧══╧══╝       ',
    '        ▓    ▓         '
  ],
  [
    '          ╭╮╭╮          ',
    '       ╭─╯◉◉╰─╮       ',
    '    ╭─╯╭╮╭══╮╭╮╰─╮    ',
    '  ╭─╯╭╯▒╲███╱▒╰╮╰─╮  ',
    '══╣▓▓╬╩═╦╩═╩╩═╦╩═╬▓▓╠══',
    '  ╰─╮╰╮▒╱███╲▒╭╯╭─╯  ',
    '    ╰─╮╰╩╦══╦╩╯╭─╯    ',
    '       ▓▓╯  ╰▓▓       '
  ],
  [
    '          ╭──╮          ',
    '     ╔════╣▓▓╠════╗     ',
    '  ╔══╣██╦══╩╩══╦██╠══╗  ',
    ' ╔╣██╬╩╩████████╩╩╬██╠╗ ',
    '═╣██╬══╦═◉════◉═╦══╬██╠═',
    ' ╚╣██╬═╩╦╦════╦╦╩═╬██╠╝ ',
    '   ╚═══╣▒▒╦══╦▒▒╠═══╝   ',
    '       ▓▓      ▓▓       '
  ],
  [
    '    █████████████████    ',
    '  ╭─╯▓▓▓▓▓▓▓▓▓▓▓▓▓╰─╮   ',
    ' ╭╯▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╰╮  ',
    '╣██╦═══╦═══╦═══╦═══╦██╠',
    ' ╰╮▒▒▒▒▒▒◉▒▒▒◉▒▒▒▒▒▒╭╯  ',
    '  ╰─╮▓▓▓▓▓▓▓▓▓▓▓▓▓╭─╯   ',
    '    ▓▓▓         ▓▓▓     '
  ],
  [
    '      ★════════════★      ',
    '   ╔══╣████████████╠══╗   ',
    ' ╔═╣██╬▓▓▓▓▓▓▓▓▓▓▓▓╬██╠═╗ ',
    '╠██╬═╩═══╦══════╦═══╩═╬██╣',
    ' ╚═╣     ║  ◉   ║     ╠═╝ ',
    '   ╚══╗  ╚══════╝  ╔══╝   ',
    '      ▓▓          ▓▓      ',
    '    ██████████████████    '
  ]
];

function emitFan(boss, bullets, count, spread, speed, damage, char = '◆') {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const half = (count - 1) / 2;

  for (let i = 0; i < count; i++) {
    const offset = i - half;
    bullets.push(Bullet.createEnemyBulletWithVelocity(
      cx + offset * 2,
      cy,
      damage,
      offset * spread,
      speed,
      speed,
      char,
      false
    ));
  }
}

function emitAimedSpread(boss, bullets, player, count, spread, speed, damage, char = '◆') {
  if (!player) return;
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const half = (count - 1) / 2;

  for (let i = 0; i < count; i++) {
    const px = player.x + (i - half) * 6;
    const py = player.y;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy) || 1;
    bullets.push(Bullet.createEnemyBulletWithVelocity(
      cx + (i - half) * 3,
      cy,
      damage,
      (dx / dist) * spread,
      (dy / dist) * speed,
      speed,
      char,
      false
    ));
  }
}

function emitRing(boss, bullets, count, radius, speed, damage, char = '◆') {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const spin = boss.moveTimer * 0.08;

  for (let i = 0; i < count; i++) {
    const angle = spin + (Math.PI * 2 * i) / count;
    bullets.push(Bullet.createEnemyBulletWithVelocity(
      cx + Math.cos(angle) * radius * 0.2,
      cy + Math.sin(angle) * 0.4,
      damage,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      speed,
      char,
      false
    ));
  }
}

function emitCurtain(boss, bullets, player, count, speed, damage, char = '◆') {
  const left = boss.x - 2;
  const right = boss.x + boss.width + 2;
  const span = right - left;
  const focusX = player ? player.x + player.width / 2 : boss.x + boss.width / 2;

  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0.5 : i / (count - 1);
    const x = left + span * ratio;
    const bias = (focusX - x) * 0.01;
    bullets.push(Bullet.createEnemyBulletWithVelocity(
      x,
      boss.y + boss.height,
      damage,
      bias,
      speed,
      speed,
      char,
      false
    ));
  }
}

function emitLance(boss, bullets, player, damage, speed, char = '▌') {
  if (!player) return;
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height;
  const dx = player.x + player.width / 2 - cx;
  const dy = player.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  bullets.push(Bullet.createEnemyBulletWithVelocity(
    cx,
    cy,
    damage,
    (dx / dist) * speed,
    (dy / dist) * speed,
    speed,
    char,
    true
  ));
}

function getState(boss) {
  if (!boss.behaviorState) boss.behaviorState = {};
  return boss.behaviorState;
}

function getBossCenterX(boss) {
  return boss.x + boss.width / 2;
}

function getBossBottomY(boss) {
  return boss.y + boss.height;
}

function setBossHome(boss) {
  if (boss.homeX === undefined) boss.homeX = boss.x;
  if (boss.homeY === undefined) boss.homeY = boss.y;
}

function applyHorizontalSine(boss, screenWidth, range, speed, phaseShift = 0) {
  const centerX = boss.homeX !== undefined ? boss.homeX : Math.floor(screenWidth / 2) - Math.floor(boss.width / 2);
  boss.x = centerX + Math.sin(boss.moveTimer * speed + phaseShift) * range;
}

function ensureDiveState(boss, screenHeight, intervalFrames, diveSpeed, enabled) {
  const state = getState(boss);
  if (!enabled) {
    state.diveTimer = 0;
    state.divePhase = 'idle';
    boss.isDiving = false;
    return false;
  }

  state.diveTimer = (state.diveTimer || 0) + 1;
  if (state.divePhase === 'idle' && state.diveTimer >= intervalFrames) {
    state.divePhase = 'down';
    state.diveTimer = 0;
    state.diveSpeed = diveSpeed;
    state.diveHomeY = boss.homeY !== undefined ? boss.homeY : boss.y;
  }

  const bottomY = screenHeight - boss.height - 1;
  const homeY = state.diveHomeY !== undefined ? state.diveHomeY : boss.y;
  boss.isDiving = true;

  if (state.divePhase === 'down') {
    boss.y = Math.min(bottomY, boss.y + state.diveSpeed);
    if (boss.y >= bottomY) {
      state.divePhase = 'up';
    }
    return true;
  }

  boss.y = Math.max(homeY, boss.y - state.diveSpeed);
  if (boss.y <= homeY) {
    boss.y = homeY;
    state.divePhase = 'idle';
    boss.isDiving = false;
  }
  return true;
}

function startDive(boss, screenHeight, diveSpeed) {
  const state = getState(boss);
  state.divePhase = 'down';
  state.diveTimer = 0;
  state.diveSpeed = diveSpeed;
  state.diveHomeY = boss.homeY !== undefined ? boss.homeY : boss.y;

  const bottomY = screenHeight - boss.height - 1;
  boss.isDiving = true;
  boss.y = Math.min(bottomY, boss.y + diveSpeed);
  if (boss.y >= bottomY) {
    state.divePhase = 'up';
  }
}

function countEnemies(entities) {
  return entities ? entities.getEnemies().length : 0;
}

function spawnEnemy(entities, enemy) {
  if (!entities || !enemy) return null;
  entities.create('enemy', enemy);
  return enemy;
}

function createEnemyFromBoss(boss, typeId, screenWidth, screenHeight, options = {}) {
  const entryDir = options.entryDir !== undefined ? options.entryDir : (options.fromBody ? 2 : (Math.random() < 0.5 ? 0 : 1));
  const enemy = Enemy.create(typeId, 0, 0, entryDir, screenWidth);
  if (!enemy) return null;

  const width = enemy.width;
  const height = enemy.height;
  const spawnY = clamp(
    options.spawnY !== undefined ? options.spawnY : Math.floor(screenHeight * 0.27),
    2,
    screenHeight - height - 2
  );

  if (options.fromBody) {
    enemy.x = clamp(Math.floor(getBossCenterX(boss) - width / 2), 2, screenWidth - width - 2);
    enemy.y = clamp(getBossBottomY(boss) - 1, 0, screenHeight - height - 2);
    enemy.baseX = enemy.x;
    enemy.baseY = spawnY;
    enemy.targetX = enemy.x;
    enemy.targetY = spawnY;
    enemy.entryDir = 2;
    enemy.moveDir = Math.random() < 0.5 ? 1 : -1;
  } else {
    const fromLeft = entryDir === 0;
    const targetX = fromLeft
      ? clamp(Math.floor(screenWidth * 0.16), 2, screenWidth - width - 2)
      : clamp(Math.floor(screenWidth * 0.84) - width, 2, screenWidth - width - 2);
    enemy.x = fromLeft ? -width : screenWidth + width;
    enemy.y = spawnY;
    enemy.baseX = targetX;
    enemy.baseY = spawnY;
    enemy.targetX = targetX;
    enemy.targetY = spawnY;
    enemy.entryDir = fromLeft ? 0 : 1;
    enemy.moveDir = fromLeft ? 1 : -1;
  }

  enemy.entered = false;
  enemy.minX = 2;
  enemy.maxX = screenWidth - width - 2;
  enemy.active = true;
  return enemy;
}

function spawnEnemyWithCap(boss, entities, typeIds, cap, options = {}) {
  if (countEnemies(entities) >= cap) return null;
  const typeId = Array.isArray(typeIds) ? typeIds[Math.floor(Math.random() * typeIds.length)] : typeIds;
  return spawnEnemy(entities, createEnemyFromBoss(boss, typeId, boss.screenWidth, boss.screenHeight, options));
}

function emitCircleBurst(boss, bullets, count, speed, damage, char = '•') {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    bullets.push(Bullet.createEnemyBulletWithVelocity(
      cx,
      cy,
      damage,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      speed,
      char,
      false
    ));
  }
}

function emitTrackingBullet(boss, bullets, player, damage, speed = 1.05, char = '▌', offsetX = 0) {
  if (!player) return;
  const cx = boss.x + boss.width / 2 + offsetX;
  const cy = boss.y + boss.height;
  const dx = player.x + player.width / 2 - cx;
  const dy = player.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  bullets.push(Bullet.createEnemyBulletWithVelocity(
    cx,
    cy,
    damage,
    (dx / dist) * speed,
    (dy / dist) * speed,
    speed,
    char,
    true
  ));
}

function onBossPhaseEntry(boss, entities) {
  const state = getState(boss);
  if (boss.wave === 1) {
    state.summonTimer = 0;
    spawnEnemyWithCap(boss, entities, 0, 2, {
      fromBody: false,
      entryDir: Math.random() < 0.5 ? 0 : 1,
      spawnY: Math.floor(boss.screenHeight * 0.24)
    });
    return;
  }

  if (boss.wave === 2 || boss.wave === 4) {
    startDive(boss, boss.screenHeight, 0.5);
    return;
  }

  if (boss.wave === 5) {
    state.summonTimer = 0;
    spawnEnemyWithCap(boss, entities, [0, 1, 2], 4, {
      fromBody: true,
      spawnY: Math.floor(boss.screenHeight * 0.32)
    });
  }
}

const BossAttackPatterns = {
  0: (boss, _createBullet, bullets) => {
    emitFan(boss, bullets, 3, 0.16, 0.78, 16, '◆');
  },

  1: (boss, _createBullet, bullets) => {
    if (boss.isDiving) return;
    emitFan(boss, bullets, 6, 0.12, 0.82, 18, '◆');
  },

  2: (boss, _createBullet, bullets, player, entities) => {
    if (Math.random() < 0.5) {
      if (!spawnEnemyWithCap(boss, entities, [0, 1], 3, { fromBody: true, spawnY: boss.homeY !== undefined ? boss.homeY + 7 : undefined })) {
        emitFan(boss, bullets, 5, 0.11, 0.8, 18, '◆');
      }
      return;
    }

    emitFan(boss, bullets, 5, 0.11, 0.8, 18, '◆');
  },

  3: (boss, _createBullet, bullets) => {
    if (boss.isDiving) return;
    if (Math.random() < 0.5) {
      emitFan(boss, bullets, 3, 0.16, 0.82, 18, '◆');
    } else {
      emitCircleBurst(boss, bullets, 6, 0.72, 18, '◉');
    }
  },

  4: (boss, _createBullet, bullets) => {
    if (boss.isDiving) return;
    emitFan(boss, bullets, 6, 0.12, 0.84, 19, '◆');
  },

  5: (boss, _createBullet, bullets, player) => {
    if (boss.isDiving) return;
    const roll = Math.random();
    if (roll < 1 / 3) {
      emitFan(boss, bullets, 6, 0.11, 0.84, 20, '◆');
    } else if (roll < 2 / 3) {
      if (player) {
        emitTrackingBullet(boss, bullets, player, 22, 1.05, '▌', -3);
        emitTrackingBullet(boss, bullets, player, 22, 1.05, '▌', 3);
      } else {
        emitFan(boss, bullets, 6, 0.11, 0.84, 20, '◆');
      }
    } else {
      emitCircleBurst(boss, bullets, 6, 0.76, 20, '◉');
    }
  }
};

const BossMovementPatterns = {
  wave1Drift: (boss, _player, screenWidth, screenHeight, entities) => {
    setBossHome(boss);
    applyHorizontalSine(boss, screenWidth, 6, 0.04);
    boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;

    const state = getState(boss);
    if (boss.phase < 1) {
      state.summonTimer = 0;
      return;
    }

    state.summonTimer = (state.summonTimer || 0) + 1;
    if (state.summonTimer >= 150) {
      state.summonTimer = 0;
      spawnEnemyWithCap(boss, entities, 0, 2, {
        fromBody: false,
        entryDir: Math.random() < 0.5 ? 0 : 1,
        spawnY: Math.floor(screenHeight * 0.24)
      });
    }
  },

  wave2Sweep: (boss, _player, screenWidth) => {
    setBossHome(boss);
    const range = Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2);
    applyHorizontalSine(boss, screenWidth, range, 0.045);
    boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;
    boss.isDiving = false;
  },

  wave2SweepDive: (boss, _player, screenWidth, screenHeight) => {
    setBossHome(boss);
    const range = Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2);
    applyHorizontalSine(boss, screenWidth, range, 0.045);
    const diving = ensureDiveState(boss, screenHeight, 300, 0.5, boss.phase >= 1);
    if (!diving) {
      boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;
    }
  },

  wave3Sweep: (boss, _player, screenWidth) => {
    setBossHome(boss);
    const range = Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2);
    applyHorizontalSine(boss, screenWidth, range, 0.05, 0.3);
    boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;
  },

  wave4Drift: (boss, _player, screenWidth, screenHeight) => {
    setBossHome(boss);
    const range = boss.phase >= 1
      ? Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2)
      : 6;
    const speed = boss.phase >= 1 ? 0.045 : 0.035;
    applyHorizontalSine(boss, screenWidth, range, speed, 0.5);
    const diving = ensureDiveState(boss, screenHeight, 300, 0.5, boss.phase >= 1);
    if (!diving) {
      boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;
    }
  },

  wave5Sweep: (boss, _player, screenWidth, screenHeight, entities) => {
    setBossHome(boss);
    const range = Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2);
    applyHorizontalSine(boss, screenWidth, range, 0.043, 0.2);
    boss.y = boss.homeY !== undefined ? boss.homeY : boss.targetY;

    const state = getState(boss);
    const cap = boss.phase >= 1 ? 4 : 3;
    state.summonTimer = (state.summonTimer || 0) + 1;
    if (state.summonTimer >= 150) {
      state.summonTimer = 0;
      spawnEnemyWithCap(boss, entities, [0, 1, 2], cap, {
        fromBody: true,
        spawnY: Math.floor(screenHeight * 0.32)
      });
    }
  },

  wave6SweepDive: (boss, _player, screenWidth, screenHeight, entities) => {
    setBossHome(boss);
    const range = Math.max(0, Math.floor((screenWidth - boss.width) / 2) - 2);
    applyHorizontalSine(boss, screenWidth, range, 0.042, 0.4);
    ensureDiveState(boss, screenHeight, 300, 0.5, true);

    const state = getState(boss);
    state.summonTimer = (state.summonTimer || 0) + 1;
    if (boss.phase >= 1 && state.summonTimer >= 250) {
      state.summonTimer = 0;
      spawnEnemyWithCap(boss, entities, [0, 1, 2], 3, {
        fromBody: true,
        spawnY: Math.floor(screenHeight * 0.33)
      });
    }
  }
};

const BOSSES = [
  {
    id: 1,
    name: '裂壳虫王',
    subtitle: '边境虫巢的前锋指挥体',
    hp: 900,
    defense: 0.08,
    fireRate: 100,
    attackPatternsByPhase: [
      [0],
      [0]
    ],
    movementPatternByPhase: ['wave1Drift', 'wave1Drift'],
    movementRange: 6,
    movementSpeed: 0.04,
    phaseThresholds: [0.5],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[0],
    width: 25,
    height: 8
  },
  {
    id: 2,
    name: '遗迹机卫',
    subtitle: '埋入古代废墟的战斗守门人',
    hp: 1400,
    defense: 0.12,
    fireRate: 100,
    attackPatternsByPhase: [
      [1],
      [1]
    ],
    movementPatternByPhase: ['wave2Sweep', 'wave2SweepDive'],
    movementRange: 12,
    phaseThresholds: [0.5],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[1],
    width: 23,
    height: 8
  },
  {
    id: 3,
    name: '虚空虫后',
    subtitle: '寄生在星门裂缝中的群体意志',
    hp: 2100,
    defense: 0.16,
    fireRate: 100,
    attackPatternsByPhase: [
      [2],
      [2]
    ],
    movementPatternByPhase: ['wave3Sweep', 'wave3Sweep'],
    movementRange: 16,
    phaseThresholds: [0.5],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[2],
    width: 25,
    height: 8
  },
  {
    id: 4,
    name: '古舰守门者',
    subtitle: '被遗忘舰桥上苏醒的自动防御核心',
    hp: 2800,
    defense: 0.2,
    fireRate: 100,
    attackPatternsByPhase: [
      [3],
      [3]
    ],
    movementPatternByPhase: ['wave4Drift', 'wave4Drift'],
    movementRange: 6,
    phaseThresholds: [0.5],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[3],
    width: 25,
    height: 8
  },
  {
    id: 5,
    name: '蜂巢主核',
    subtitle: '机械族繁殖工厂的中央神经网',
    hp: 3800,
    defense: 0.24,
    fireRate: 100,
    attackPatternsByPhase: [
      [4],
      [4]
    ],
    movementPatternByPhase: ['wave5Sweep', 'wave5Sweep'],
    movementRange: 10,
    phaseThresholds: [0.5],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[4],
    width: 25,
    height: 7
  },
  {
    id: 6,
    name: '终极毁灭者',
    subtitle: '失控的远古兵器与机械族的最后底牌',
    hp: 5600,
    defense: 0.28,
    fireRate: 100,
    attackPatternsByPhase: [
      [5],
      [5]
    ],
    movementPatternByPhase: ['wave6SweepDive', 'wave6SweepDive'],
    movementRange: 18,
    phaseThresholds: [0.4],
    fireRateMultipliersByPhase: [1, 1],
    art: BOSS_ARTS[5],
    width: 26,
    height: 8
  }
];

function getBossByWave(wave) {
  if (wave >= 1 && wave <= BOSSES.length) {
    return BOSSES[wave - 1];
  }
  return null;
}

function getAttackPattern(patternId) {
  return BossAttackPatterns[patternId] || null;
}

function getMovementPattern(patternName) {
  return BossMovementPatterns[patternName] || null;
}

function handleBossPhaseEntry(boss, entities) {
  return onBossPhaseEntry(boss, entities);
}

module.exports = {
  BOSSES,
  BOSS_ARTS,
  BossAttackPatterns,
  BossMovementPatterns,
  getBossByWave,
  getAttackPattern,
  getMovementPattern,
  handleBossPhaseEntry
};
