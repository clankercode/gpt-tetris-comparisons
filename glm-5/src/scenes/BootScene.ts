import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createPixelFont();
    this.createBlockTextures();
    this.createParticleTexture();
  }

  createPixelFont() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:;,-+=!?\'"<>[]{}()@#$%&*/\\^_|~` ';
    const charWidth = 8;
    const charHeight = 10;
    const charsPerRow = 20;
    
    const canvas = document.createElement('canvas');
    canvas.width = charsPerRow * charWidth;
    canvas.height = Math.ceil(chars.length / charsPerRow) * charHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < chars.length; i++) {
      const x = (i % charsPerRow) * charWidth + charWidth / 2;
      const y = Math.floor(i / charsPerRow) * charHeight + charHeight / 2;
      ctx.fillText(chars[i], x, y);
    }

    this.textures.addCanvas('pixelFont', canvas);
  }

  createBlockTextures() {
    const colors: Record<string, number> = {
      I: 0x00f0f0,
      O: 0xf0f000,
      T: 0xa000f0,
      S: 0x00f000,
      Z: 0xf00000,
      J: 0x0000f0,
      L: 0xf0a000,
      ghost: 0x333333,
    };

    const size = 28;

    for (const [name, color] of Object.entries(colors)) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;

      ctx.fillStyle = `rgb(${r * 0.3 | 0},${g * 0.3 | 0},${b * 0.3 | 0})`;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = `rgb(${r * 0.6 | 0},${g * 0.6 | 0},${b * 0.6 | 0})`;
      ctx.fillRect(2, 2, size - 4, size - 4);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(4, 4, size - 8, size - 8);

      ctx.fillStyle = `rgb(${Math.min(255, r * 1.3 | 0)},${Math.min(255, g * 1.3 | 0)},${Math.min(255, b * 1.3 | 0)})`;
      ctx.fillRect(6, 6, size - 14, 4);
      ctx.fillRect(6, 6, 4, size - 14);

      ctx.fillStyle = `rgb(${r * 0.5 | 0},${g * 0.5 | 0},${b * 0.5 | 0})`;
      ctx.fillRect(size - 8, size - 8, 4, 4);
      ctx.fillRect(size - 12, size - 8, 4, 4);
      ctx.fillRect(size - 8, size - 12, 4, 4);

      this.textures.addCanvas(`block_${name}`, canvas);
    }
  }

  createParticleTexture() {
    const size = 4;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    this.textures.addCanvas('particle', canvas);
  }

  create() {
    this.scene.start('MenuScene');
  }
}
