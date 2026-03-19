import Phaser from "phaser";
import { audio } from "../audio";
import { SceneKeys } from "../sceneKeys";
import { loadProfile } from "../storage";
import { installRetroTextures } from "../textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    const profile = loadProfile();
    this.registry.set("profile", profile);
    audio.setSettings(profile.audio);
    installRetroTextures(this);
    this.scene.start(SceneKeys.MainMenu);
  }
}

