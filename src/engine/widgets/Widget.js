class Widget {
  constructor(options = {}) {
    this.options = options;
  }

  measure() {
    return { width: 0, height: 0 };
  }

  render() {
    return [];
  }
}

module.exports = { Widget };
