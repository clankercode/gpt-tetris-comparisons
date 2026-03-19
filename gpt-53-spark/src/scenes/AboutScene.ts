import Phaser from 'phaser';

export default class AboutScene extends Phaser.Scene {
  public create(): void {
    this.cameras.main.setBackgroundColor(0x04071b);
    const cx = this.scale.width / 2;
    const lines = [
      'NEON BLOCK CASCADE',
      'A retro-styled Tetris clone built with Bun + TypeScript + Vite + Phaser.',
      'Controls are shown in the menu and gameplay overlays.',
      '',
      'Movement: ← → move',
      'Rotate: Z/X',
      'Soft drop: ↓',
      'Hard drop: SPACE',
      'Pause: P',
      'Restart: R',
      '',
      'Enjoy the chiptune-inspired loop, line clear flash, and glow effects.'
    ];

    this.add.text(cx, 64, 'ABOUT', {
      fontSize: '48px',
      color: '#77eeff',
      align: 'center',
      fontFamily: 'VT323, "Courier New", monospace'
    }).setOrigin(0.5);

    this.add.text(cx, 180, lines.join('\n'), {
      fontSize: '24px',
      align: 'left',
      color: '#d7f2ff',
      lineSpacing: 10,
      fontFamily: 'VT323, "Courier New", monospace',
      wordWrap: {
        width: this.scale.width - 220
      }
    }).setOrigin(0.5, 0);

    const back = this.add.text(cx, this.scale.height - 72, 'Press Enter or Esc to return to menu', {
      fontSize: '22px',
      color: '#8dc7ff',
      fontFamily: 'VT323, "Courier New", monospace'
    }).setOrigin(0.5);
    back.setShadow(0, 0, '#3df6ff', 6, false, true);

    const enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const esc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    enter.on('down', () => this.scene.start('MenuScene'));
    esc.on('down', () => this.scene.start('MenuScene'));
  }
}
