const { EntityManager } = require('../../../../src/engine/core/EntityManager');
const { STAR_HUNTER_ENTITY_TYPES } = require('./EntityTypes');

class StarHunterEntityManager extends EntityManager {
  static adapt(manager, eventBus = null) {
    if (manager instanceof StarHunterEntityManager) {
      if (manager.eventBus == null && eventBus != null) {
        manager.eventBus = eventBus;
      }
      return manager;
    }

    if (manager instanceof EntityManager) {
      if (manager.eventBus == null && eventBus != null) {
        manager.eventBus = eventBus;
      }
      Object.setPrototypeOf(manager, StarHunterEntityManager.prototype);
      return manager;
    }

    return new StarHunterEntityManager(eventBus);
  }

  setPlayer(player) {
    return this.set(STAR_HUNTER_ENTITY_TYPES.PLAYER, player);
  }

  getPlayer() {
    return this.getFirstByType(STAR_HUNTER_ENTITY_TYPES.PLAYER);
  }

  getEnemies() {
    return this.getByType(STAR_HUNTER_ENTITY_TYPES.ENEMY);
  }

  getBoss() {
    return this.getFirstByType(STAR_HUNTER_ENTITY_TYPES.BOSS);
  }

  getBullets() {
    return this.getByType(STAR_HUNTER_ENTITY_TYPES.BULLET);
  }

  getEnemyBullets() {
    return this.getBullets().filter((bullet) => bullet.isEnemy);
  }

  getPlayerBullets() {
    return this.getBullets().filter((bullet) => !bullet.isEnemy);
  }

  getPowerups() {
    return this.getByType(STAR_HUNTER_ENTITY_TYPES.POWERUP);
  }

  getParticles() {
    return this.getByType(STAR_HUNTER_ENTITY_TYPES.PARTICLE);
  }

  clearAll() {
    this.clear();
  }
}

module.exports = { StarHunterEntityManager };
