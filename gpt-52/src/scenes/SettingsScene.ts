import Phaser from "phaser";
import type { Settings } from "../state/Settings";
import type { Chiptune } from "../audio/Chiptune";

export class SettingsScene extends Phaser.Scene {
  static KEY = "settings";
  private chip!: Chiptune;
  private rows: Array<{ label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text; onToggle: (dir: -1 | 1) => void }> = [];
  private selected = 0;

  constructor(private settings: Settings) {
    super(SettingsScene.KEY);
  }

  create() {
    this.chip = this.registry.get("chip") as Chiptune;

    this.add
      .text(480, 72, "SETTINGS", { fontSize: "44px", color: "#79ffd7", stroke: "#140a2b", strokeThickness: 10 })
      .setOrigin(0.5)
      .setShadow(0, 6, "#000", 10, true, true);

    const panel = this.add.graphics();
    panel.fillStyle(0x0b0715, 0.65);
    panel.fillRoundedRect(160, 120, 640, 320, 14);
    panel.lineStyle(2, 0x79ffd7, 0.35);
    panel.strokeRoundedRect(160, 120, 640, 320, 14);

    const makeRow = (i: number, name: string, get: () => string, onToggle: (dir: -1 | 1) => void) => {
      const y = 160 + i * 44;
      const label = this.add.text(220, y, name, { fontSize: "18px", color: "#d4f7ff" }).setOrigin(0, 0.5);
      const value = this.add.text(740, y, get(), { fontSize: "18px", color: "#ffbf4d" }).setOrigin(1, 0.5);
      this.rows.push({ label, value, onToggle });
    };

    makeRow(0, "CRT OVERLAY", () => (this.settings.data.crt ? "ON" : "OFF"), () => {
      this.settings.data.crt = !this.settings.data.crt;
    });
    makeRow(1, "GHOST PIECE", () => (this.settings.data.ghost ? "ON" : "OFF"), () => {
      this.settings.data.ghost = !this.settings.data.ghost;
    });
    makeRow(2, "HOLD", () => (this.settings.data.hold ? "ON" : "OFF"), () => {
      this.settings.data.hold = !this.settings.data.hold;
    });
    makeRow(3, "MUSIC", () => (this.settings.data.musicOn ? "ON" : "OFF"), () => {
      this.settings.data.musicOn = !this.settings.data.musicOn;
    });
    makeRow(4, "MUSIC VOL", () => pct(this.settings.data.musicVolume), (dir) => {
      this.settings.data.musicVolume = clamp01(this.settings.data.musicVolume + dir * 0.05);
    });
    makeRow(5, "SFX VOL", () => pct(this.settings.data.sfxVolume), (dir) => {
      this.settings.data.sfxVolume = clamp01(this.settings.data.sfxVolume + dir * 0.05);
    });

    this.add.text(480, 470, "ARROWS change selection, LEFT/RIGHT toggles, ENTER to return", { fontSize: "14px", color: "#ff4fd8" }).setOrigin(0.5);

    this.refresh();
    this.bindInput();
  }

  private bindInput() {
    this.input.keyboard?.on("keydown-UP", () => this.moveSel(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveSel(1));
    this.input.keyboard?.on("keydown-LEFT", () => this.bump(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.bump(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.back());
    this.input.keyboard?.on("keydown-ESC", () => this.back());
  }

  private moveSel(dir: number) {
    this.chip.playSfx("ui");
    this.selected = (this.selected + dir + this.rows.length) % this.rows.length;
    this.refresh();
  }

  private bump(dir: -1 | 1) {
    this.chip.playSfx("ui");
    this.rows[this.selected]?.onToggle(dir);
    this.applyAudio();
    this.settings.save();
    this.refresh();
  }

  private applyAudio() {
    const d = this.settings.data;
    this.chip.setMusicOn(d.musicOn);
    this.chip.setMusicVolume(d.musicVolume);
    this.chip.setSfxVolume(d.sfxVolume);
  }

  private refresh() {
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i]!;
      const is = i === this.selected;
      r.label.setColor(is ? "#79ffd7" : "#d4f7ff");
      r.value.setColor(is ? "#79ffd7" : "#ffbf4d");
      r.label.setScale(is ? 1.08 : 1.0);
      r.value.setScale(is ? 1.08 : 1.0);
      r.value.setText(this.valueFor(i));
    }
  }

  private valueFor(i: number): string {
    const d = this.settings.data;
    switch (i) {
      case 0:
        return d.crt ? "ON" : "OFF";
      case 1:
        return d.ghost ? "ON" : "OFF";
      case 2:
        return d.hold ? "ON" : "OFF";
      case 3:
        return d.musicOn ? "ON" : "OFF";
      case 4:
        return pct(d.musicVolume);
      case 5:
        return pct(d.sfxVolume);
      default:
        return "";
    }
  }

  private back() {
    this.chip.playSfx("ui");
    this.settings.save();
    this.scene.start("menu");
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function pct(n: number): string {
  return `${Math.round(clamp01(n) * 100)}%`;
}

