class ActionMap {
  constructor(bindings = {}) {
    this.bindings = new Map();
    this.keyToAction = new Map();

    for (const [action, keys] of Object.entries(bindings)) {
      this.bind(action, keys);
    }
  }

  bind(action, keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    this.bindings.set(action, [...list]);
    for (const key of list) {
      this.keyToAction.set(key, action);
    }
    return this;
  }

  getKeys(action) {
    return this.bindings.get(action) || [];
  }

  getAction(key) {
    return this.keyToAction.get(key) || null;
  }

  matches(key, action) {
    return this.getKeys(action).includes(key);
  }
}

module.exports = { ActionMap };
