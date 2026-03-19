import Phaser from 'phaser';

export class AboutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'About' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(0, 0, W, H, 0x050510).setOrigin(0);

    // Scanlines
    const scan = this.add.graphics().setDepth(99);
    for (let y = 0; y < H; y += 3) {
      scan.fillStyle(0x000000, 0.15);
      scan.fillRect(0, y, W, 1);
    }

    // Falling tetromino decoration
    this.createDecoration(W, H);

    // Title
    this.add.text(W / 2, 50, 'ABOUT', {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#00f0f0',
      stroke: '#003333',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x00f0f0, 0.4);
    lineG.strokeLineShape(new Phaser.Geom.Line(W / 2 - 150, 85, W / 2 + 150, 85));

    const lines = [
      { text: 'RETRO TETRIS', color: '#00f0f0', size: '14px', y: 130 },
      { text: 'A retro-aesthetic Tetris clone', color: '#668866', size: '9px', y: 165 },
      { text: 'built with Phaser 3 + TypeScript.', color: '#668866', size: '9px', y: 183 },
      { text: '', color: '#ffffff', size: '9px', y: 210 },
      { text: 'ORIGINAL GAME', color: '#888800', size: '10px', y: 230 },
      { text: 'Tetris \u00a9 1984 Alexey Pajitnov', color: '#555555', size: '8px', y: 252 },
      { text: '', color: '#ffffff', size: '9px', y: 275 },
      { text: 'MUSIC', color: '#888800', size: '10px', y: 290 },
      { text: 'Korobeiniki (folk melody)', color: '#555555', size: '8px', y: 312 },
      { text: 'Procedural chiptune synthesis', color: '#555555', size: '8px', y: 328 },
      { text: 'via Web Audio API', color: '#555555', size: '8px', y: 344 },
      { text: '', color: '#ffffff', size: '9px', y: 370 },
      { text: 'TECH STACK', color: '#888800', size: '10px', y: 385 },
      { text: 'Bun  TypeScript  Vite  Phaser 3', color: '#555555', size: '8px', y: 407 },
    ];

    lines.forEach(({ text, color, size, y }) => {
      if (text) {
        this.add.text(W / 2, y, text, {
          fontFamily: '"Press Start 2P"',
          fontSize: size,
          color,
        }).setOrigin(0.5);
      }
    });

    // Back hint
    this.add.text(W / 2, H - 40, 'ESC / ENTER  Back to Menu', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#446644',
    }).setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.goBack());
    kb.on('keydown-ENTER', () => this.goBack());
    kb.on('keydown-BACKSPACE', () => this.goBack());
    kb.on('keydown-SPACE', () => this.goBack());

    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 300 });
  }

  private createDecoration(W: number, H: number): void {
    const g = this.add.graphics().setDepth(1).setAlpha(0.07);
    const colors = [0x00f0f0, 0xf0f000, 0xa000f0, 0x00f000, 0xf00000, 0x0000f0, 0xf0a000];
    const cell = 22;

    // Draw some random scattered tetromino cells as decoration
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() * W / cell | 0) * cell;
      const y = (Math.random() * H / cell | 0) * cell;
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.fillStyle(color, 1);
      g.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Menu');
    });
  }
}
