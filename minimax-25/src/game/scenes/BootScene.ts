import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import { GameScene } from './GameScene';
import { SettingsScene } from './SettingsScene';
import { AboutScene } from './AboutScene';
import { GameSettings } from '../types';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const base = '/gpt-tetris-comparisons/minimax-25';
    this.load.audio('music', `${base}/music/music.wav`);
    this.load.audio('drop', `${base}/music/drop.wav`);
    this.load.audio('line', `${base}/music/line.wav`);
    this.load.audio('tetris', `${base}/music/tetris.wav`);
  }

  create() {
    this.scene.start('MenuScene');
  }
}

export function createGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#0a0a0a',
    scene: [BootScene, MenuScene, GameScene, SettingsScene, AboutScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
  };

  return new Phaser.Game(config);
}

export type { GameSettings };
