/**
 * CollisionSystem - generic collision helpers.
 */

class CollisionSystem {
  constructor() {
    this.enabled = true;
  }

  checkCollision(a, b, margin = 0) {
    return !(
      a.x + a.width + margin < b.x ||
      b.x + b.width + margin < a.x ||
      a.y + a.height + margin < b.y ||
      b.y + b.height + margin < a.y
    );
  }

  pointInRect(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    );
  }

  circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (a.radius || 1) + (b.radius || 1);
  }

  findPairs(sources, targets, options = {}) {
    const margin = Number.isFinite(options.margin) ? options.margin : 0;
    const stopOnFirstTarget = options.stopOnFirstTarget === true;
    const allowSelf = options.allowSelf === true;
    const pairs = [];

    for (const source of sources || []) {
      if (!source || source.active === false) continue;

      for (const target of targets || []) {
        if (!target || target.active === false) continue;
        if (!allowSelf && source === target) continue;

        if (this.checkCollision(source, target, margin)) {
          pairs.push({ source, target });
          if (stopOnFirstTarget) {
            break;
          }
        }
      }
    }

    return pairs;
  }

  findCollisionsFor(entity, targets, margin = 0) {
    if (!entity || entity.active === false) return [];

    const collisions = [];
    for (const target of targets || []) {
      if (!target || target.active === false || target === entity) continue;
      if (this.checkCollision(entity, target, margin)) {
        collisions.push(target);
      }
    }
    return collisions;
  }

  collidesWithAny(entity, targets, margin = 0) {
    return this.findCollisionsFor(entity, targets, margin).length > 0;
  }

  isOnScreen(entity, screenWidth, screenHeight, margin = 0) {
    return !(
      entity.x < -margin ||
      entity.x + entity.width > screenWidth + margin ||
      entity.y < -margin ||
      entity.y + entity.height > screenHeight + margin
    );
  }
}

module.exports = { CollisionSystem };
