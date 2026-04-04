const { Scene } = require('../../../../src/engine/scene/Scene');
const { StarHunter } = require('../game/StarHunter');

class StarHunterScene extends Scene {
  constructor(name = 'star-hunter') {
    super(name);
    this.managed = false;
    this.game = null;
  }

  onEnter(app) {
    this.game = new StarHunter({
      stdout: app.stdout,
      runtime: app.getRuntime()
    });
  }

  onExit() {
    if (this.game) {
      this.game.cleanup();
      this.game = null;
    }
  }
}

module.exports = { StarHunterScene };
