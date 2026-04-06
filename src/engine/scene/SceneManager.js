class SceneManager {
  constructor(app) {
    this.app = app;
    this.scenes = new Map();
    this.stack = [];
    this.current = null;
    this._runtimeSystem = null;
    this._inputOff = null;
  }

  add(name, scene) {
    scene.attach(this.app);
    this.scenes.set(name, scene);
    return scene;
  }

  get(name) {
    return this.scenes.get(name) || null;
  }

  start(name) {
    return this.replace(name);
  }

  switchTo(name) {
    return this.replace(name);
  }

  replace(name) {
    const scene = this._requireScene(name);

    const previousTop = this.current;
    while (this.stack.length > 0) {
      const item = this.stack.pop();
      item._exitFromManager({ reason: 'replace', nextScene: scene });
    }

    this._ensureRuntime();
    this.stack.push(scene);
    this.current = scene;
    scene._enterFromManager({ reason: 'replace', previousScene: previousTop });
    return scene;
  }

  push(name) {
    const scene = this._requireScene(name);
    this._assertInactive(scene);

    const previousTop = this.current;
    this._ensureRuntime();
    if (previousTop) {
      previousTop.onCovered(this.app, { reason: 'push', coveringScene: scene });
    }
    this.stack.push(scene);
    this.current = scene;
    scene._enterFromManager({ reason: 'push', previousScene: previousTop });
    return scene;
  }

  pop() {
    if (!this.stack.length) {
      return null;
    }

    const popped = this.stack.pop();
    popped._exitFromManager({ reason: 'pop', nextScene: this.stack[this.stack.length - 1] || null });
    this.current = this.stack[this.stack.length - 1] || null;

    if (this.current) {
      this.current.onRevealed(this.app, { reason: 'pop', revealedScene: this.current, poppedScene: popped });
    } else {
      this._teardownRuntime();
    }

    return popped;
  }

  getStack() {
    return this.stack.slice();
  }

  stop() {
    while (this.stack.length > 0) {
      const scene = this.stack.pop();
      scene._exitFromManager({ reason: 'stop' });
    }
    this.current = null;
    this._teardownRuntime();
  }

  _requireScene(name) {
    const scene = this.get(name);
    if (!scene) {
      throw new Error(`Scene not found: ${name}`);
    }
    return scene;
  }

  _assertInactive(scene) {
    if (this.stack.includes(scene)) {
      throw new Error(`Scene is already active: ${scene.name}`);
    }
  }

  _ensureRuntime() {
    if (!this.app || !this.app.engine || this._runtimeSystem) {
      return;
    }

    this._runtimeSystem = {
      update: (dt, frameCount, meta) => {
        if (this.app.animations) {
          this.app.animations.update(dt);
        }
        for (const scene of this._getUpdatingScenes()) {
          scene._updateFrame(dt, frameCount, meta);
        }
      },
      fixedUpdate: (dt, frameCount) => {
        for (const scene of this._getUpdatingScenes()) {
          scene._fixedUpdateFrame(dt, frameCount, { owner: 'scene-manager' });
        }
      }
    };

    if (typeof this.app.engine.registerSystem === 'function') {
      this.app.engine.registerSystem(this._runtimeSystem, {
        owner: this,
        priority: 0,
        id: 'scene-manager:runtime'
      });
    }

    if (typeof this.app.engine.onRender === 'function') {
      this.app.engine.onRender((dt, frameCount, alpha) => {
        const scenes = this._getRenderableScenes();
        const renderer = this.app.renderer;
        if (!renderer || scenes.length === 0) {
          return;
        }

        if (scenes[0].autoClear) {
          renderer.clear();
        }

        for (let index = 0; index < scenes.length; index++) {
          scenes[index]._renderFrame({
            app: this.app,
            renderer,
            dt,
            frameCount,
            alpha,
            meta: {
              owner: 'scene-manager',
              stackIndex: index,
              stackDepth: scenes.length
            }
          });
        }

        if (this.current && this.current.autoPresent) {
          this.app.stdout.write('\x1b[H');
          this.app.stdout.write(renderer.toString());
        }

        if (this.app.input && typeof this.app.input.afterFrame === 'function') {
          this.app.input.afterFrame();
        }
      });
    }

    if (this.app.input && typeof this.app.input.onKey === 'function') {
      this._inputOff = this.app.input.onKey((key, keyInfo) => {
        const scenes = this._getInputScenes();
        for (const scene of scenes) {
          scene._handleInputFrame(key, keyInfo, {
            owner: 'scene-manager',
            topScene: this.current
          });
        }
      });
    }
  }

  _teardownRuntime() {
    if (!this.app) {
      return;
    }

    if (this.app.engine && typeof this.app.engine.unregisterSystemsByOwner === 'function') {
      this.app.engine.unregisterSystemsByOwner(this);
    } else if (this.app.engine && this._runtimeSystem && typeof this.app.engine.unregisterSystem === 'function') {
      this.app.engine.unregisterSystem(this._runtimeSystem);
    }

    if (this._inputOff) {
      this._inputOff();
      this._inputOff = null;
    }

    if (this.app.engine && typeof this.app.engine.onRender === 'function') {
      this.app.engine.onRender(null);
    }

    if (this.app.renderer) {
      if (typeof this.app.renderer.setCamera === 'function') {
        this.app.renderer.setCamera(null);
      }
      if (typeof this.app.renderer.setRenderSpace === 'function') {
        this.app.renderer.setRenderSpace('world');
      }
    }

    this._runtimeSystem = null;
  }

  _getUpdatingScenes() {
    let startIndex = this.stack.length;
    for (let index = this.stack.length - 1; index >= 0; index--) {
      startIndex = index;
      if (this.stack[index].blocksUpdate) {
        break;
      }
    }
    return this.stack.slice(startIndex);
  }

  _getRenderableScenes() {
    let startIndex = this.stack.length;
    for (let index = this.stack.length - 1; index >= 0; index--) {
      startIndex = index;
      if (this.stack[index].opaque) {
        break;
      }
    }
    return this.stack.slice(startIndex);
  }

  _getInputScenes() {
    const scenes = [];
    for (let index = this.stack.length - 1; index >= 0; index--) {
      const scene = this.stack[index];
      scenes.push(scene);
      if (scene.blocksInput) {
        break;
      }
    }
    return scenes;
  }
}

module.exports = { SceneManager };
