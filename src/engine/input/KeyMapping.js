/**
 * KeyMapping - 动作→按键映射
 * 定义游戏操作与按键的映射关系
 */

const KeyMapping = {
  // 移动
  MOVE_UP: ['ArrowUp', 'w', 'W'],
  MOVE_DOWN: ['ArrowDown', 's', 'S'],
  MOVE_LEFT: ['ArrowLeft', 'a', 'A'],
  MOVE_RIGHT: ['ArrowRight', 'd', 'D'],

  // 动作
  SHOOT: [' ', 'space'],
  POWER: ['q', 'Q'],
  SHIELD: ['e', 'E'],
  PAUSE: ['p', 'Escape', 'esc'],

  // 菜单导航
  MENU_UP: ['ArrowUp', 'w', 'W'],
  MENU_DOWN: ['ArrowDown', 's', 'S'],
  CONFIRM: ['Enter', 'return', ' '],

  // 特殊
  EXIT: ['Escape', 'esc'],
  LEFT: ['ArrowLeft', 'a', 'A'],
  RIGHT: ['ArrowRight', 'd', 'D']
};

// 按键转动作的映射（反向查找）
const keyToAction = new Map();

function buildReverseMapping() {
  for (const [action, keys] of Object.entries(KeyMapping)) {
    for (const key of keys) {
      keyToAction.set(key, action);
    }
  }
}

buildReverseMapping();

/**
 * 获取按键对应的动作
 * @param {string} key - 按键名
 * @returns {string|null} 动作名
 */
function getAction(key) {
  return keyToAction.get(key) || null;
}

/**
 * 检查按键是否匹配动作
 * @param {string} key - 按键名
 * @param {string} action - 动作名
 * @returns {boolean}
 */
function matches(key, action) {
  const keys = KeyMapping[action];
  if (!keys) return false;
  return keys.includes(key);
}

module.exports = { KeyMapping, getAction, matches };
