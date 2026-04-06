const { EventBus } = require('../core/EventBus');
const { GameEngine } = require('../core/GameEngine');
const { EntityManager } = require('../core/EntityManager');
const { Renderer } = require('../rendering/Renderer');
const { InputHandler } = require('../input/InputHandler');
const { SceneManager } = require('../scene/SceneManager');
const { ResourceManager } = require('../resources/ResourceManager');
const { AnimationPlayer } = require('../animation/AnimationPlayer');
const { PhysicsWorld } = require('../physics/PhysicsWorld');
const { EngineTime } = require('../core/EngineTime');

class EngineApp {
  constructor(options = {}) {
    this.width = options.width || 80;
    this.height = options.height || 32;
    this.frameRate = options.frameRate || 50;
    this.stdout = options.stdout || process.stdout;

    this.eventBus = options.eventBus || new EventBus();
    this.engine = options.engine || new GameEngine({
      width: this.width,
      height: this.height,
      frameRate: this.frameRate,
      eventBus: this.eventBus
    });
    this.time = options.time || this.engine.time || new EngineTime();
    this.engine.time = this.time;
    this.entities = options.entities || new EntityManager(this.eventBus);
    this.renderer = options.renderer || new Renderer(this.width, this.height, this.stdout);
    this.input = options.input || new InputHandler();
    this.resources = options.resources || new ResourceManager();
    this.animations = options.animations || new AnimationPlayer();
    this.physics = options.physics || new PhysicsWorld();

    this.sceneManager = new SceneManager(this);
    this.running = false;
    this._cleanupBound = false;
  }

  getRuntime() {
    return {
      width: this.width,
      height: this.height,
      stdout: this.stdout,
      eventBus: this.eventBus,
      engine: this.engine,
      time: this.time,
      entities: this.entities,
      renderer: this.renderer,
      input: this.input,
      resources: this.resources,
      animations: this.animations,
      physics: this.physics
    };
  }

  addScene(name, scene) {
    this.sceneManager.add(name, scene);
    return this;
  }

  start(sceneName) {
    if (!this.running) {
      this.input.initTerminal();
      this.input.init();
      this.engine.setEntityManager(this.entities);
      this._bindCleanupSignals();
    }

    this.sceneManager.start(sceneName);
    this.engine.startLoop();
    this.running = true;
    return this;
  }

  switchScene(name) {
    this.sceneManager.switchTo(name);
    return this;
  }

  replaceScene(name) {
    this.sceneManager.replace(name);
    return this;
  }

  pushScene(name) {
    this.sceneManager.push(name);
    return this;
  }

  popScene() {
    return this.sceneManager.pop();
  }

  stop() {
    if (!this.running) return;

    this.sceneManager.stop();
    this.engine.stop();
    this.input.cleanup();
    this.running = false;
  }

  _bindCleanupSignals() {
    if (this._cleanupBound) return;
    this._cleanupBound = true;

    process.on('exit', () => {
      this.stop();
    });

    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }
}

module.exports = { EngineApp };
