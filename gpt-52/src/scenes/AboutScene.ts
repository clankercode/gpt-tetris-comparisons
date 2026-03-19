import Phaser from "phaser";
import type { Settings } from "../state/Settings";
import type { Chiptune } from "../audio/Chiptune";

export class AboutScene extends Phaser.Scene {
  static KEY = "about";
  private chip!: Chiptune;

  constructor(private settings: Settings) {
    super(AboutScene.KEY);
  }

  create() {
    this.chip = this.registry.get("chip") as Chiptune;

    this.add
      .text(480, 74, "ABOUT", { fontSize: "44px", color: "#79ffd7", stroke: "#140a2b", strokeThickness: 10 })
      .setOrigin(0.5)
      .setShadow(0, 6, "#000", 10, true, true);

    const box = this.add.graphics();
    box.fillStyle(0x0b0715, 0.7);
    box.fillRoundedRect(140, 130, 680, 320, 14);
    box.lineStyle(2, 0xff4fd8, 0.35);
    box.strokeRoundedRect(140, 130, 680, 320, 14);

    const txt = [
      "A tiny Tetris clone built with Bun + Vite + TypeScript + Phaser.",
      "",
      "Ruleset: SRS rotation, 7-bag randomizer, hard drop, ghost piece, hold (toggleable).",
      "Modes: Marathon and Sprint 40.",
      "",
      "Audio: procedural chiptune + SFX (no external files).",
      "",
      "Tip: audio starts after your first input due to browser autoplay rules."
    ].join("\n");

    this.add.text(180, 170, txt, { fontSize: "16px", color: "#d4f7ff", lineSpacing: 6 }).setOrigin(0, 0);
    this.add.text(480, 480, "PRESS ENTER / ESC to return", { fontSize: "14px", color: "#ffbf4d" }).setOrigin(0.5);

    this.input.keyboard?.on("keydown-ENTER", () => this.back());
    this.input.keyboard?.on("keydown-ESC", () => this.back());
  }

  private back() {
    this.chip.playSfx("ui");
    this.scene.start("menu");
  }
}

