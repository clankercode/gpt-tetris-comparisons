import Phaser from 'phaser';

export class AboutScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Text;
  private instructions!: Phaser.GameObjects.Text;
  private menuText!: Phaser.GameObjects.Text;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private canSelect = true;

  constructor() {
    super({ key: 'AboutScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    const titleY = 140;

    this.title = this.add.text(400, titleY, 'RETRO TETRIS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.title.setOrigin(0.5);

    this.content = this.add.text(400, 240, [
      'Retro Tetris v1.0',
      '',
      'A classic Tetris clone with',
      'authentic retro arcade aesthetics.',
      '',
      'Built with Phaser 3',
      'using TypeScript and Vite.',
    ].join('\n'), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#00ff88',
      align: 'center',
      lineSpacing: 8,
    });
    this.content.setOrigin(0.5);

    const credits = [
      'MUSIC:',
      'Korobeiniki (Tetris Theme A)',
      'Russian Folk Song - Public Domain',
      '',
      'SOUND EFFECTS:',
      'Generated with Web Audio API',
    ];

    const creditsText = this.add.text(400, 400, credits.join('\n'), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#666688',
      align: 'center',
      lineSpacing: 6,
    });
    creditsText.setOrigin(0.5);

    this.menuItems = [];
    const backOption = this.add.text(400, 520, '> BACK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ff00ff',
    });
    backOption.setOrigin(0.5);
    this.menuItems.push(backOption);

    this.updateSelection();

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Escape' || event.code === 'KeyB') {
        this.scene.start('MenuScene');
      } else if (event.code === 'Enter' || event.code === 'Space') {
        this.selectCurrent();
      }
    });

    this.input.on('pointerdown', () => {
      this.selectCurrent();
    });
  }

  private updateSelection() {
    this.menuItems.forEach((item, index) => {
      item.setColor(index === this.selectedIndex ? '#ff00ff' : '#00ff88');
      item.setText(index === this.selectedIndex ? '> BACK' : '  BACK');
    });
  }

  private selectCurrent() {
    if (!this.canSelect) return;
    this.canSelect = false;

    if (this.selectedIndex === 0) {
      this.scene.start('MenuScene');
    }

    this.time.delayedCall(200, () => {
      this.canSelect = true;
    });
  }
}
