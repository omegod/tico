const fs = require('fs');
const path = require('path');

const { Scene } = require('../../../src/engine/scene/Scene');
const { COLORS, Layer } = require('../../../src/engine/rendering/Renderer');

const UI_LAYER = 100;
const MODAL_LAYER = 300;

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_WIDTH = 2;

const MENU_ITEMS = ['开始游戏', '游戏记录', '退出游戏'];

const PIECE_STYLES = {
  I: { bg: COLORS.bgBrightCyan },
  O: { bg: COLORS.bgYellow },
  T: { bg: COLORS.bgBrightMagenta },
  S: { bg: COLORS.bgGreen },
  Z: { bg: COLORS.bgRed },
  J: { bg: COLORS.bgBlue },
  L: { bg: COLORS.bgBrightYellow }
};

const EMPTY_CELL = '  ';
const GHOST_STYLE = {
  fg: COLORS.brightWhite,
  bg: COLORS.bgMediumGray
};

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '----/--/--';
  return date.toISOString().slice(0, 10);
}

class TetrisScene extends Scene {
  constructor(name = 'tetris', options = {}) {
    super(name);
    this.recordsPath = options.recordsPath || path.join(__dirname, 'records.json');

    this.tetrominoes = [];
    this.board = this._createBoard();
    this.pieceBag = [];
    this.currentPiece = null;
    this.nextPiece = null;
    this.dropAccumulator = 0;
    this.dropInterval = 500;

    this.mode = 'menu';
    this.menuItems = MENU_ITEMS.slice();
    this.selectedMenuIndex = 0;

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this._savedRecord = false;
    this._menuPulseVisible = true;
    this._statusText = '';
    this._menuPulseOwner = { scene: this, channel: 'menu-pulse' };
    this._statusOwner = { scene: this, channel: 'status' };
  }

  onEnter(app) {
    if (!this.tetrominoes.length) {
      const definitions = app.resources.loadJsonSync(
        'example:tetris:tetrominoes',
        path.join(__dirname, '..', 'assets', 'tetrominoes.json')
      );
      this.tetrominoes = definitions.map((shape) => ({
        ...shape,
        rotations: shape.rotations.map((rotation) => rotation.map(([dx, dy]) => [dx, dy]))
      }));
    }

    this._goToMenu();
    app.engine.setState('running');
  }

  onExit(app) {
    if (!app || !app.time) return;
    app.time.cancelByOwner(this._menuPulseOwner);
    app.time.cancelByOwner(this._statusOwner);
  }

  onInput(key) {
    if (!key) return;

    if (this.mode === 'menu') {
      this._handleMenuInput(key);
      return;
    }

    if (this.mode === 'records') {
      if (this._isBackKey(key) || this._isConfirmKey(key)) {
        this._goToMenu();
      }
      return;
    }

    if (this.mode === 'paused') {
      if (this._isPauseKey(key)) {
        this._resumeGame();
      } else if (this._isBackKey(key)) {
        this._goToMenu();
      }
      return;
    }

    if (this.mode === 'gameover') {
      if (this._isConfirmKey(key) || key === 'r' || key === 'R') {
        this._startGame();
      } else if (this._isBackKey(key)) {
        this._goToMenu();
      }
      return;
    }

    this._handleGameplayInput(key);
  }

  onUpdate(dt) {
    if (this.mode !== 'playing') return;

    this.dropAccumulator += dt;
    while (this.dropAccumulator >= this.dropInterval && this.mode === 'playing') {
      this.dropAccumulator -= this.dropInterval;
      if (!this._stepDown()) {
        break;
      }
    }
  }

