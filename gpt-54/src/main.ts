import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./game/scenes/BootScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { GameScene } from "./game/scenes/GameScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 800,
  backgroundColor: "#05030a",
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
});

window.addEventListener("resize", () => {
  game.scale.refresh();
});
