const fs = require('fs');

class ResourceManager {
  constructor() {
    this.cache = new Map();
  }

  register(name, value, metadata = {}) {
    this.cache.set(name, { value, metadata });
    return value;
  }

  has(name) {
    return this.cache.has(name);
  }

  get(name, fallback = null) {
    const entry = this.cache.get(name);
    return entry ? entry.value : fallback;
  }

  getMetadata(name) {
    const entry = this.cache.get(name);
    return entry ? entry.metadata : null;
  }

  unload(name) {
    this.cache.delete(name);
  }

  clear(prefix = null) {
    if (!prefix) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  loadTextSync(name, filePath, options = {}) {
    const encoding = options.encoding || 'utf8';
    const value = fs.readFileSync(filePath, encoding);
    return this.register(name, value, { type: 'text', filePath });
  }

  loadJsonSync(name, filePath, options = {}) {
    const encoding = options.encoding || 'utf8';
    const value = JSON.parse(fs.readFileSync(filePath, encoding));
    return this.register(name, value, { type: 'json', filePath });
  }

  async loadText(name, filePath, options = {}) {
    const encoding = options.encoding || 'utf8';
    const value = await fs.promises.readFile(filePath, encoding);
    return this.register(name, value, { type: 'text', filePath });
  }

  async loadJson(name, filePath, options = {}) {
    const encoding = options.encoding || 'utf8';
    const value = JSON.parse(await fs.promises.readFile(filePath, encoding));
    return this.register(name, value, { type: 'json', filePath });
  }
}

module.exports = { ResourceManager };
