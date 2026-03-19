import Phaser from "phaser";
import { saveSettings } from "../audio";
import { DEFAULT_OPTIONS, MENU_CONTROLS, MUSIC_THEMES, PALETTES } from "../config";
import type { GameOptions, MusicThemeKey, PaletteKey, SettingsState } from "../types";

type PanelKey = "main" | "new_game" | "settings" | "about";

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private panelText: Phaser.GameObjects.Text[] = [];
  private selection = 0;
  private panel: PanelKey = "main";
  private options: GameOptions = { ...DEFAULT_OPTIONS };
  private settings!: SettingsState;

  constructor() {
    super("menu");
  }

  create(): void {
    this.settings = { ...window.__neonMatrixSettings! };
    this.options = { ...window.__neonMatrixOptions! };

    this.cameras.main.setBackgroundColor("#06030c");
    this.buildBackdrop();
    this.buildFrame();
    this.buildMenu();
    this.buildControls();
    this.refreshPanel();
    this.registerInput();

    this.input.keyboard?.on("keydown", async () => {
      await window.__neonMatrixAudio?.resume();
      if (this.panel !== "new_game") {
        window.__neonMatrixAudio?.startMusic(this.options.musicTheme);
      }
    });
    this.input.on("pointerdown", async () => {
      await window.__neonMatrixAudio?.resume();
      if (this.panel !== "new_game") {
        window.__neonMatrixAudio?.startMusic(this.options.musicTheme);
      }
    });
  }

  private buildBackdrop(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x140520, 0x140520, 0x040208, 0x040208, 1);
    g.fillRect(0, 0, 1280, 800);

    for (let i = 0; i < 16; i += 1) {
      const alpha = 0.04 + i * 0.003;
      g.lineStyle(2, i % 2 === 0 ? 0x57e8ff : 0xff7f5a, alpha);
      g.strokeCircle(980 + Math.cos(i) * 120, 120 + i * 4, 180 + i * 14);
    }

    for (let i = 0; i < 28; i += 1) {
      const x = 50 + i * 44;
      g.fillStyle(0x7dffb1, 0.05);
      g.fillRect(x, 0, 2, 800);
    }
  }

  private buildFrame(): void {
    const frame = this.add.graphics();
    frame.lineStyle(6, 0x57e8ff, 0.35);
    frame.strokeRoundedRect(48, 44, 1184, 712, 22);
    frame.lineStyle(2, 0xffb85a, 0.3);
    frame.strokeRoundedRect(58, 54, 1164, 692, 18);

    const vignette = this.add.rectangle(640, 400, 1120, 648, 0x0b0713, 0.42);
    vignette.setStrokeStyle(1, 0x4ee8ff, 0.18);
  }

  private buildMenu(): void {
    this.titleText = this.add.text(112, 92, "NEON MATRIX", {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
      fontSize: "56px",
      color: "#f8efc8",
      stroke: "#57e8ff",
      strokeThickness: 6,
    });
    this.titleText.setShadow(0, 0, "#57e8ff", 24, true, true);

    this.subtitleText = this.add.text(118, 154, "RETRO STACKING SIGNAL // INSERT COIN IN YOUR MIND", {
      fontFamily: '"Courier New", monospace',
      fontSize: "18px",
      color: "#ffbe55",
    });

    const labels = ["NEW GAME", "SETTINGS", "ABOUT"];
    labels.forEach((label, index) => {
      const text = this.add.text(120, 250 + index * 66, label, {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: "34px",
        color: "#c8c08f",
      });
      text.setInteractive({ useHandCursor: true });
      text.on("pointerover", () => {
        this.selection = index;
        this.refreshMenuHighlight();
      });
      text.on("pointerdown", () => this.selectMainItem());
      this.menuItems.push(text);
    });

    this.refreshMenuHighlight();
  }

  private buildControls(): void {
    this.add.text(840, 122, "CONTROLS", {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
      fontSize: "28px",
      color: "#f8efc8",
      stroke: "#ffb85a",
      strokeThickness: 3,
    }).setShadow(0, 0, "#ffb85a", 14, true, true);

    this.add.rectangle(970, 300, 300, 330, 0x110c1c, 0.78).setStrokeStyle(2, 0x4ee8ff, 0.26);

    MENU_CONTROLS.forEach((line, index) => {
      this.add.text(840, 190 + index * 40, line, {
        fontFamily: '"Courier New", monospace',
        fontSize: "18px",
        color: index % 2 === 0 ? "#7dffb1" : "#f8efc8",
      });
    });
  }

  private registerInput(): void {
    this.input.keyboard?.on("keydown-UP", () => this.adjustSelection(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.adjustSelection(1));
    this.input.keyboard?.on("keydown-LEFT", () => this.adjustValue(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.adjustValue(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.confirm());
    this.input.keyboard?.on("keydown-ESC", () => this.back());
    this.tweens.add({
      targets: this.titleText,
      y: { from: 96, to: 88 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private adjustSelection(delta: number): void {
    if (this.panel === "main") {
      this.selection = Phaser.Math.Wrap(this.selection + delta, 0, this.menuItems.length);
      this.refreshMenuHighlight();
      return;
    }

    const count = this.panel === "new_game" ? 4 : this.panel === "settings" ? 5 : 1;
    this.selection = Phaser.Math.Wrap(this.selection + delta, 0, count);
    this.refreshPanel();
  }

  private adjustValue(delta: number): void {
    if (this.panel === "new_game") {
      if (this.selection === 0) {
        this.options.startLevel = Phaser.Math.Clamp(this.options.startLevel + delta, 1, 15);
      }
      if (this.selection === 1) {
        const values = Object.keys(MUSIC_THEMES) as MusicThemeKey[];
        const index = Phaser.Math.Wrap(values.indexOf(this.options.musicTheme) + delta, 0, values.length);
        this.options.musicTheme = values[index];
        window.__neonMatrixAudio?.startMusic(this.options.musicTheme);
      }
      if (this.selection === 2) {
        const values = Object.keys(PALETTES) as PaletteKey[];
        const index = Phaser.Math.Wrap(values.indexOf(this.options.palette) + delta, 0, values.length);
        this.options.palette = values[index];
      }
      this.refreshPanel();
    }

    if (this.panel === "settings") {
      const amounts = [0.05, 0.05, 0.05, 0.05];
      if (this.selection < 4) {
        const keys: Array<keyof SettingsState> = ["masterVolume", "musicVolume", "sfxVolume", "crtIntensity"];
        const key = keys[this.selection];
        this.settings[key] = Phaser.Math.Clamp((this.settings[key] as number) + delta * amounts[this.selection], 0, 1) as never;
      } else {
        this.settings.screenShake = delta !== 0 ? !this.settings.screenShake : this.settings.screenShake;
      }
      window.__neonMatrixAudio?.updateSettings(this.settings);
      saveSettings(this.settings);
      window.__neonMatrixSettings = { ...this.settings };
      this.refreshPanel();
    }
  }

  private confirm(): void {
    if (this.panel === "main") {
      this.selectMainItem();
      return;
    }

    if (this.panel === "new_game" && this.selection === 3) {
      window.__neonMatrixOptions = { ...this.options };
      window.__neonMatrixAudio?.startMusic(this.options.musicTheme);
      this.scene.start("game", { options: this.options, settings: this.settings });
      return;
    }

    if (this.panel === "settings" && this.selection === 4) {
      this.adjustValue(1);
      return;
    }

    if (this.panel === "about") {
      this.back();
    }
  }

  private back(): void {
    if (this.panel === "main") {
      return;
    }

    this.panel = "main";
    this.selection = 0;
    this.refreshPanel();
    this.refreshMenuHighlight();
  }

  private selectMainItem(): void {
    this.panel = this.selection === 0 ? "new_game" : this.selection === 1 ? "settings" : "about";
    this.selection = 0;
    this.refreshPanel();
  }

  private refreshMenuHighlight(): void {
    this.menuItems.forEach((text, index) => {
      const active = index === this.selection && this.panel === "main";
      text.setColor(active ? "#f8efc8" : "#c8c08f");
      text.setScale(active ? 1.08 : 1);
      text.setShadow(0, 0, active ? "#57e8ff" : "#000000", active ? 22 : 0, true, true);
      text.setText(`${active ? "> " : "  "}${text.text.replace(/^[> ]+/, "")}`);
    });
  }

  private clearPanelText(): void {
    this.panelText.forEach((item) => item.destroy());
    this.panelText = [];
  }

  private addPanelLine(x: number, y: number, text: string, color = "#f8efc8", size = 22): void {
    const item = this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: `${size}px`,
      color,
      wordWrap: { width: 380 },
    });
    this.panelText.push(item);
  }

  private refreshPanel(): void {
    this.clearPanelText();

    const panelBox = this.add.rectangle(360, 568, 520, 280, 0x120d1b, 0.8);
    panelBox.setStrokeStyle(2, 0xffbe55, 0.22);
    this.panelText.push(panelBox as unknown as Phaser.GameObjects.Text);

    if (this.panel === "main") {
      this.addPanelLine(120, 448, "WELCOME", "#7dffb1", 28);
      this.addPanelLine(120, 494, "Drop into a phosphor-drenched marathon with modern controls and arcade presentation.", "#f8efc8", 22);
      this.addPanelLine(120, 598, "Use UP/DOWN + ENTER to navigate.", "#ffbe55", 20);
      return;
    }

    if (this.panel === "new_game") {
      const musicLabel = MUSIC_THEMES[this.options.musicTheme].label;
      const paletteLabel = PALETTES[this.options.palette].label;
      this.addPanelLine(120, 448, "NEW GAME SETUP", "#7dffb1", 28);
      this.addPanelLine(120, 500, `${this.selection === 0 ? ">" : " "} Start Level: ${this.options.startLevel}`, this.selection === 0 ? "#ffbe55" : "#f8efc8");
      this.addPanelLine(120, 540, `${this.selection === 1 ? ">" : " "} Music Theme: ${musicLabel}`, this.selection === 1 ? "#ffbe55" : "#f8efc8");
      this.addPanelLine(120, 580, `${this.selection === 2 ? ">" : " "} Visual Palette: ${paletteLabel}`, this.selection === 2 ? "#ffbe55" : "#f8efc8");
      this.addPanelLine(120, 632, `${this.selection === 3 ? ">" : " "} START RUN`, this.selection === 3 ? "#57e8ff" : "#f8efc8", 24);
      this.addPanelLine(120, 682, "LEFT/RIGHT change values. ESC returns.", "#c8c08f", 18);
      return;
    }

    if (this.panel === "settings") {
      const rows = [
        `Master Volume: ${Math.round(this.settings.masterVolume * 100)}%`,
        `Music Volume: ${Math.round(this.settings.musicVolume * 100)}%`,
        `SFX Volume: ${Math.round(this.settings.sfxVolume * 100)}%`,
        `CRT Intensity: ${Math.round(this.settings.crtIntensity * 100)}%`,
        `Screen Shake: ${this.settings.screenShake ? "ON" : "OFF"}`,
      ];
      this.addPanelLine(120, 448, "SETTINGS", "#7dffb1", 28);
      rows.forEach((row, index) => {
        this.addPanelLine(120, 500 + index * 36, `${this.selection === index ? ">" : " "} ${row}`, this.selection === index ? "#ffbe55" : "#f8efc8", 21);
      });
      this.addPanelLine(120, 690, "Changes save instantly. ESC returns.", "#c8c08f", 18);
      return;
    }

    this.addPanelLine(120, 448, "ABOUT", "#7dffb1", 28);
    this.addPanelLine(120, 500, "Neon Matrix is a Phaser-built retro puzzle cabinet: modern guideline movement, old-school pressure, and original browser-synth music.", "#f8efc8", 21);
    this.addPanelLine(120, 606, "Start at the menu, tune the signal, then stack until the skyline burns.", "#ffbe55", 20);
    this.addPanelLine(120, 682, "Press ENTER or ESC to return.", "#c8c08f", 18);
  }
}
