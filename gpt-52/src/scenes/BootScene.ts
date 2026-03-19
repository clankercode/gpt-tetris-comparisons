import Phaser from "phaser";
import type { Settings } from "../state/Settings";
import { Chiptune } from "../audio/Chiptune";

export class BootScene extends Phaser.Scene {
  static KEY = "boot";
  private chip: Chiptune;

  constructor(private settings: Settings) {
    super(BootScene.KEY);
    this.chip = new Chiptune();
  }

  preload() {
    // no external assets
  }

  create() {
    this.makeBlockTexture("block", 24, 24);
    this.makePixelTexture("px", 2, 2);
    this.makeScanlines("scan", 256, 256);

    // Global audio handle on registry so scenes can find it.
    this.registry.set("chip", this.chip);
    this.applySettingsToAudio();
    this.chip.attachUnlockOnFirstInput();
    this.chip.start();

    this.scene.start("menu");
  }

  private applySettingsToAudio() {
    const d = this.settings.data;
    this.chip.setMusicOn(d.musicOn);
    this.chip.setMusicVolume(d.musicVolume);
    this.chip.setSfxVolume(d.sfxVolume);
  }

  private makePixelTexture(key: string, w: number, h: number) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeBlockTexture(key: string, w: number, h: number) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.clear();
    // Outer border
    g.fillStyle(0x0b0715, 1);
    g.fillRect(0, 0, w, h);
    // Inner base
    g.fillStyle(0xffffff, 1);
    g.fillRect(2, 2, w - 4, h - 4);
    // Highlight
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(2, 2, w - 4, 6);
    g.fillRect(2, 2, 6, h - 4);
    // Shadow
    g.fillStyle(0x000000, 0.18);
    g.fillRect(w - 8, 2, 6, h - 4);
    g.fillRect(2, h - 8, w - 4, 6);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeScanlines(key: string, w: number, h: number) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 0.12);
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    g.fillStyle(0xffffff, 0.03);
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}

