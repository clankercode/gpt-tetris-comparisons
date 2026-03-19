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
  formatPercent,
  formatToggle,
} from "../ui";
import { COLORS, FONT } from "../theme";

type SettingRow = {
  control: ReturnType<typeof createOptionRow>;
  adjust(delta: number): void;
  refresh(): void;
};

export class SettingsScene extends Phaser.Scene {
  private backdrop?: ReturnType<typeof createRetroBackdrop>;
  private profile!: AppProfile;
  private layout = computeMenuLayout(1280, 720);
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private sectionTitle!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private frame!: Phaser.GameObjects.Graphics;
  private rows: SettingRow[] = [];
  private backButton!: ReturnType<typeof createRetroButton>;
  private selectedIndex = 0;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
  };
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super(SceneKeys.Settings);
  }

  create(): void {
    this.profile = this.registry.get("profile") as AppProfile;
    audio.setSettings(this.profile.audio);
    audio.setMode("menu");

    this.backdrop = createRetroBackdrop(this, "menu");
    this.title = this.add.text(0, 0, "SETTINGS", {
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
      "LEFT / RIGHT changes values. ENTER toggles the selected row. ESC returns.",
      14,
      "#9eb8b0",
      "center",
    );
    this.hint.setOrigin(0.5, 0);

    this.footer = createRetroText(
      this,
      0,
      0,
      "All changes are saved instantly to local storage.",
      12,
      "#9eb8b0",
      "center",
    );
    this.footer.setOrigin(0.5, 0);

    this.frame = this.add.graphics();
    this.frame.setDepth(-10);

    this.sectionTitle = this.add.text(0, 0, "AUDIO . VISUALS . ACCESSIBILITY", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#63ffd8",
    });
    this.sectionTitle.setDepth(5);

    const rowDefs = [
      {
        label: "MUSIC",
        adjust: (delta: number) => {
          if (delta !== 0) {
            this.profile.audio.musicEnabled = !this.profile.audio.musicEnabled;
          }
        },
        refresh: () => formatToggle(this.profile.audio.musicEnabled),
      },
      {
        label: "MUSIC VOLUME",
        adjust: (delta: number) => {
          this.profile.audio.musicVolume = Phaser.Math.Clamp(
            this.profile.audio.musicVolume + delta * 0.05,
            0,
            1,
          );
        },
        refresh: () => formatPercent(this.profile.audio.musicVolume),
      },
      {
        label: "SFX",
        adjust: (delta: number) => {
          if (delta !== 0) {
            this.profile.audio.sfxEnabled = !this.profile.audio.sfxEnabled;
          }
        },
        refresh: () => formatToggle(this.profile.audio.sfxEnabled),
      },
      {
        label: "SFX VOLUME",
        adjust: (delta: number) => {
          this.profile.audio.sfxVolume = Phaser.Math.Clamp(
            this.profile.audio.sfxVolume + delta * 0.05,
            0,
            1,
          );
        },
        refresh: () => formatPercent(this.profile.audio.sfxVolume),
      },
      {
        label: "SCANLINES",
        adjust: (delta: number) => {
          this.profile.visuals.scanlines = Phaser.Math.Clamp(
            this.profile.visuals.scanlines + delta * 0.05,
            0,
            1,
          );
        },
        refresh: () => formatPercent(this.profile.visuals.scanlines),
      },
      {
        label: "SCREEN SHAKE",
        adjust: (delta: number) => {
          if (delta !== 0) {
            this.profile.visuals.screenShake = !this.profile.visuals.screenShake;
          }
        },
        refresh: () => formatToggle(this.profile.visuals.screenShake),
      },
      {
        label: "REDUCED MOTION",
        adjust: (delta: number) => {
          if (delta !== 0) {
            this.profile.visuals.reducedMotion = !this.profile.visuals.reducedMotion;
          }
        },
        refresh: () => formatToggle(this.profile.visuals.reducedMotion),
      },
    ];

    this.rows = rowDefs.map((definition, index) => {
      const control = createOptionRow(this, {
        x: 0,
        y: 0,
        width: 420,
        height: 46,
        label: definition.label,
        value: definition.refresh(),
      });
      const entry: SettingRow = {
        control,
        adjust: definition.adjust,
        refresh: () => {
          control.setValue(definition.refresh());
        },
      };

      control.container.on("pointerdown", () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      return entry;
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
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.rows.length + 1);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.rows.length + 1);
      this.updateSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.adjustSelected(-1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.adjustSelected(1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      if (this.selectedIndex === this.rows.length) {
        this.goBack();
      } else {
        this.adjustSelected(1);
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

    const frameWidth = Math.min(width - 32, 640);
    const frameHeight = this.layout.compact ? Math.min(height - 200, 546) : 476;
    const frameX = width / 2 - frameWidth / 2;
    const frameY = this.layout.compact ? height * 0.24 : height * 0.28;

    this.frame.clear();
    this.frame.fillStyle(COLORS.panel, 0.9);
    this.frame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(2, COLORS.panelEdgeDim, 0.65);
    this.frame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(1, COLORS.panelEdge, 0.18);
    this.frame.strokeRoundedRect(frameX + 8, frameY + 8, frameWidth - 16, frameHeight - 16, 16);

    const rowTop = frameY + 76;
    const rowGap = this.layout.compact ? 50 : 50;
    this.rows.forEach((entry, index) => {
      entry.control.container.setPosition(width / 2, rowTop + index * rowGap);
      entry.refresh();
    });

    this.backButton.container.setPosition(width / 2, frameY + frameHeight - 60);
    this.footer.setPosition(width / 2, frameY + frameHeight + 18);
    this.footer.setWordWrapWidth(frameWidth);
    this.sectionTitle.setPosition(frameX + 24, frameY + 18);
  }

  private updateSelection(): void {
    this.rows.forEach((entry, index) => {
      entry.control.setSelected(index === this.selectedIndex);
    });
    this.backButton.setSelected(this.selectedIndex === this.rows.length);
  }

  private adjustSelected(delta: number): void {
    if (this.selectedIndex < this.rows.length) {
      this.rows[this.selectedIndex].adjust(delta);
      this.rows[this.selectedIndex].refresh();
      this.commitChanges();
      audio.playSfx("menu");
    }
  }

  private commitChanges(): void {
    this.registry.set("profile", this.profile);
    saveProfile(this.profile);
    audio.setSettings(this.profile.audio);
  }

  private goBack(): void {
    this.commitChanges();
    audio.playSfx("back");
    this.scene.start(SceneKeys.MainMenu);
  }
}
