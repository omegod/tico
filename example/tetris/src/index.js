#!/usr/bin/env node

const { EngineApp } = require('../../../src');
const { TetrisScene } = require('./TetrisScene');

const app = new EngineApp({
  width: 80,
  height: 32,
  frameRate: 50,
  stdout: process.stdout
});

app.addScene('tetris', new TetrisScene());
app.start('tetris');
