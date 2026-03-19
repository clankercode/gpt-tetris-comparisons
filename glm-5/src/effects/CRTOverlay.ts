import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, loadSettings } from '../config';

export class CRTOverlay {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000);
    
    this.createScanlines();
  }

  private createScanlines(): void {
    const settings = loadSettings();
    if (!settings.crtEffect) return;

    this.scene.time.addEvent({
      delay: 16,
      callback: this.update,
      callbackScope: this,
      loop: true,
    });
  }

  private update(): void {
    const settings = loadSettings();
    if (!settings.crtEffect) {
      this.graphics.clear();
      return;
    }

    this.graphics.clear();
    
    this.graphics.fillStyle(0x000000, 0.03);
    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      this.graphics.fillRect(0, y, GAME_WIDTH, 1);
    }
    
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    
    for (let i = 0; i < 50; i++) {
      const radius = maxDist * (1 - i / 50);
      const alpha = 0.005 * (1 - i / 50);
      this.graphics.lineStyle(2, 0x000000, alpha);
      this.graphics.strokeCircle(centerX, centerY, radius);
    }
    
    this.time += 0.016;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
