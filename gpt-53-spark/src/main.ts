import './style.css';
import Phaser from 'phaser';
import AboutScene from './scenes/AboutScene';
import GameScene from './scenes/GameScene';
import MenuScene from './scenes/MenuScene';
import SettingsScene from './scenes/SettingsScene';
import { defaultGameSettings } from './core/settings';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 760,
  parent: 'game-root',
  backgroundColor: '#081124',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  pixelArt: true,
  render: {
    antialias: false,
    pixelArt: true
  },
  scene: [MenuScene, GameScene, SettingsScene, AboutScene]
};

const game = new Phaser.Game(config);
game.registry.set('gameSettings', defaultGameSettings);
