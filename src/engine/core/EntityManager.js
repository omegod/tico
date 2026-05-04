/**
 * EntityManager - generic entity storage, lifecycle, and querying.
 */

let entityIdCounter = 0;
const DEFAULT_TIMESTEP_MS = 1000 / 60;

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function copyAdditionalProperties(target, source, excludedKeys) {
  for (const [key, value] of Object.entries(source)) {
    if (!excludedKeys.has(key)) {
      target[key] = value;
    }
  }
}

class Entity {
  constructor(type, data = {}) {
    this.id = ++entityIdCounter;
    this.type = type;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 1;
    this.height = data.height || 1;
    this.active = data.active !== undefined ? Boolean(data.active) : true;

    this.art = data.art || [];
    this.color = data.color ?? null;

    this.life = data.life || Infinity;
    this.maxLife = data.maxLife || this.life;
    this.invincibleTimer = toFiniteNumber(data.invincibleTimer, 0);

    this.speed = data.speed || 1;
    this.vx = data.vx || 0;
    this.vy = data.vy || 0;
    this.ax = toFiniteNumber(data.ax, 0);
    this.ay = toFiniteNumber(data.ay, 0);
    this.mass = Math.max(toFiniteNumber(data.mass, 1), 0.0001);
    this.gravityScale = toFiniteNumber(data.gravityScale, 0);
    this.restitution = clamp(toFiniteNumber(data.restitution, 0), 0, 1);
    this.maxSpeed = data.maxSpeed == null ? null : Math.max(0, toFiniteNumber(data.maxSpeed, 0));
    this.bounds = data.bounds || null;
    this.gravity = data.gravity && typeof data.gravity === 'object'
      ? {
          x: toFiniteNumber(data.gravity.x, 0),
          y: toFiniteNumber(data.gravity.y, 0)
        }
      : null;
    this.forceX = 0;
    this.forceY = 0;
    this.physicsEnabled = Boolean(
      data.physicsEnabled ||
      data.kinematic ||
      this.ax !== 0 ||
      this.ay !== 0 ||
      this.gravityScale !== 0 ||
      this.restitution !== 0 ||
      this.gravity ||
      data.mass != null ||
      data.maxSpeed != null
    );

    copyAdditionalProperties(this, data, new Set([
      'x',
      'y',
      'width',
      'height',
      'active',
      'art',
      'color',
      'life',
      'maxLife',
      'invincibleTimer',
      'speed',
      'vx',
      'vy',
      'ax',
      'ay',
      'mass',
      'gravityScale',
      'restitution',
      'maxSpeed',
      'bounds',
      'gravity',
      'physicsEnabled',
      'kinematic'
    ]));
  }

  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  collidesWith(other) {
    const a = this.getBounds();
    const b = other.getBounds();
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  update(dt) {
    if (this.physicsEnabled) {
      this.updateKinematics(dt);
    } else {
      this.x += this.vx;
      this.y += this.vy;
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
    }
    if (this.life !== Infinity) {
      this.life--;
      if (this.life <= 0) {
        this.active = false;
      }
    }
  }

  destroy() {
    this.active = false;
  }

  setVelocity(vx, vy) {
    this.vx = toFiniteNumber(vx, this.vx);
    this.vy = toFiniteNumber(vy, this.vy);
    return this;
  }

  setAcceleration(ax, ay) {
    this.ax = toFiniteNumber(ax, this.ax);
    this.ay = toFiniteNumber(ay, this.ay);
    this.physicsEnabled = true;
    return this;
  }

  setGravity(x, y) {
    this.gravity = {
      x: toFiniteNumber(x, 0),
      y: toFiniteNumber(y, 0)
    };
    this.physicsEnabled = true;
    return this;
  }

  setBounds(bounds) {
    this.bounds = bounds || null;
    return this;
  }

  applyForce(fx, fy) {
    this.forceX += toFiniteNumber(fx, 0);
    this.forceY += toFiniteNumber(fy, 0);
    this.physicsEnabled = true;
    return this;
  }

  applyImpulse(ix, iy) {
    this.vx += toFiniteNumber(ix, 0) / this.mass;
    this.vy += toFiniteNumber(iy, 0) / this.mass;
    this.physicsEnabled = true;
    return this;
  }

  clearForces() {
    this.forceX = 0;
    this.forceY = 0;
    return this;
  }

  updateKinematics(dt, options = {}) {
    const stepMs = Number.isFinite(dt) ? dt : DEFAULT_TIMESTEP_MS;
    const deltaSeconds = stepMs / 1000;
    if (deltaSeconds <= 0) {
      return this;
    }

    const gravitySource = options.gravity || this.gravity;
    const gravityX = gravitySource ? toFiniteNumber(gravitySource.x, 0) * this.gravityScale : 0;
    const gravityY = gravitySource ? toFiniteNumber(gravitySource.y, 0) * this.gravityScale : 0;
    const totalAx = this.ax + (this.forceX / this.mass) + gravityX;
    const totalAy = this.ay + (this.forceY / this.mass) + gravityY;

    this.vx += totalAx * deltaSeconds;
    this.vy += totalAy * deltaSeconds;

    if (this.maxSpeed != null) {
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.maxSpeed && speed > 0) {
        const scale = this.maxSpeed / speed;
        this.vx *= scale;
        this.vy *= scale;
      }
    }

    this.x += this.vx * deltaSeconds;
    this.y += this.vy * deltaSeconds;

    this._resolveBounds(options.bounds || this.bounds);
    this.clearForces();
    return this;
  }

