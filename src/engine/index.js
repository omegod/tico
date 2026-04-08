const { EngineApp } = require('./app/EngineApp');
const { GameEngine, GAME_STATE } = require('./core/GameEngine');
const { EngineTime } = require('./core/EngineTime');
const { Sequence } = require('./core/Sequence');
const { EventBus } = require('./core/EventBus');
const { EntityManager, Entity } = require('./core/EntityManager');
const { CollisionSystem } = require('./core/CollisionSystem');
const { InputHandler } = require('./input/InputHandler');
const { InputActionContext } = require('./input/InputHandler');
const { KeyMapping, getAction, matches } = require('./input/KeyMapping');
const { ActionMap } = require('./input/ActionMap');
const { Scene } = require('./scene/Scene');
const { SceneManager } = require('./scene/SceneManager');
const { Node2D } = require('./nodes/Node2D');
const { SpriteNode } = require('./nodes/SpriteNode');
const { TextNode } = require('./nodes/TextNode');
const { TilemapNode } = require('./nodes/TilemapNode');
const { PhysicsWorld } = require('./physics/PhysicsWorld');
const { Renderer, COLORS, Layer, RenderSpace } = require('./rendering/Renderer');
const { Camera2D } = require('./rendering/Camera2D');
const { ResourceManager } = require('./resources/ResourceManager');
const { AnimationPlayer } = require('./animation/AnimationPlayer');
const { Tween, EASING } = require('./animation/Tween');
const {
  ScreenBuffer,
  Cell,
  isFullWidth,
  strWidth,
  stripAnsi,
  padEndDisplay,
  getCenterPadding,
  center,
  repeatChar
} = require('./rendering/ScreenBuffer');
const {
  BORDER_STYLES,
  normalizeLines,
  resolveBorder,
  borderThickness,
  measureText,
  measureLines,
  styleText,
  alignText,
  padBlock,
  stackBlocks,
  frameLines,
  dividerLine,
  frameMetrics,
  resolvePosition
} = require('./layout');
const {
  Widget,
  TextWidget,
  BarWidget,
  MenuWidget,
  PanelWidget,
  DialogWidget
} = require('./widgets');

module.exports = {
  EngineApp,
  GameEngine,
  GAME_STATE,
  EngineTime,
  Sequence,
  EventBus,
  EntityManager,
  Entity,
  CollisionSystem,
  InputHandler,
  InputActionContext,
  KeyMapping,
  getAction,
  matches,
  ActionMap,
  Scene,
  SceneManager,
  Node2D,
  SpriteNode,
  TextNode,
  TilemapNode,
  PhysicsWorld,
  Renderer,
  COLORS,
  Layer,
  RenderSpace,
  Camera2D,
  ResourceManager,
  AnimationPlayer,
  Tween,
  EASING,
  ScreenBuffer,
  Cell,
  isFullWidth,
  strWidth,
  stripAnsi,
  padEndDisplay,
  getCenterPadding,
  center,
  repeatChar,
  BORDER_STYLES,
  normalizeLines,
  resolveBorder,
  borderThickness,
  measureText,
  measureLines,
  styleText,
  alignText,
  padBlock,
  stackBlocks,
  frameLines,
  dividerLine,
  frameMetrics,
  resolvePosition,
  Widget,
  TextWidget,
  BarWidget,
  MenuWidget,
  PanelWidget,
  DialogWidget
};
