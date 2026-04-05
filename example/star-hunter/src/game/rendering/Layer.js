const Layer = {
  BACKGROUND: 0,
  PARTICLES: 10,
  POWERUPS: 20,
  ENEMIES: 30,
  BOSS: 40,
  BULLETS: 50,
  PLAYER: 60,
  SHIELD: 65,
  HUD: 100,
  BANNER: 200,
  MODAL: 300,
  CURSOR: 1000
};

Layer.compare = (a, b) => a - b;

module.exports = { Layer };
