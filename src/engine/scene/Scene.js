const { Node2D } = require('../nodes/Node2D');
const { Camera2D } = require('../rendering/Camera2D');

class Scene {
  constructor(name = 'scene', options = {}) {
    this.name = name;
    this.app = null;
    this.root = new Node2D({ name: `${name}:root` });
    this.camera = options.camera || new Camera2D();
    this.managed = options.managed !== false;
    this.autoClear = options.autoClear !== false;
    this.autoPresent = options.autoPresent !== false;
    this.systemPriority = Number.isFinite(options.systemPriority) ? options.systemPriority : 0;
    this.active = false;
    this._runtimeSystem = null;
    this._inputOff = null;
  }

  attach(app) {
    this.app = app;
  }

  detach() {
    this.app = null;
  }

  enter() {
    this.active = true;
    if (this.managed) {
      this._bindRuntime();
    }
    this.onEnter(this.app);
  }

  exit() {
    this.onExit(this.app);
    if (this.managed) {
      this._unbindRuntime();
    }
    this.active = false;
  }

  _bindRuntime() {
    if (!this.app || this._runtimeSystem) return;

    this.camera.setViewport(this.app.width, this.app.height);
    this._runtimeSystem = {
      update: (dt, frameCount, meta) => {
        this.camera.update();
        if (this.app.animations) {
          this.app.animations.update(dt);
        }
        this.root.updateTree(dt, frameCount);
        this.onUpdate(dt, frameCount, meta, this.app);
      },
      fixedUpdate: (dt, frameCount) => {
        this.onFixedUpdate(dt, frameCount, this.app);
      }
    };

    this.app.engine.registerSystem(this._runtimeSystem, {
      owner: this,
      priority: this.systemPriority,
      id: `scene:${this.name}:runtime`
    });
    this.app.engine.onRender((dt, frameCount, alpha) => {
      const renderer = this.app.renderer;
      renderer.setCamera(this.camera);
      if (this.autoClear) {
        renderer.clear();
      }
      this.onRender({ app: this.app, renderer, dt, frameCount, alpha });
      this.root.renderTree(renderer);
      if (this.autoPresent) {
        this.app.stdout.write('\x1b[H');
        this.app.stdout.write(renderer.toString());
      }
      if (this.app.input.afterFrame) {
        this.app.input.afterFrame();
      }
    });

    this._inputOff = this.app.input.onKey((key, keyInfo) => {
      this.onInput(key, keyInfo, this.app);
    });
  }

  _unbindRuntime() {
    if (!this.app) return;
    if (this.app.time) {
      this.app.time.cancelByOwner(this);
    }
    if (this.app.engine.unregisterSystemsByOwner) {
      this.app.engine.unregisterSystemsByOwner(this);
    }
    if (this._inputOff) {
      this._inputOff();
      this._inputOff = null;
    }
    if (this._runtimeSystem && !this.app.engine.unregisterSystemsByOwner) {
      this.app.engine.unregisterSystem(this._runtimeSystem);
    }
    this._runtimeSystem = null;
    this.app.engine.onRender(null);
    this.app.renderer.setCamera(null);
  }

  onEnter() {}

  onExit() {}

  onUpdate() {}

  onFixedUpdate() {}

  onRender() {}

  onInput() {}
}

module.exports = { Scene };