  _resolveBounds(bounds) {
    if (!bounds) return;

    const minX = toFiniteNumber(bounds.x, 0);
    const minY = toFiniteNumber(bounds.y, 0);
    const maxX = Number.isFinite(bounds.width) ? minX + bounds.width - this.width : null;
    const maxY = Number.isFinite(bounds.height) ? minY + bounds.height - this.height : null;

    if (this.x < minX) {
      this.x = minX;
      this.vx = this.restitution > 0 ? Math.abs(this.vx) * this.restitution : 0;
    } else if (maxX != null && this.x > maxX) {
      this.x = maxX;
      this.vx = this.restitution > 0 ? -Math.abs(this.vx) * this.restitution : 0;
    }

    if (this.y < minY) {
      this.y = minY;
      this.vy = this.restitution > 0 ? Math.abs(this.vy) * this.restitution : 0;
    } else if (maxY != null && this.y > maxY) {
      this.y = maxY;
      this.vy = this.restitution > 0 ? -Math.abs(this.vy) * this.restitution : 0;
    }
  }
}

class EntityManager {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.entities = [];
    this.entitiesByType = new Map();
    this.tags = new Map();
  }

  create(type, data = {}) {
    const entity = data && typeof data === 'object' && data.active !== undefined
      ? data
      : new Entity(type, data);
    return this.add(entity, type);
  }

  add(entity, type = entity && entity.type) {
    if (!entity) return null;

    const resolvedType = type != null ? type : entity.type;
    if (resolvedType == null) {
      throw new Error('EntityManager.add requires a type');
    }
    if (this.entities.includes(entity)) {
      return entity;
    }

    entity.type = resolvedType;
    this.entities.push(entity);

    if (!this.entitiesByType.has(resolvedType)) {
      this.entitiesByType.set(resolvedType, []);
    }
    this.entitiesByType.get(resolvedType).push(entity);
    return entity;
  }

  set(type, entity) {
    this.clearType(type);
    return this.add(entity, type);
  }

  destroy(entity) {
    if (!entity) return;
    if (typeof entity.destroy === 'function') {
      entity.destroy();
    } else {
      entity.active = false;
    }
    this.remove(entity);
  }

  remove(entity) {
    if (!entity) return false;

    const entityIndex = this.entities.indexOf(entity);
    if (entityIndex !== -1) {
      this.entities.splice(entityIndex, 1);
    }

    const typeBucket = this.entitiesByType.get(entity.type);
    if (typeBucket) {
      const typeIndex = typeBucket.indexOf(entity);
      if (typeIndex !== -1) {
        typeBucket.splice(typeIndex, 1);
      }
      if (!typeBucket.length) {
        this.entitiesByType.delete(entity.type);
      }
    }

    this._removeFromTags(entity);
    return entityIndex !== -1;
  }

  addTag(entity, tag) {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, []);
    }
    if (!this.tags.get(tag).includes(entity)) {
      this.tags.get(tag).push(entity);
    }
  }

  getByTag(tag) {
    return this.tags.get(tag) || [];
  }

  getAll() {
    return this.entities;
  }

  getByType(type) {
    return this.entitiesByType.get(type) || [];
  }

  getFirstByType(type) {
    return this.getByType(type)[0] || null;
  }

  clearType(type) {
    const entities = [...this.getByType(type)];
    for (const entity of entities) {
      this.remove(entity);
    }
    return entities.length;
  }

  update(dt) {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (!entity) {
        this.entities.splice(i, 1);
        continue;
      }

      if (typeof entity.update === 'function') {
        entity.update(dt);
      }

      if (!entity.active) {
        this.remove(entity);
      }
    }
  }

  clear() {
    this.entities = [];
    this.entitiesByType.clear();
    this.tags.clear();
  }

  getStats() {
    const byType = {};
    for (const [type, entities] of this.entitiesByType.entries()) {
      byType[type] = entities.length;
    }

    return {
      total: this.entities.length,
      byType
    };
  }

  _removeFromTags(entity) {
    for (const [tag, entities] of this.tags.entries()) {
      const index = entities.indexOf(entity);
      if (index !== -1) {
        entities.splice(index, 1);
      }
      if (!entities.length) {
        this.tags.delete(tag);
      }
    }
  }
}

module.exports = { EntityManager, Entity };
