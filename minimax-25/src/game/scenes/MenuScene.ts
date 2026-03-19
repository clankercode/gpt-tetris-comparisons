import Phaser from 'phaser';
import { GameSettings, DEFAULT_SETTINGS } from '../types';

const menuY = 280;

export class MenuScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private backgroundPieces: Phaser.GameObjects.Rectangle[] = [];
  private menuContainer!: Phaser.GameObjects.Container;
  private canSelect = true;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.createAnimatedBackground();
    this.createTitle();
    this.createMenu();
    this.createControls();
    this.createScanlines();
    this.setupInput();
  }

  private createAnimatedBackground() {
    const colors = [0x00f5ff, 0x0066ff, 0xff9900, 0xffdd00, 0x00ff66, 0xcc00ff, 0xff3333];

    for (let i = 0; i < 30; i++) {
      const size = Phaser.Math.Between(20, 40);
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(-600, 0);
      const color = Phaser.Math.RND.pick(colors);
      const speed = Phaser.Math.Between(20, 60);

      const piece = this.add.rectangle(x, y, size, size, color, 0.3);
      piece.setDepth(-1);

      this.tweens.add({
        targets: piece,
        y: 700,
        duration: speed * 1000,
        repeat: -1,
        ease: 'Linear',
      });
    }
  }

  private createTitle() {
    const title = this.add.text(400, 120, 'RETRO TETRIS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '40px',
      color: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const subtitle = this.add.text(400, 170, 'CLASSIC ARCADE EDITION', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#00ff88',
    });
    subtitle.setOrigin(0.5);
  }

  private createMenu() {
    this.menuContainer = this.add.container(0, 0);

    const menuData = [
      { text: 'NEW GAME', action: () => this.startNewGame() },
      { text: 'SETTINGS', action: () => this.openSettings() },
      { text: 'ABOUT', action: () => this.openAbout() },
    ];

    this.menuItems = [];

    menuData.forEach((item, index) => {
      const menuText = this.add.text(400, menuY + index * 60, `> ${item.text}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '20px',
        color: index === 0 ? '#ff00ff' : '#00ff88',
      });
      menuText.setOrigin(0.5);
      menuText.setInteractive({ useHandCursor: true });
      menuText.on('pointerover', () => this.selectIndex(index));
      menuText.on('pointerdown', () => this.selectItem(index));
      this.menuItems.push(menuText);
      this.menuContainer.add(menuText);
    });
  }

  private createControls() {
    const controls = [
      '← → : MOVE',
      '↑ : ROTATE',
      '↓ : SOFT DROP',
      'SPACE : HARD DROP',
      'P : PAUSE',
    ];

    const controlsText = this.add.text(400, 510, controls.join('    '), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#666688',
    });
    controlsText.setOrigin(0.5);
  }

  private createScanlines() {
    for (let i = 0; i < 600; i += 4) {
      const line = this.add.rectangle(400, i, 800, 2, 0x000000, 0.1);
      line.setDepth(100);
    }
  }

  private setupInput() {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (!this.canSelect) return;

      switch (event.code) {
        case 'ArrowUp':
          event.preventDefault();
          this.navigate(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.navigate(1);
          break;
        case 'Enter':
        case 'Space':
          event.preventDefault();
          this.selectCurrent();
          break;
      }
    });
  }

  private navigate(direction: number) {
    this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
    this.updateSelection();
  }

  private selectIndex(index: number) {
    this.selectedIndex = index;
    this.updateSelection();
  }

  private updateSelection() {
    this.menuItems.forEach((item, index) => {
      item.setColor(index === this.selectedIndex ? '#ff00ff' : '#00ff88');
      const prefix = index === this.selectedIndex ? '>' : ' ';
      item.setText(`${prefix} ${['NEW GAME', 'SETTINGS', 'ABOUT'][index]}`);
    });
  }

  private selectCurrent() {
    if (!this.canSelect) return;
    this.canSelect = false;

    this.selectItem(this.selectedIndex);

    this.time.delayedCall(200, () => {
      this.canSelect = true;
    });
  }

  private selectItem(index: number) {
    this.menuItems[index].setScale(1.2);
    this.tweens.add({
      targets: this.menuItems[index],
      scale: 1,
      duration: 100,
    });

    switch (index) {
      case 0:
        this.startNewGame();
        break;
      case 1:
        this.openSettings();
        break;
      case 2:
        this.openAbout();
        break;
    }
  }

  private startNewGame() {
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene', { settings: this.settings });
    });
  }

  private openSettings() {
    this.scene.pause();
    this.scene.launch('SettingsScene', { settings: this.settings, returnTo: 'MenuScene' });
  }

  private openAbout() {
    this.scene.pause();
    this.scene.launch('AboutScene');
  }
}
