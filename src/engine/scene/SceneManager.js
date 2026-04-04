class SceneManager {
  constructor(app) {
    this.app = app;
    this.scenes = new Map();
    this.current = null;
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
    if (this.current) {
      this.current.exit();
    }

    const scene = this.get(name);
    if (!scene) {
      throw new Error(`Scene not found: ${name}`);
    }

    this.current = scene;
    scene.enter();
    return scene;
  }

  switchTo(name) {
    return this.start(name);
  }

  stop() {
    if (!this.current) return;
    this.current.exit();
    this.current = null;
  }
}

module.exports = { SceneManager };
