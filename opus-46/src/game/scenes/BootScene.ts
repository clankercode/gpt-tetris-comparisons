import Phaser from "phaser";
import { RetroAudio } from "../audio";
import { DEFAULT_SETTINGS } from "../config";
import type { Settings } from "../types";

// Store shared instances on window for cross-scene access
declare global {
  interface Window {
    __retroTetrisAudio?: RetroAudio;
    __retroTetrisSettings?: Settings;
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "boot" });
  }

  create(): void {
    // Load settings from localStorage
    let settings: Settings = { ...DEFAULT_SETTINGS };
    try {
      const saved = localStorage.getItem("retroTetrisSettings");
      if (saved) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore parse errors
    }

    window.__retroTetrisSettings = settings;

    // Create audio engine
    const audio = new RetroAudio(settings);
    window.__retroTetrisAudio = audio;

    // Transition to menu
    this.scene.start("menu");
  }
}
