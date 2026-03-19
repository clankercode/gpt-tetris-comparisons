import Phaser from "phaser";
import { audio } from "../audio";
import { createRetroBackdrop } from "../backdrop";
import { computeMenuLayout } from "../layout";
import { SceneKeys } from "../sceneKeys";
import type { AppProfile } from "../storage";
import { createRetroButton, createRetroText } from "../ui";
import { COLORS, FONT, hexToCssColor } from "../theme";

export class MainMenuScene extends Phaser.Scene {
  private backdrop?: ReturnType<typeof createRetroBackdrop>;
  private profile!: AppProfile;
  private layout = computeMenuLayout(1280, 720);
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private menuFrame!: Phaser.GameObjects.Graphics;
  private controlsFrame!: Phaser.GameObjects.Graphics;
  private controlsTitle!: Phaser.GameObjects.Text;
  private controlsBody!: Phaser.GameObjects.Text;
  private controlsFooter!: Phaser.GameObjects.Text;
  private menuButtons: ReturnType<typeof createRetroButton>[] = [];
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
  };
  private selectedIndex = 0;
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    this.profile = this.registry.get("profile") as AppProfile;
    audio.setSettings(this.profile.audio);
    audio.setMode("menu");

    this.backdrop = createRetroBackdrop(this, "menu");

    this.title = this.add.text(0, 0, "RETRO TETRIS CABINET", {
      fontFamily: FONT.heading,
      fontSize: "34px",
      color: hexToCssColor(COLORS.text),
      align: "center",
    });
    this.title.setOrigin(0.5);
    this.title.setShadow(0, 0, "#63ffd8", 18, false, true);

    this.subtitle = createRetroText(
      this,
      0,
      0,
      "phosphor glow . chiptune pulse . classic stacker rules",
      15,
      "#9eb8b0",
      "center",
    );
    this.subtitle.setOrigin(0.5, 0);

    this.bestScoreText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "15px",
      color: "#edfff7",
      align: "center",
    });
    this.bestScoreText.setOrigin(0.5, 0);
    this.bestScoreText.setShadow(0, 0, "#63ffd8", 8, false, true);

    this.menuFrame = this.add.graphics();
    this.controlsFrame = this.add.graphics();
    this.menuFrame.setDepth(-10);
    this.controlsFrame.setDepth(-10);

    this.controlsTitle = this.add.text(0, 0, "CONTROLS", {
      fontFamily: FONT.body,
      fontSize: "16px",
      color: "#63ffd8",
    });
    this.controlsTitle.setDepth(5);

    this.controlsBody = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#edfdf7",
      lineSpacing: 8,
    });
    this.controlsBody.setDepth(5);

    this.controlsFooter = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "12px",
      color: "#9eb8b0",
      wordWrap: { width: 360 },
    });
    this.controlsFooter.setDepth(5);

    this.menuButtons = [
      createRetroButton(this, {
        x: 0,
        y: 0,
        width: 320,
        height: 62,
        label: "NEW GAME OPTIONS",
        sublabel: "choose your starting level",
        onClick: () => this.openNewGameOptions(),
      }),
      createRetroButton(this, {
        x: 0,
        y: 0,
        width: 320,
        height: 62,
        label: "SETTINGS",
        sublabel: "audio . motion . scanlines",
        onClick: () => this.openSettings(),
      }),
      createRetroButton(this, {
        x: 0,
        y: 0,
        width: 320,
        height: 62,
        label: "ABOUT",
        sublabel: "rules . scoring . credits",
        onClick: () => this.openAbout(),
      }),
    ];

    this.selectedIndex = 0;
    this.updateSelection();
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    }) as {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      enter: Phaser.Input.Keyboard.Key;
    };
    this.reflow(true);

    this.tweens.add({
      targets: this.title,
      y: this.title.y + 6,
      duration: 1900,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  update(_time: number, delta: number): void {
    if (this.lastWidth !== this.scale.width || this.lastHeight !== this.scale.height) {
      this.reflow();
    }

    this.backdrop?.update(delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.menuButtons.length);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.menuButtons.length);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.activateSelected();
    }
  }

  private reflow(initial = false): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.lastWidth = width;
    this.lastHeight = height;
    this.layout = computeMenuLayout(width, height);
    this.backdrop?.resize(width, height);

    const titleY = this.layout.titleY;
    this.title.setPosition(width / 2, titleY);
    this.title.setFontSize(`${this.layout.titleSize}px`);
    this.subtitle.setPosition(width / 2, titleY + 46);

    this.bestScoreText.setText(
      `BEST SCORE  ${this.profile.highScore.toLocaleString()}\nSTART LEVEL  ${this.profile.gameplay.startingLevel}`,
    );
    const bestX = this.layout.compact ? width / 2 : width - 170;
    const bestY = this.layout.compact ? titleY + 88 : 32;
    this.bestScoreText.setPosition(bestX, bestY);

    const menuY = this.layout.menuY;
    const menuHeight = this.layout.menuHeight;
    const menuX = width / 2 - this.layout.menuWidth / 2;
    this.menuFrame.clear();
    this.menuFrame.fillStyle(COLORS.panel, 0.88);
    this.menuFrame.fillRoundedRect(menuX, menuY, this.layout.menuWidth, menuHeight, 20);
    this.menuFrame.lineStyle(2, COLORS.panelEdgeDim, 0.7);
    this.menuFrame.strokeRoundedRect(menuX, menuY, this.layout.menuWidth, menuHeight, 20);
    this.menuFrame.lineStyle(1, COLORS.panelEdge, 0.18);
    this.menuFrame.strokeRoundedRect(menuX + 8, menuY + 8, this.layout.menuWidth - 16, menuHeight - 16, 16);

    const buttonTop = menuY + 32;
    const buttonGap = 76;
    this.menuButtons.forEach((button, index) => {
      button.container.setPosition(width / 2, buttonTop + index * buttonGap);
    });

    const controlsX = this.layout.controlsX;
    const controlsY = this.layout.controlsY;
    const controlsWidth = this.layout.controlsWidth;
    const controlsHeight = this.layout.controlsHeight;
    this.controlsFrame.clear();
    this.controlsFrame.fillStyle(COLORS.panel, 0.88);
    this.controlsFrame.fillRoundedRect(controlsX, controlsY, controlsWidth, controlsHeight, 18);
    this.controlsFrame.lineStyle(2, COLORS.panelEdgeDim, 0.6);
    this.controlsFrame.strokeRoundedRect(controlsX, controlsY, controlsWidth, controlsHeight, 18);
    this.controlsFrame.lineStyle(1, COLORS.panelEdge, 0.18);
    this.controlsFrame.strokeRoundedRect(controlsX + 6, controlsY + 6, controlsWidth - 12, controlsHeight - 12, 14);

    this.controlsTitle.setPosition(controlsX + 18, controlsY + 16);
    this.controlsBody.setPosition(controlsX + 18, controlsY + 48);
    this.controlsBody.setText([
      "ARROWS   move / soft drop",
      "Z / X    rotate",
      "ESC / P  pause",
      "R        restart",
      "ENTER    select",
    ].join("\n"));
    this.controlsBody.setWordWrapWidth(controlsWidth - 36);
    this.controlsFooter.setPosition(controlsX + 18, controlsY + controlsHeight - 48);
    this.controlsFooter.setText("Classic rules. No hold. No ghost piece. 7-bag randomizer.");
    this.controlsFooter.setWordWrapWidth(controlsWidth - 36);
  }

  private updateSelection(): void {
    this.menuButtons.forEach((button, index) => {
      button.setSelected(index === this.selectedIndex);
    });
  }

  private activateSelected(): void {
    audio.playSfx("confirm");

    switch (this.selectedIndex) {
      case 0:
        this.openNewGameOptions();
        break;
      case 1:
        this.openSettings();
        break;
      case 2:
        this.openAbout();
        break;
    }
  }

  private openNewGameOptions(): void {
    this.scene.start(SceneKeys.NewGameOptions);
  }

  private openSettings(): void {
    this.scene.start(SceneKeys.Settings);
  }

  private openAbout(): void {
    this.scene.start(SceneKeys.About);
  }
}
