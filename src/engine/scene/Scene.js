const { Node2D } = require('../nodes/Node2D');
const { Camera2D } = require('../rendering/Camera2D');
const { RenderSpace } = require('../rendering/Renderer');

class Scene {
  constructor(name = 'scene', options = {}) {
    this.name = name;
    this.app = null;
    this.root = new Node2D({ name: `${name}:root` });
    this.screenRoot = new Node2D({ name: `${name}:screen-root` });
    this.camera = options.camera || new Camera2D();
    this.managed = options.managed !== false;
    this.autoClear = options.autoClear !== false;
    this.autoPresent = options.autoPresent !== false;
    this.systemPriority = Number.isFinite(options.systemPriority) ? options.systemPriority : 0;
    this.opaque = options.opaque !== false;
    this.blocksUpdate = options.blocksUpdate !== false;
    this.blocksInput = options.blocksInput !== false;
    this.active = false;
    this._runtimeSystem = null;
    this._inputOff = null;
    this._runtimeOwner = null;
  }

  attach(app) {
    this.app = app;
  }

  detach() {
    this.app = null;
  }

  enter() {
    this._runtimeOwner = 'self';
    this.active = true;
    this._syncViewport();
    if (this.managed) {
      this._bindRuntime();
    }
    this.onEnter(this.app);
  }

  exit() {
    this.onExit(this.app);
    if (this.managed && this._runtimeOwner === 'self') {
      this._unbindRuntime();
    } else if (this.app && this.app.time && typeof this.app.time.cancelByOwner === 'function') {
      this.app.time.cancelByOwner(this);
    }
    this._runtimeOwner = null;
    this.active = false;
  }

  _enterFromManager(meta = {}) {
    this._runtimeOwner = 'manager';
    this.active = true;
    this._syncViewport();
    this.onEnter(this.app, meta);
  }

  _exitFromManager(meta = {}) {
    this.onExit(this.app, meta);
    if (this.app && this.app.time && typeof this.app.time.cancelByOwner === 'function') {
      this.app.time.cancelByOwner(this);
    }
    this._runtimeOwner = null;
    this.active = false;
  }

  _syncViewport() {
    if (!this.app || !this.camera || typeof this.camera.setViewport !== 'function') {
      return;
    }
    this.camera.setViewport(this.app.width, this.app.height);
  }

  _updateFrame(dt, frameCount, meta) {
    this._syncViewport();
    this.camera.update();
    this.root.updateTree(dt, frameCount);
    this.screenRoot.updateTree(dt, frameCount);
    this.onUpdate(dt, frameCount, meta, this.app);
  }

  _fixedUpdateFrame(dt, frameCount, meta) {
    this.onFixedUpdate(dt, frameCount, this.app, meta);
  }

  _renderFrame({ app, renderer, dt, frameCount, alpha, meta }) {
    renderer.setCamera(this.camera);
    renderer.setRenderSpace(RenderSpace.WORLD);
    this.onRender({ app, renderer, dt, frameCount, alpha, meta });
    this.root.renderTree(renderer);
    renderer.withRenderSpace(RenderSpace.SCREEN, () => {
      this.screenRoot.renderTree(renderer);
    });
  }

  _handleInputFrame(key, keyInfo, meta) {
    this.onInput(key, keyInfo, this.app, meta);
  }

  _bindRuntime() {
    if (!this.app || this._runtimeSystem) return;

    this._runtimeSystem = {
      update: (dt, frameCount, meta) => {
        if (this.app.animations) {
          this.app.animations.update(dt);
        }
        this._updateFrame(dt, frameCount, meta);
      },
      fixedUpdate: (dt, frameCount) => {
        this._fixedUpdateFrame(dt, frameCount, { owner: 'scene' });
      }
    };

    this.app.engine.registerSystem(this._runtimeSystem, {
      owner: this,
      priority: this.systemPriority,
      id: `scene:${this.name}:runtime`
    });
    this.app.engine.onRender((dt, frameCount, alpha) => {
      const renderer = this.app.renderer;
      if (this.autoClear) {
        renderer.clear();
      }
      this._renderFrame({
        app: this.app,
        renderer,
        dt,
        frameCount,
        alpha,
        meta: { owner: 'scene' }
      });
      if (this.autoPresent) {
        this.app.stdout.write('\x1b[H');
        this.app.stdout.write(renderer.toString());
      }
      if (this.app.input.afterFrame) {
        this.app.input.afterFrame();
      }
    });

    this._inputOff = this.app.input.onKey((key, keyInfo) => {
      this._handleInputFrame(key, keyInfo, { owner: 'scene' });
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
    if (this.app.renderer.setRenderSpace) {
      this.app.renderer.setRenderSpace(RenderSpace.WORLD);
    }
  }

  onEnter() {}

  onExit() {}

  onCovered() {}

  onRevealed() {}

  onUpdate() {}

  onFixedUpdate() {}

  onRender() {}

  onInput() {}
}

module.exports = { Scene };