  onRender({ renderer }) {
    this._drawHeader(renderer);

    if (this.mode === 'menu') {
      this._renderMenu(renderer);
      return;
    }

    if (this.mode === 'records') {
      this._renderRecords(renderer);
      return;
    }

    this._renderGame(renderer);

    if (this.mode === 'paused') {
      this._drawSolidModalBox(renderer, 22, 11, 36, 7, '游戏暂停', COLORS.orange, COLORS.bgBlack);
      renderer.drawString(28, 13, 'P / Esc 继续', COLORS.brightWhite, true, MODAL_LAYER, COLORS.bgBlack);
      renderer.drawString(27, 14, 'Q 返回菜单', COLORS.brightWhite, false, MODAL_LAYER, COLORS.bgBlack);
    } else if (this.mode === 'gameover') {
      this._drawSolidModalBox(renderer, 22, 11, 36, 7, 'STACK OVERLOAD', COLORS.red, COLORS.bgBlack);
      renderer.drawString(25, 13, '堆叠已经顶到上边界', COLORS.brightWhite, true, MODAL_LAYER, COLORS.bgBlack);
      renderer.drawString(24, 14, 'Enter / R 重新开始', COLORS.yellow, false, MODAL_LAYER, COLORS.bgBlack);
      renderer.drawString(24, 15, 'Esc / Q 返回菜单', COLORS.yellow, false, MODAL_LAYER, COLORS.bgBlack);
    }
  }

  _handleMenuInput(key) {
    if (this._isUpKey(key)) {
      this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuItems.length) % this.menuItems.length;
      return;
    }

    if (this._isDownKey(key)) {
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuItems.length;
      return;
    }

    if (this._isConfirmKey(key)) {
      if (this.selectedMenuIndex === 0) {
        this._startGame();
      } else if (this.selectedMenuIndex === 1) {
        this._openRecords();
      } else {
        this._exitApp();
      }
      return;
    }

