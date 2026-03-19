import Phaser from 'phaser';

type MenuKey = 'new' | 'settings' | 'about';

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: 'new', label: 'NEW GAME' },
  { key: 'settings', label: 'SETTINGS' },
  { key: 'about', label: 'ABOUT' }
];

export default class MenuScene extends Phaser.Scene {
  private titleText?: Phaser.GameObjects.Text;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private selectedBorder?: Phaser.GameObjects.Rectangle;
  private readonly lineSpacing = 48;
  private controlsText?: Phaser.GameObjects.Text;

  public preload(): void {
    this.load.setBaseURL('/');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x041127);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.titleText = this.add.text(cx, 110, 'NEON BLOCK CASCADE', {
      fontSize: '52px',
      color: '#67fbff',
      fontFamily: 'VT323, "Courier New", monospace',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.titleText.setShadow(0, 0, '#3df6ff', 8, false, true);

    const subtitle = this.add.text(cx, 162, 'A RETRO PHASER TETRIS EXPERIENCE', {
      fontSize: '20px',
      color: '#b8d8ff',
      fontFamily: 'VT323, "Courier New", monospace',
      align: 'center'
    }).setOrigin(0.5);

    const menuY = cy - 40;
    this.itemTexts = MENU_ITEMS.map((entry, index) => {
      const text = this.add.text(cx, menuY + index * this.lineSpacing, entry.label, {
        fontSize: '32px',
        color: '#f0fcff',
        fontFamily: 'VT323, "Courier New", monospace'
      }).setOrigin(0.5);
      return text;
    });

    this.selectedBorder = this.add.rectangle(cx - 120, menuY + this.selectedIndex * this.lineSpacing, 330, 46, 0x2df6ff, 0.16);
    this.updateSelection();

    this.controlsText = this.add.text(cx, this.scale.height - 110, [
      'CONTROLS',
      'Menu: ▲ ▼ to select · Enter to open',
      'Game: ← → move, ↓ soft drop, ␠ hard drop',
      'Z/X rotate, P pause, Esc return to menu, R restart'
    ].join('\n'), {
      fontSize: '18px',
      color: '#94d7ff',
      fontFamily: 'VT323, "Courier New", monospace',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e2c5a, 0.25);
    bg.fillRoundedRect(cx - 280, this.scale.height - 165, 560, 80, 10);
    bg.lineStyle(2, 0x4de6ff, 0.45);
    bg.strokeRoundedRect(cx - 280, this.scale.height - 165, 560, 80, 10);
    bg.depth = -1;
    bg.setDepth(-1);
    this.children.bringToTop(this.controlsText);

    const help = this.add.text(24, 24, 'Press Enter at any time to start instantly.', {
      fontSize: '16px',
      color: '#79beff',
      fontFamily: 'VT323, "Courier New", monospace'
    });

    this.cameras.main.flash(350, 95, 255, 255);

    const upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    upKey.on('down', () => {
      this.selectedIndex = (this.selectedIndex + MENU_ITEMS.length - 1) % MENU_ITEMS.length;
      this.updateSelection();
    });
    downKey.on('down', () => {
      this.selectedIndex = (this.selectedIndex + 1) % MENU_ITEMS.length;
      this.updateSelection();
    });
    enterKey.on('down', () => {
      this.activateSelection();
    });
    spaceKey.on('down', () => {
      this.activateSelection();
    });
  }

  private updateSelection(): void {
    if (!this.selectedBorder) {
      return;
    }
    const menuY = this.scale.height / 2 - 40;
    this.selectedBorder.setY(menuY + this.selectedIndex * this.lineSpacing);
    const options = this.itemTexts;
    options.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.setColor('#4dffed');
        item.setScale(1.1);
      } else {
        item.setColor('#f0fcff');
        item.setScale(1);
      }
    });
  }

  private activateSelection(): void {
    const selection = MENU_ITEMS[this.selectedIndex].key;
    if (selection === 'new') {
      this.scene.start('GameScene');
    } else if (selection === 'settings') {
      this.scene.start('SettingsScene');
    } else {
      this.scene.start('AboutScene');
    }
  }
}
