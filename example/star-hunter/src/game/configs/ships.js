/**
 * ships.js - 6种战机配置
 * 定义所有可选战机的属性和外观
 */

const SHIPS = [
  {
    id: 1,
    name: '突击型',
    nameEn: 'Vanguard',
    hp: 100,
    speed: 2,
    fireRate: 8,
    attack: 8,       // 双发总伤害16/次
    defense: 0.1,
    shield: 30,      // 初始护盾值
    description: '双发子弹',
    bulletType: 'DOUBLE',
    missilePattern: 'ASSAULT',
    missileReloadFrames: 200,
    art: ['  ▲  ', '╭█╋█╮', '╰╧╩╧╯']
  },
  {
    id: 2,
    name: '平衡型',
    nameEn: 'Balanced',
    hp: 120,
    speed: 1.5,
    fireRate: 12,
    attack: 6,       // 三发散射，每发0.8倍，总伤害14.4/次
    defense: 0.15,
    shield: 30,      // 初始护盾值
    description: '三发散射',
    bulletType: 'TRIPLE',
    missilePattern: 'TWO_ROW',
    art: ['  ◇  ', '╭█╪█╮', '╰╫╧╫╯']
  },
  {
    id: 3,
    name: '狙击型',
    nameEn: 'Sniper',
    hp: 80,
    speed: 1.5,
    fireRate: 5,
    attack: 12,      // 穿透弹1.5倍，单发18伤害
    defense: 0.05,
    shield: 30,      // 初始护盾值
    description: '穿透弹',
    bulletType: 'PIERCE',
    missilePattern: 'PIERCING',
    missileReloadFrames: 300,
    art: ['  ▲  ', '╭█╳█╮', ' ╰╩╯ ']
  },
  {
    id: 4,
    name: '防御型',
    nameEn: 'Guardian',
    hp: 200,
    speed: 1,
    fireRate: 15,
    attack: 5,       // 单发5伤害
    defense: 0.3,
    shield: 30,      // 初始护盾值
    shieldRegen: 60, // 每60帧回复1点护盾（约3秒）
    description: '护盾自愈',
    bulletType: 'NORMAL',
    missilePattern: 'BARRIER',
    art: ['  ■  ', '╭███╮', '╰█▣█╯']
  },
  {
    id: 5,
    name: '疾风型',
    nameEn: 'Storm',
    hp: 90,
    speed: 3,
    fireRate: 10,
    attack: 7,       // 单发7伤害
    defense: 0.05,
    shield: 30,      // 初始护盾值
    description: '冲刺技能',
    bulletType: 'NORMAL',
    missilePattern: 'RAPID',
    art: ['  ⇡  ', '╭╱█╲╮', '╰═╧═╯']
  },
  {
    id: 6,
    name: '终极型',
    nameEn: 'Ultimate',
    hp: 150,
    speed: 2,
    fireRate: 8,
    attack: 6,       // 双发总伤害12/次
    defense: 0.2,
    shield: 30,      // 初始护盾值
    description: '全能组合',
    bulletType: 'DOUBLE',
    missilePattern: 'ULTIMATE',
    art: ['  ★  ', '╭█✦█╮', '╰╩★╩╯']
  }
];

/**
 * 根据ID获取战机配置
 */
function getShipById(id) {
  return SHIPS.find(s => s.id === id);
}

/**
 * 根据索引获取战机配置
 */
function getShipByIndex(index) {
  if (index >= 0 && index < SHIPS.length) {
    return SHIPS[index];
  }
  return null;
}

module.exports = { SHIPS, getShipById, getShipByIndex };