    if (this._isBackKey(key)) {
      this._exitApp();
    }
  }

  _handleGameplayInput(key) {
    if (this._isLeftKey(key)) {
      this._move(-1, 0);
      return;
    }

    if (this._isRightKey(key)) {
      this._move(1, 0);
      return;
    }

    if (this._isDownKey(key)) {
      this._stepDown();
      return;
    }

    if (this._isUpKey(key)) {
      this._rotate();
      return;
    }

    if (this._isDropKey(key)) {
      this._hardDrop();
      return;
    }

    if (this._isPauseKey(key)) {
      this._pauseGame();
      return;
    }

    if (this._isBackKey(key)) {
      this._goToMenu();
      return;
    }

    if (key === 'r' || key === 'R') {
      this._startGame();
    }
  }

  _goToMenu() {
    this.mode = 'menu';
    this.selectedMenuIndex = 0;
    this.board = this._createBoard();
    this.currentPiece = null;
    this.nextPiece = null;
    this.dropAccumulator = 0;
    this._savedRecord = false;
    this._statusText = '';
    this._startMenuPulse();
    if (this.app && this.app.engine) {
      this.app.engine.setState('running');
    }
  }

  _openRecords() {
    this.mode = 'records';
    this._stopMenuPulse();
    if (this.app && this.app.engine) {
      this.app.engine.setState('running');
    }
  }

  _startGame() {
    this.board = this._createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 500;
    this.dropAccumulator = this.dropInterval;
    this.mode = 'playing';
    this.pieceBag = [];
    this.currentPiece = this._createPiece();
    this.nextPiece = this._createPiece();
    this._savedRecord = false;
    this._stopMenuPulse();
    this._flashStatus('READY // app.time.after() clears this hint');
    if (this.app && this.app.engine) {
      this.app.engine.setState('running');
    }
  }

  _pauseGame() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    if (this.app && this.app.engine && this.app.engine.pause) {
      this.app.engine.pause();
    }
  }

  _resumeGame() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    if (this.app && this.app.engine && this.app.engine.resume) {
      this.app.engine.resume();
    }
  }

  _exitApp() {
    if (this.app && typeof this.app.stop === 'function') {
      this.app.stop();
    }
  }

  _handleLineClear() {
    let cleared = 0;

    for (let y = this.board.length - 1; y >= 0; y--) {
      if (this.board[y].every(Boolean)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(null));
        cleared++;
        y++;
      }
    }

    if (!cleared) return;

    this.lines += cleared;
    const points = [0, 100, 300, 500, 800];
    this.score += (points[cleared] || 0) * this.level;
    this.level = 1 + Math.floor(this.lines / 10);
    this.dropInterval = Math.max(100, 500 - (this.level - 1) * 50);
  }

  _stepDown() {
    if (!this._move(0, 1)) {
      this._lockPiece();
      return false;
    }
    return true;
  }

  _hardDrop() {
    if (this.mode !== 'playing' || !this.currentPiece) return;
    while (this._move(0, 1)) {}
    this._lockPiece();
  }

  _move(dx, dy) {
    if (this.mode !== 'playing' || !this.currentPiece) return false;

    const nextPiece = {
      ...this.currentPiece,
      x: this.currentPiece.x + dx,
      y: this.currentPiece.y + dy
    };

    if (!this._canPlace(nextPiece)) {
      return false;
    }

    this.currentPiece = nextPiece;
    return true;
  }

  _rotate() {
    if (this.mode !== 'playing' || !this.currentPiece) return;

    const nextRotation = (this.currentPiece.rotation + 1) % this.currentPiece.shape.rotations.length;
    const nextPiece = {
      ...this.currentPiece,
      rotation: nextRotation
    };

    if (this._canPlace(nextPiece)) {
      this.currentPiece = nextPiece;
    }
  }

  _lockPiece() {
    if (!this.currentPiece) return;

    for (const cell of this._getCells(this.currentPiece)) {
      if (cell.y < 0) {
        this._enterGameOver();
        return;
      }
      this.board[cell.y][cell.x] = this.currentPiece.shape.name;
    }

    this._handleLineClear();
    this.currentPiece = this.nextPiece;
    this.nextPiece = this._createPiece();
    this.dropAccumulator = 0;

    if (!this._canPlace(this.currentPiece)) {
      this._enterGameOver();
    }
  }

  _enterGameOver() {
    if (this.mode === 'gameover') return;
    this.mode = 'gameover';
    this.dropAccumulator = 0;
    if (!this._savedRecord) {
      this._saveRecord({
        score: this.score,
        lines: this.lines,
        level: this.level,
        date: Date.now()
      });
      this._savedRecord = true;
    }
  }

  _refillBag() {
    this.pieceBag = shuffle(this.tetrominoes);
  }

  _createPiece() {
    if (!this.pieceBag.length) {
      this._refillBag();
    }

    const shape = this.pieceBag.pop();
    return {
      shape,
      rotation: 0,
      x: 3,
      y: 0
    };
  }

  _canPlace(piece) {
    if (!piece || !piece.shape) return false;

    for (const cell of this._getCells(piece)) {
      if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) {
        return false;
      }

      if (cell.y >= 0 && this.board[cell.y][cell.x]) {
        return false;
      }
    }

    return true;
  }

  _getCells(piece) {
    const rotation = piece.shape.rotations[piece.rotation] || [];
    return rotation.map(([dx, dy]) => ({
      x: piece.x + dx,
      y: piece.y + dy
    }));
  }

  _getGhostPiece() {
    if (!this.currentPiece) return null;

    const ghost = { ...this.currentPiece };
    while (this._canPlace({ ...ghost, y: ghost.y + 1 })) {
      ghost.y += 1;
    }
    return ghost;
  }

  _createBoard() {
    return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
  }

  _loadRecords() {
    try {
      if (!fs.existsSync(this.recordsPath)) {
        return [];
      }
      const raw = fs.readFileSync(this.recordsPath, 'utf8');
      const records = JSON.parse(raw);
      return Array.isArray(records) ? records : [];
    } catch (error) {
      return [];
    }
  }

  _saveRecord(record) {
    try {
      const dir = path.dirname(this.recordsPath);
      fs.mkdirSync(dir, { recursive: true });
      const records = this._loadRecords();
      records.unshift(record);
      records.length = Math.min(records.length, 10);
      fs.writeFileSync(this.recordsPath, JSON.stringify(records, null, 2));
    } catch (error) {
      // Ignore persistence failures in the sample.
    }
  }

  _drawHeader(renderer) {
    renderer.drawString(4, 1, 'Tetris / Terminal Cabinet', COLORS.orange, true, UI_LAYER);
    renderer.drawString(4, 2, '原始命令行俄罗斯方块样例', COLORS.dim, false, UI_LAYER);
  }

  _renderMenu(renderer) {
    this._drawBox(renderer, 4, 4, 24, 14, '主菜单', COLORS.orange);
    renderer.drawString(7, 7, '请选择操作', COLORS.brightWhite, true, UI_LAYER);

    this.menuItems.forEach((item, index) => {
      const selected = index === this.selectedMenuIndex;
      const prefix = selected ? '> ' : '  ';
      renderer.drawString(
        7,
        9 + index * 2,
        prefix + item,
        selected ? COLORS.brightYellow : COLORS.brightWhite,
        selected,
        UI_LAYER
      );
    });

    renderer.drawString(7, 16, 'Enter 确认 / Q 退出', COLORS.dim, false, UI_LAYER);
    this._drawBox(renderer, 32, 4, 44, 14, '状态', COLORS.orange);
    renderer.drawString(35, 7, '7-bag 随机', COLORS.brightCyan, true, UI_LAYER);
    renderer.drawString(35, 9, '幽灵方块落点', COLORS.brightCyan, false, UI_LAYER);
    renderer.drawString(35, 11, '暂停 / 继续', COLORS.brightCyan, false, UI_LAYER);
    renderer.drawString(35, 13, '记录会保存在本地 JSON', COLORS.brightCyan, false, UI_LAYER);
    renderer.drawString(
      35,
      15,
      this._menuPulseVisible ? 'app.time.every() 驱动菜单提示闪烁' : '                                 ',
      this._menuPulseVisible ? COLORS.brightYellow : COLORS.dim,
      false,
      UI_LAYER
    );
    renderer.drawString(35, 16, 'WASD 或 方向键都可操作', COLORS.dim, false, UI_LAYER);
  }

  _renderRecords(renderer) {
    this._drawBox(renderer, 4, 4, 72, 20, '游戏记录', COLORS.orange);

    const records = this._loadRecords();
    renderer.drawString(7, 7, 'Top 10 Records', COLORS.brightWhite, true, UI_LAYER);

    if (!records.length) {
      renderer.drawString(7, 10, '暂无记录', COLORS.dim, false, UI_LAYER);
    } else {
      records.slice(0, 10).forEach((record, index) => {
        const line = [
          String(index + 1).padStart(2, '0'),
          `S:${String(record.score || 0).padStart(6, '0')}`,
          `L:${String(record.lines || 0).padStart(2, '0')}`,
          `Lv:${String(record.level || 1).padStart(2, '0')}`,
          formatDate(record.date)
        ].join('  ');
        renderer.drawString(7, 9 + index, line, COLORS.brightWhite, index === 0, UI_LAYER);
      });
    }

    renderer.drawString(7, 25, 'Esc / Q 返回菜单', COLORS.dim, false, UI_LAYER);
    renderer.drawString(45, 7, '说明', COLORS.brightWhite, true, UI_LAYER);
    renderer.drawString(45, 9, '记录按最新优先保存。', COLORS.brightCyan, false, UI_LAYER);
    renderer.drawString(45, 11, '同样支持中文显示。', COLORS.brightCyan, false, UI_LAYER);
    renderer.drawString(45, 13, '这个样例直接对应原始项目。', COLORS.brightCyan, false, UI_LAYER);
  }

  _renderGame(renderer) {
    this._drawBox(renderer, 4, 4, BOARD_WIDTH * CELL_WIDTH + 2, BOARD_HEIGHT + 2, 'WELL', COLORS.orange);
    this._drawBox(renderer, 28, 4, 48, BOARD_HEIGHT + 2, 'CONTROL / NEXT', COLORS.orange);

    this._drawBoard(renderer, 5, 5);
    this._drawPreview(renderer, 35, 6);
    this._drawStats(renderer, 31, 12);
    this._drawControls(renderer, 31, 19);
    this._drawFooter(renderer);
  }

  _drawBoard(renderer, x, y) {
    const ghost = this.mode === 'playing' ? this._getGhostPiece() : null;

    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cellX = x + col * CELL_WIDTH;
        const cellY = y + row;
        const baseBg = (row + col) % 2 === 0 ? COLORS.bgBlack : COLORS.bgDarkGray;
        renderer.drawString(cellX, cellY, EMPTY_CELL, null, false, Layer.BACKGROUND, baseBg);
        const block = this.board[row][col];
        if (block) {
          renderer.drawString(cellX, cellY, EMPTY_CELL, null, false, Layer.PLAYER, PIECE_STYLES[block].bg);
        }
      }
    }

    if (ghost) {
      for (const cell of this._getCells(ghost)) {
        if (cell.y < 0 || cell.y >= BOARD_HEIGHT || cell.x < 0 || cell.x >= BOARD_WIDTH) continue;
        if (this.board[cell.y][cell.x]) continue;
        renderer.drawString(
          x + cell.x * CELL_WIDTH,
          y + cell.y,
          '··',
          GHOST_STYLE.fg,
          false,
          Layer.PLAYER,
          GHOST_STYLE.bg
        );
      }
    }

    if (this.currentPiece) {
      for (const cell of this._getCells(this.currentPiece)) {
        if (cell.y < 0 || cell.y >= BOARD_HEIGHT || cell.x < 0 || cell.x >= BOARD_WIDTH) continue;
        renderer.drawString(
          x + cell.x * CELL_WIDTH,
          y + cell.y,
          EMPTY_CELL,
          null,
          true,
          Layer.PLAYER,
          PIECE_STYLES[this.currentPiece.shape.name].bg
        );
      }
    }
  }

  _drawPreview(renderer, x, y) {
    this._drawBox(renderer, x, y, 10, 6, 'NEXT', COLORS.orange);

    if (!this.nextPiece) return;

    const rotation = this.nextPiece.shape.rotations[0] || [];
    for (const [dx, dy] of rotation) {
      renderer.drawString(
        x + 1 + dx * CELL_WIDTH,
        y + 1 + dy,
        EMPTY_CELL,
        null,
        false,
        UI_LAYER,
        PIECE_STYLES[this.nextPiece.shape.name].bg
      );
    }
  }

  _drawStats(renderer, x, y) {
    const pace = Math.round(1000 / this.dropInterval);

    renderer.drawString(x, y, 'SCORE', COLORS.dim, false, UI_LAYER);
    renderer.drawString(x + 9, y, String(this.score).padStart(6, '0'), COLORS.brightYellow, true, UI_LAYER);
    renderer.drawString(x, y + 2, 'LINES', COLORS.dim, false, UI_LAYER);
    renderer.drawString(x + 9, y + 2, String(this.lines).padStart(2, '0'), COLORS.brightCyan, true, UI_LAYER);
    renderer.drawString(x, y + 4, 'LEVEL', COLORS.dim, false, UI_LAYER);
    renderer.drawString(x + 9, y + 4, String(this.level).padStart(2, '0'), COLORS.brightGreen, true, UI_LAYER);
    renderer.drawString(x, y + 6, 'PACE', COLORS.dim, false, UI_LAYER);
    renderer.drawString(x + 9, y + 6, `${pace} u/s`, COLORS.brightWhite, true, UI_LAYER);
  }

  _drawControls(renderer, x, y) {
    renderer.drawString(x, y, '操作', COLORS.brightWhite, true, UI_LAYER);
    const lines = [
      'A/D 或 ←→ 平移',
      'W / ↑ 旋转',
      'S / ↓ 软降',
      'Space 硬降 · P 暂停 · Q 菜单'
    ];

    lines.forEach((line, index) => {
      renderer.drawString(x, y + 2 + index, line, COLORS.brightCyan, false, UI_LAYER);
    });
  }

  _drawFooter(renderer) {
    const footerText = this._statusText || '参考原始项目的命令行玩法：菜单、记录、暂停、7-bag、幽灵块与本地存档。';
    renderer.drawString(
      4,
      30,
      footerText,
      this._statusText ? COLORS.brightYellow : COLORS.dim,
      false,
      UI_LAYER
    );
  }

  _startMenuPulse() {
    if (!this.app || !this.app.time) return;

    this.app.time.cancelByOwner(this._menuPulseOwner);
    this._menuPulseVisible = true;
    this.app.time.every(450, () => {
      if (this.mode !== 'menu') {
        return false;
      }
      this._menuPulseVisible = !this._menuPulseVisible;
      return true;
    }, { owner: this._menuPulseOwner });
  }

  _stopMenuPulse() {
    if (!this.app || !this.app.time) return;
    this.app.time.cancelByOwner(this._menuPulseOwner);
    this._menuPulseVisible = true;
  }

  _flashStatus(text, duration = 1200) {
    this._statusText = text;
    if (!this.app || !this.app.time) return;

    this.app.time.cancelByOwner(this._statusOwner);
    this.app.time.after(duration, () => {
      this._statusText = '';
    }, { owner: this._statusOwner });
  }

  _drawBox(renderer, x, y, width, height, title, color) {
    if (width < 2 || height < 2) return;

    renderer.drawString(x, y, `┌${'─'.repeat(width - 2)}┐`, color, true, UI_LAYER);
    for (let row = 1; row < height - 1; row++) {
      renderer.drawString(x, y + row, `│${' '.repeat(width - 2)}│`, color, false, Layer.BACKGROUND);
    }
    renderer.drawString(x, y + height - 1, `└${'─'.repeat(width - 2)}┘`, color, true, UI_LAYER);

    if (title) {
      renderer.drawString(x + 2, y, title, color, true, UI_LAYER);
    }
  }

  _drawCenterBox(renderer, x, y, width, height, title, color) {
    this._drawBox(renderer, x, y, width, height, title, color);
  }

  _drawSolidModalBox(renderer, x, y, width, height, title, color, fillColor) {
    if (width < 2 || height < 2) return;

    renderer.fillRect(x, y, width, height, ' ', null, false, MODAL_LAYER, fillColor);
    renderer.drawString(x, y, `┌${'─'.repeat(width - 2)}┐`, color, true, MODAL_LAYER, fillColor);
    for (let row = 1; row < height - 1; row++) {
      renderer.drawString(x, y + row, `│${' '.repeat(width - 2)}│`, color, false, MODAL_LAYER, fillColor);
    }
    renderer.drawString(x, y + height - 1, `└${'─'.repeat(width - 2)}┘`, color, true, MODAL_LAYER, fillColor);

    if (title) {
      renderer.drawString(x + 2, y, title, color, true, MODAL_LAYER, fillColor);
    }
  }

  _isUpKey(key) {
    return key === 'ArrowUp' || key === 'w' || key === 'W';
  }

  _isDownKey(key) {
    return key === 'ArrowDown' || key === 's' || key === 'S';
  }

  _isLeftKey(key) {
    return key === 'ArrowLeft' || key === 'a' || key === 'A';
  }

  _isRightKey(key) {
    return key === 'ArrowRight' || key === 'd' || key === 'D';
  }

  _isConfirmKey(key) {
    return key === 'Enter' || key === ' ';
  }

  _isDropKey(key) {
    return key === ' ';
  }

  _isPauseKey(key) {
    return key === 'p' || key === 'P' || key === 'Escape';
  }

  _isBackKey(key) {
    return key === 'q' || key === 'Q' || key === 'Escape';
  }
}

module.exports = { TetrisScene };
