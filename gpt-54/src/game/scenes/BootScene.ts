import Phaser from "phaser";
import { DEFAULT_OPTIONS, DEFAULT_SETTINGS } from "../config";
import { loadSettings, RetroAudio } from "../audio";
import type { GameOptions, SettingsState } from "../types";

declare global {
  interface Window {
    __neonMatrixAudio?: RetroAudio;
    __neonMatrixSettings?: SettingsState;
    __neonMatrixOptions?: GameOptions;
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    const settings = { ...DEFAULT_SETTINGS, ...loadSettings() };
    const options = { ...DEFAULT_OPTIONS };
    const audio = new RetroAudio(settings);

    window.__neonMatrixAudio = audio;
    window.__neonMatrixSettings = settings;
    window.__neonMatrixOptions = options;

    this.scene.start("menu");
  }
}
