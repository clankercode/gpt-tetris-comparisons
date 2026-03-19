import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // Show a simple loading bar while we set things up
    const W = this.scale.width;
    const H = this.scale.height;

    const barBg = this.add.rectangle(W / 2, H / 2, 300, 8, 0x333333);
    const bar   = this.add.rectangle(W / 2 - 150, H / 2, 0, 8, 0x00f0f0);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 300 * v;
    });

    const text = this.add.text(W / 2, H / 2 - 30, 'LOADING...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#00f0f0',
    }).setOrigin(0.5);

    // No external assets needed — everything is procedural.
    // We just use this scene to ensure the font is loaded.
    this.load.on('complete', () => {
      text.destroy();
      barBg.destroy();
      bar.destroy();
    });
  }

  create(): void {
    this.scene.start('Menu');
  }
}
