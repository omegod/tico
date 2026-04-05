const { CollisionSystem } = require('../core/CollisionSystem');

class PhysicsWorld {
  constructor(collision = new CollisionSystem()) {
    this.collision = collision;
    this.groups = new Map();
    this.bodies = new Map();
    this.layerRules = new Map();
    this.gravity = { x: 0, y: 0 };
    this.bounds = null;
  }

  add(groupName, entity, options = {}) {
    if (!this.groups.has(groupName)) {
      this.groups.set(groupName, new Set());
    }
    this.groups.get(groupName).add(entity);
    if (options.mass != null) entity.mass = Math.max(Number(options.mass) || 1, 0.0001);
    if (options.gravityScale != null) entity.gravityScale = Number(options.gravityScale) || 0;
    if (options.restitution != null) entity.restitution = Math.max(0, Math.min(1, Number(options.restitution) || 0));
    if (options.maxSpeed != null) entity.maxSpeed = Math.max(0, Number(options.maxSpeed) || 0);
    if (options.bounds) entity.bounds = options.bounds;
    if (options.gravity && typeof options.gravity === 'object') {
      entity.gravity = {
        x: Number(options.gravity.x) || 0,
        y: Number(options.gravity.y) || 0
      };
    }
    if (options.bodyType === 'dynamic' || options.physicsEnabled) {
      entity.physicsEnabled = true;
    }
    this.bodies.set(entity, {
      entity,
      groupName,
      layer: options.layer || 'default',
      mask: options.mask || ['default'],
      bodyType: options.bodyType || (entity.physicsEnabled ? 'dynamic' : 'static'),
      bounds: options.bounds || null,
      gravity: options.gravity || null
    });
    return entity;
  }

  remove(groupName, entity) {
    const group = this.groups.get(groupName);
    if (group) {
      group.delete(entity);
    }
    this.bodies.delete(entity);
  }

  getGroup(groupName) {
    return Array.from(this.groups.get(groupName) || []);
  }

  setLayerRule(layerA, layerB, enabled = true) {
    this.layerRules.set(`${layerA}:${layerB}`, enabled);
    this.layerRules.set(`${layerB}:${layerA}`, enabled);
  }

  setGravity(x, y) {
    if (typeof x === 'object' && x) {
      this.gravity = {
        x: Number(x.x) || 0,
        y: Number(x.y) || 0
      };
      return;
    }

    this.gravity = {
      x: Number(x) || 0,
      y: Number(y) || 0
    };
  }

  setBounds(bounds) {
    this.bounds = bounds || null;
  }

  canCollide(entityA, entityB) {
    const bodyA = this.bodies.get(entityA);
    const bodyB = this.bodies.get(entityB);
    if (!bodyA || !bodyB) return true;

    const explicitRule = this.layerRules.get(`${bodyA.layer}:${bodyB.layer}`);
    if (explicitRule === false) return false;

    const aAccepts = bodyA.mask.includes(bodyB.layer) || bodyA.mask.includes('*');
    const bAccepts = bodyB.mask.includes(bodyA.layer) || bodyB.mask.includes('*');
    return aAccepts && bAccepts;
  }

  testGroup(groupA, groupB, callback, margin = 0) {
    const left = this.getGroup(groupA);
    const right = this.getGroup(groupB);

    for (const a of left) {
      for (const b of right) {
        if (a === b) continue;
        if (!this.canCollide(a, b)) continue;
        if (this.collision.checkCollision(a, b, margin)) {
          callback(a, b);
        }
      }
    }
  }

  queryRect(rect, options = {}) {
    const matches = [];
    for (const [entity, body] of this.bodies) {
      if (options.groupName && body.groupName !== options.groupName) continue;
      if (options.layer && body.layer !== options.layer) continue;
      if (this.collision.checkCollision(entity, rect, options.margin || 0)) {
        matches.push(entity);
      }
    }
    return matches;
  }

  raycast(start, end, options = {}) {
    const steps = options.steps || 32;
    const hits = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      };
      for (const [entity, body] of this.bodies) {
        if (options.groupName && body.groupName !== options.groupName) continue;
        if (options.layer && body.layer !== options.layer) continue;
        if (this.collision.pointInRect(point.x, point.y, entity)) {
          hits.push({ entity, point, distance: i });
        }
      }
      if (hits.length > 0 && options.first !== false) {
        break;
      }
    }
    return options.first === false ? hits : hits[0] || null;
  }

  update(dt, options = {}) {
    for (const [entity, body] of this.bodies) {
      if (!entity || entity.active === false) continue;
      if (body.bodyType !== 'dynamic') continue;
      if (typeof entity.updateKinematics !== 'function') continue;

      entity.updateKinematics(dt, {
        gravity: body.gravity || options.gravity || this.gravity,
        bounds: body.bounds || options.bounds || this.bounds
      });
    }
  }
}

module.exports = { PhysicsWorld };
