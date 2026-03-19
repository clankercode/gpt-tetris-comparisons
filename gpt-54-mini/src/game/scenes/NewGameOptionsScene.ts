import Phaser from "phaser";
import { audio } from "../audio";
import { createRetroBackdrop } from "../backdrop";
import { computeMenuLayout } from "../layout";
import { SceneKeys } from "../sceneKeys";
import type { AppProfile } from "../storage";
import { saveProfile } from "../storage";
import {
  createOptionRow,
  createRetroButton,
  createRetroText,
} from "../ui";
import { COLORS, FONT } from "../theme";

export class NewGameOptionsScene extends Phaser.Scene {
  private backdrop?: ReturnType<typeof createRetroBackdrop>;
  private profile!: AppProfile;
  private layout = computeMenuLayout(1280, 720);
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;
  private footerText!: Phaser.GameObjects.Text;
  private frame!: Phaser.GameObjects.Graphics;
  private levelRow!: ReturnType<typeof createOptionRow>;
  private startButton!: ReturnType<typeof createRetroButton>;
  private backButton!: ReturnType<typeof createRetroButton>;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
  };
  private selectedIndex = 0;
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super(SceneKeys.NewGameOptions);
  }

  create(): void {
    this.profile = this.registry.get("profile") as AppProfile;
    audio.setSettings(this.profile.audio);
    audio.setMode("menu");

    this.backdrop = createRetroBackdrop(this, "menu");
    this.title = this.add.text(0, 0, "NEW GAME OPTIONS", {
      fontFamily: FONT.heading,
      fontSize: "30px",
      color: "#edfdf7",
      align: "center",
    });
    this.title.setOrigin(0.5);
    this.title.setShadow(0, 0, "#63ffd8", 18, false, true);

    this.hint = createRetroText(
      this,
      0,
      0,
      "Use LEFT / RIGHT to adjust the start level. ENTER launches the run.",
      14,
      "#9eb8b0",
      "center",
    );
    this.hint.setOrigin(0.5, 0);

    this.frame = this.add.graphics();
    this.frame.setDepth(-10);
    this.introText = this.add.text(0, 0, "THE GAME WILL START WITH:", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#63ffd8",
    });
    this.introText.setDepth(5);

    this.footerText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "12px",
      color: "#9eb8b0",
      wordWrap: { width: 1 },
    });
    this.footerText.setDepth(5);

    this.levelRow = createOptionRow(this, {
      x: 0,
      y: 0,
      width: 360,
      height: 52,
      label: "START LEVEL",
      value: `LEVEL ${this.profile.gameplay.startingLevel}`,
    });
    this.levelRow.container.on("pointerdown", () => {
      this.selectedIndex = 0;
      this.updateSelection();
    });
    this.startButton = createRetroButton(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 60,
      label: "START GAME",
      sublabel: "classic cadence . fair 7-bag",
      onClick: () => this.startGame(),
    });
    this.backButton = createRetroButton(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 60,
      label: "BACK",
      sublabel: "return to the main menu",
      onClick: () => this.goBack(),
    });

    this.selectedIndex = 0;
    this.updateSelection();
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      enter: Phaser.Input.Keyboard.Key;
      esc: Phaser.Input.Keyboard.Key;
    };
    this.reflow(true);
  }

  update(_time: number, delta: number): void {
    if (this.lastWidth !== this.scale.width || this.lastHeight !== this.scale.height) {
      this.reflow();
    }

    this.backdrop?.update(delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, 3);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, 3);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.left) && this.selectedIndex === 0) {
      this.adjustStartLevel(-1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.right) && this.selectedIndex === 0) {
      this.adjustStartLevel(1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      if (this.selectedIndex === 0) {
        this.startGame();
      } else if (this.selectedIndex === 1) {
        this.startGame();
      } else if (this.selectedIndex === 2) {
        this.goBack();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.goBack();
    }
  }

  private reflow(initial = false): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.lastWidth = width;
    this.lastHeight = height;
    this.layout = computeMenuLayout(width, height);
    this.backdrop?.resize(width, height);

    this.title.setPosition(width / 2, this.layout.titleY);
    this.title.setFontSize(`${this.layout.titleSize}px`);
    this.hint.setPosition(width / 2, this.layout.titleY + 46);

    const frameWidth = Math.min(width - 32, 560);
    const frameHeight = this.layout.compact ? 292 : 308;
    const frameX = width / 2 - frameWidth / 2;
    const frameY = this.layout.compact ? height * 0.32 : height * 0.33;

    this.frame.clear();
    this.frame.fillStyle(COLORS.panel, 0.9);
    this.frame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(2, COLORS.panelEdgeDim, 0.65);
    this.frame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(1, COLORS.panelEdge, 0.18);
    this.frame.strokeRoundedRect(frameX + 8, frameY + 8, frameWidth - 16, frameHeight - 16, 16);

    this.levelRow.container.setPosition(width / 2, frameY + 84);
    this.startButton.container.setPosition(width / 2, frameY + 174);
    this.backButton.container.setPosition(width / 2, frameY + 246);

    this.introText.setPosition(frameX + 24, frameY + 18);
    this.footerText.setPosition(frameX + 24, frameY + frameHeight - 42);
    this.footerText.setText("Classic retro rules, no hold piece, no ghost piece, and a fair 7-bag shuffle.");
    this.footerText.setWordWrapWidth(frameWidth - 48);
  }

  private updateSelection(): void {
    this.levelRow.setSelected(this.selectedIndex === 0);
    this.startButton.setSelected(this.selectedIndex === 1);
    this.backButton.setSelected(this.selectedIndex === 2);
  }

  private adjustStartLevel(delta: number): void {
    this.profile.gameplay.startingLevel = Phaser.Math.Clamp(
      this.profile.gameplay.startingLevel + delta,
      0,
      29,
    );
    this.levelRow.setValue(`LEVEL ${this.profile.gameplay.startingLevel}`);
    this.registry.set("profile", this.profile);
    saveProfile(this.profile);
    audio.playSfx("menu");
  }

  private startGame(): void {
    this.registry.set("profile", this.profile);
    saveProfile(this.profile);
    audio.playSfx("confirm");
    this.scene.start(SceneKeys.Game);
  }

  private goBack(): void {
    audio.playSfx("back");
    this.scene.start(SceneKeys.MainMenu);
  }
}
