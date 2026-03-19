import Phaser from "phaser";
import type { Settings, GameOptions } from "../types";
import { DEFAULT_SETTINGS, MUSIC_THEMES, GAME_WIDTH, GAME_HEIGHT, TEXT_COLOR, TEXT_COLOR_DIM, TEXT_COLOR_BRIGHT, TITLE_COLOR, ACCENT_COLOR } from "../config";
import { RetroAudio } from "../audio";

type Panel = "main" | "newgame" | "settings" | "about";

interface MenuItem {
  label: string;
  action?: () => void;
  // For value items (settings/options)
  getValue?: () => string;
  onLeft?: () => void;
  onRight?: () => void;
}

export class MenuScene extends Phaser.Scene {
  private panel: Panel = "main";
  private selectedIndex = 0;
  private menuItems: MenuItem[] = [];
  private audioResumed = false;

  // New game options
  private startLevel = 0;
  private musicTheme = 0;

  // Graphics
  private gfx!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];

  // Scanline effect
  private scanlineGfx!: Phaser.GameObjects.Graphics;

  // Animation
  private animTimer = 0;

  constructor() {
    super({ key: "menu" });
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.scanlineGfx = this.add.graphics();
    this.texts = [];
    this.panel = "main";
    this.selectedIndex = 0;
    this.animTimer = 0;

    this.drawScanlines();
    this.buildPanel();

    // Resume audio context on first interaction
    const resumeAudio = () => {
      if (!this.audioResumed) {
        this.audioResumed = true;
        window.__retroTetrisAudio?.resume();
      }
    };

    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      resumeAudio();
      this.handleKey(event.key);
    });

    this.input.on("pointerdown", resumeAudio);
  }

  update(_time: number, delta: number): void {
    this.animTimer += delta;
    this.redraw();
  }

  private get audio(): RetroAudio | undefined {
    return window.__retroTetrisAudio;
  }

  private get settings(): Settings {
    return window.__retroTetrisSettings || DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem("retroTetrisSettings", JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  // ── Panel builders ──────────────────────────────────────────

  private buildPanel(): void {
    this.selectedIndex = 0;
    switch (this.panel) {
      case "main":
        this.menuItems = [
          { label: "NEW GAME", action: () => this.switchPanel("newgame") },
          { label: "SETTINGS", action: () => this.switchPanel("settings") },
          { label: "ABOUT", action: () => this.switchPanel("about") },
        ];
        break;

      case "newgame":
        this.menuItems = [
          {
            label: "LEVEL",
            getValue: () => String(this.startLevel),
            onLeft: () => { this.startLevel = Math.max(0, this.startLevel - 1); },
            onRight: () => { this.startLevel = Math.min(15, this.startLevel + 1); },
          },
          {
            label: "MUSIC",
            getValue: () => MUSIC_THEMES[this.musicTheme].name,
            onLeft: () => { this.musicTheme = (this.musicTheme + MUSIC_THEMES.length - 1) % MUSIC_THEMES.length; },
            onRight: () => { this.musicTheme = (this.musicTheme + 1) % MUSIC_THEMES.length; },
          },
          {
            label: "START",
            action: () => this.startGame(),
          },
        ];
        break;

      case "settings": {
        const s = this.settings;
        this.menuItems = [
          {
            label: "MASTER VOL",
            getValue: () => `${Math.round(s.masterVolume * 100)}%`,
            onLeft: () => { s.masterVolume = Math.max(0, +(s.masterVolume - 0.1).toFixed(1)); this.applySettings(); },
            onRight: () => { s.masterVolume = Math.min(1, +(s.masterVolume + 0.1).toFixed(1)); this.applySettings(); },
          },
          {
            label: "MUSIC VOL",
            getValue: () => `${Math.round(s.musicVolume * 100)}%`,
            onLeft: () => { s.musicVolume = Math.max(0, +(s.musicVolume - 0.1).toFixed(1)); this.applySettings(); },
            onRight: () => { s.musicVolume = Math.min(1, +(s.musicVolume + 0.1).toFixed(1)); this.applySettings(); },
          },
          {
            label: "SFX VOL",
            getValue: () => `${Math.round(s.sfxVolume * 100)}%`,
            onLeft: () => { s.sfxVolume = Math.max(0, +(s.sfxVolume - 0.1).toFixed(1)); this.applySettings(); },
            onRight: () => { s.sfxVolume = Math.min(1, +(s.sfxVolume + 0.1).toFixed(1)); this.applySettings(); },
          },
          {
            label: "CRT EFFECT",
            getValue: () => s.crtEffect ? "ON" : "OFF",
            onLeft: () => { s.crtEffect = !s.crtEffect; this.applySettings(); },
            onRight: () => { s.crtEffect = !s.crtEffect; this.applySettings(); },
          },
          {
            label: "SCREEN SHAKE",
            getValue: () => s.screenShake ? "ON" : "OFF",
            onLeft: () => { s.screenShake = !s.screenShake; this.applySettings(); },
            onRight: () => { s.screenShake = !s.screenShake; this.applySettings(); },
          },
        ];
        break;
      }

      case "about":
        this.menuItems = [];
        break;
    }
  }

  private switchPanel(panel: Panel): void {
    this.panel = panel;
    this.buildPanel();
    this.audio?.playMenuSelect();
  }

  private applySettings(): void {
    this.audio?.updateSettings(this.settings);
    this.saveSettings();
  }

  private startGame(): void {
    const options: GameOptions = {
      startLevel: this.startLevel,
      musicTheme: this.musicTheme,
    };
    this.audio?.playMenuSelect();
    this.scene.start("game", { options, settings: this.settings });
  }

  // ── Input ─────────────────────────────────────────────────────

  private handleKey(key: string): void {
    switch (key) {
      case "ArrowUp":
        if (this.menuItems.length > 0) {
          this.selectedIndex = (this.selectedIndex + this.menuItems.length - 1) % this.menuItems.length;
          this.audio?.playMenuMove();
        }
        break;

      case "ArrowDown":
        if (this.menuItems.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
          this.audio?.playMenuMove();
        }
        break;

      case "ArrowLeft": {
        const item = this.menuItems[this.selectedIndex];
        if (item?.onLeft) {
          item.onLeft();
          this.audio?.playMenuMove();
        }
        break;
      }

      case "ArrowRight": {
        const item = this.menuItems[this.selectedIndex];
        if (item?.onRight) {
          item.onRight();
          this.audio?.playMenuMove();
        }
        break;
      }

      case "Enter": {
        const item = this.menuItems[this.selectedIndex];
        if (item?.action) {
          item.action();
        }
        break;
      }

      case "Escape":
        if (this.panel !== "main") {
          this.switchPanel("main");
          this.audio?.playMenuBack();
        }
        break;
    }
  }

  // ── Drawing ───────────────────────────────────────────────────

  private clearTexts(): void {
    for (const t of this.texts) t.destroy();
    this.texts = [];
  }

  private addText(x: number, y: number, text: string, color: string, size = 16, align: string = "left"): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      align: align as "left" | "center" | "right",
    });
    if (align === "center") t.setOrigin(0.5, 0);
    this.texts.push(t);
    return t;
  }

  private drawScanlines(): void {
    if (!this.settings.crtEffect) {
      this.scanlineGfx.clear();
      return;
    }
    this.scanlineGfx.clear();
    this.scanlineGfx.fillStyle(0x000000, 0.15);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      this.scanlineGfx.fillRect(0, y, GAME_WIDTH, 1);
    }
    this.scanlineGfx.setDepth(1000);
  }

  private redraw(): void {
    this.gfx.clear();
    this.clearTexts();

    // Background
    this.gfx.fillStyle(0x0a0a12, 1);
    this.gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Animated background grid
    const gridAlpha = 0.03 + 0.01 * Math.sin(this.animTimer / 1000);
    this.gfx.lineStyle(1, 0x00ff88, gridAlpha);
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      this.gfx.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 32) {
      this.gfx.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Title with glow effect
    const titleY = 60;
    const glowPulse = 0.4 + 0.2 * Math.sin(this.animTimer / 500);
    this.gfx.fillStyle(0x00ffcc, glowPulse * 0.1);
    this.gfx.fillRect(GAME_WIDTH / 2 - 140, titleY - 5, 280, 50);

    this.addText(GAME_WIDTH / 2, titleY, "RETRO TETRIS", TITLE_COLOR, 36, "center");

    // Subtitle
    this.addText(GAME_WIDTH / 2, titleY + 42, "- BLOCK DROP -", TEXT_COLOR_DIM, 12, "center");

    // Decorative line
    const lineY = titleY + 65;
    this.gfx.lineStyle(1, 0x00ff88, 0.4);
    this.gfx.lineBetween(60, lineY, GAME_WIDTH - 60, lineY);

    // Panel content
    const contentY = lineY + 30;

    switch (this.panel) {
      case "main":
        this.drawMainPanel(contentY);
        break;
      case "newgame":
        this.drawNewGamePanel(contentY);
        break;
      case "settings":
        this.drawSettingsPanel(contentY);
        break;
      case "about":
        this.drawAboutPanel(contentY);
        break;
    }

    // Controls help at bottom
    this.drawControls();

    // Scanlines
    this.drawScanlines();
  }

  private drawMainPanel(startY: number): void {
    for (let i = 0; i < this.menuItems.length; i++) {
      const y = startY + i * 50;
      const selected = i === this.selectedIndex;
      const color = selected ? TEXT_COLOR_BRIGHT : TEXT_COLOR;

      if (selected) {
        // Selection highlight
        const pulse = 0.08 + 0.04 * Math.sin(this.animTimer / 300);
        this.gfx.fillStyle(0x00ff88, pulse);
        this.gfx.fillRect(GAME_WIDTH / 2 - 100, y - 4, 200, 28);

        // Arrow indicator
        const arrowBlink = Math.sin(this.animTimer / 200) > 0;
        if (arrowBlink) {
          this.addText(GAME_WIDTH / 2 - 110, y, ">", ACCENT_COLOR, 20, "center");
        }
      }

      this.addText(GAME_WIDTH / 2, y, this.menuItems[i].label, color, 20, "center");
    }
  }

  private drawNewGamePanel(startY: number): void {
    this.addText(GAME_WIDTH / 2, startY - 30, "- NEW GAME -", TEXT_COLOR_DIM, 14, "center");

    for (let i = 0; i < this.menuItems.length; i++) {
      const y = startY + i * 45;
      const item = this.menuItems[i];
      const selected = i === this.selectedIndex;
      const color = selected ? TEXT_COLOR_BRIGHT : TEXT_COLOR;

      if (selected) {
        const pulse = 0.08 + 0.04 * Math.sin(this.animTimer / 300);
        this.gfx.fillStyle(0x00ff88, pulse);
        this.gfx.fillRect(80, y - 4, GAME_WIDTH - 160, 28);
      }

      if (item.getValue) {
        this.addText(120, y, item.label, color, 16);
        const val = item.getValue();
        this.addText(GAME_WIDTH - 120, y, `< ${val} >`, selected ? ACCENT_COLOR : TEXT_COLOR_DIM, 16);
      } else {
        this.addText(GAME_WIDTH / 2, y, item.label, color, 20, "center");
      }
    }
  }

  private drawSettingsPanel(startY: number): void {
    this.addText(GAME_WIDTH / 2, startY - 30, "- SETTINGS -", TEXT_COLOR_DIM, 14, "center");

    for (let i = 0; i < this.menuItems.length; i++) {
      const y = startY + i * 38;
      const item = this.menuItems[i];
      const selected = i === this.selectedIndex;
      const color = selected ? TEXT_COLOR_BRIGHT : TEXT_COLOR;

      if (selected) {
        const pulse = 0.08 + 0.04 * Math.sin(this.animTimer / 300);
        this.gfx.fillStyle(0x00ff88, pulse);
        this.gfx.fillRect(60, y - 4, GAME_WIDTH - 120, 26);
      }

      this.addText(100, y, item.label, color, 14);
      if (item.getValue) {
        this.addText(GAME_WIDTH - 100, y, `< ${item.getValue()} >`, selected ? ACCENT_COLOR : TEXT_COLOR_DIM, 14);
      }
    }
  }

  private drawAboutPanel(startY: number): void {
    this.addText(GAME_WIDTH / 2, startY - 30, "- ABOUT -", TEXT_COLOR_DIM, 14, "center");

    const lines = [
      "RETRO TETRIS v1.0",
      "",
      "A classic block-stacking game",
      "with a retro neon aesthetic.",
      "",
      "Built with Phaser 3,",
      "TypeScript, and procedural audio.",
      "",
      "All sounds synthesized in",
      "real-time using Web Audio API.",
    ];

    for (let i = 0; i < lines.length; i++) {
      this.addText(GAME_WIDTH / 2, startY + i * 22, lines[i], TEXT_COLOR, 13, "center");
    }
  }

  private drawControls(): void {
    const y = GAME_HEIGHT - 100;

    this.gfx.lineStyle(1, 0x00ff88, 0.2);
    this.gfx.lineBetween(40, y, GAME_WIDTH - 40, y);

    this.addText(GAME_WIDTH / 2, y + 10, "CONTROLS", TEXT_COLOR_DIM, 11, "center");

    const controlLines = [
      "\u2190\u2192 Move   \u2191 Rotate   \u2193 Soft Drop",
      "SPACE Hard Drop   SHIFT Hold   P Pause",
      "ENTER Select   ESC Back",
    ];

    for (let i = 0; i < controlLines.length; i++) {
      this.addText(GAME_WIDTH / 2, y + 28 + i * 18, controlLines[i], TEXT_COLOR_DIM, 11, "center");
    }
  }
}
