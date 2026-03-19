import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { AboutScene } from "./scenes/AboutScene";
import { GameScene } from "./scenes/GameScene";
import { Settings } from "./state/Settings";

const settings = Settings.load();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#07040d",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  scene: [new BootScene(settings), new MenuScene(settings), new SettingsScene(settings), new AboutScene(settings), new GameScene(settings)]
});

