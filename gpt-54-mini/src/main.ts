import Phaser from "phaser";
import { audio } from "./game/audio";
import { BootScene } from "./game/scenes/BootScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { NewGameOptionsScene } from "./game/scenes/NewGameOptionsScene";
import { SettingsScene } from "./game/scenes/SettingsScene";
import { AboutScene } from "./game/scenes/AboutScene";
import { GameScene } from "./game/scenes/GameScene";
import "./styles.css";

async function bootstrap() {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Fonts are a visual enhancement; the game still runs without them.
    }
  }

  document.title = "Retro Tetris Cabinet";

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#05060a",
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      MainMenuScene,
      NewGameOptionsScene,
      SettingsScene,
      AboutScene,
      GameScene,
    ],
  });

  let unlocked = false;
  const unlockAudio = () => {
    if (unlocked) {
      return;
    }

    unlocked = true;
    void audio.unlock();
  };

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });

  window.addEventListener("beforeunload", () => {
    game.destroy(true);
  });
}

void bootstrap();
