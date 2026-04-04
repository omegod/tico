#!/usr/bin/env node

const { EngineApp } = require('../../../src');
const { StarHunterScene } = require('./scene/StarHunterScene');

const app = new EngineApp({
  width: 80,
  height: 32,
  frameRate: 50,
  stdout: process.stdout
});

app.addScene('star-hunter', new StarHunterScene());
app.start('star-hunter');
