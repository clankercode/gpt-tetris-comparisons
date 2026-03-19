import Phaser from 'phaser';
import { musicEngine } from '../audio/MusicEngine';
import { MenuScene } from './MenuScene';

interface SettingEntry {
  label: string;
  getValue: () => string;
  increase: () => void;
  decrease: () => void;
}

export class SettingsScene extends Phaser.Scene {
  private settings!: SettingEntry[];
  private selectedIndex = 0;
  private textObjects: Phaser.GameObjects.Text[] = [];
  private valueObjects: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'Settings' });
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

    // Title
    this.add.text(W / 2, 50, 'SETTINGS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#00f0f0',
      stroke: '#003333',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Decorative line
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x00f0f0, 0.4);
    lineG.strokeLineShape(new Phaser.Geom.Line(W / 2 - 200, 85, W / 2 + 200, 85));

    this.settings = [
      {
        label: 'STARTING LEVEL',
        getValue: () => `${MenuScene.startLevel}`,
        increase: () => { MenuScene.startLevel = Math.min(10, MenuScene.startLevel + 1); },
        decrease: () => { MenuScene.startLevel = Math.max(1, MenuScene.startLevel - 1); },
      },
      {
        label: 'MUSIC VOLUME',
        getValue: () => `${Math.round(MenuScene.musicVolume * 10)}/10`,
        increase: () => {
          MenuScene.musicVolume = Math.min(1, MenuScene.musicVolume + 0.1);
          musicEngine.volume = MenuScene.musicVolume;
        },
        decrease: () => {
          MenuScene.musicVolume = Math.max(0, MenuScene.musicVolume - 0.1);
          musicEngine.volume = MenuScene.musicVolume;
        },
      },
      {
        label: 'SOUND EFFECTS',
        getValue: () => MenuScene.sfxEnabled ? 'ON' : 'OFF',
        increase: () => { MenuScene.sfxEnabled = true; },
        decrease: () => { MenuScene.sfxEnabled = false; },
      },
      {
        label: 'MUSIC',
        getValue: () => musicEngine.isPlaying ? 'ON' : 'OFF',
        increase: () => { musicEngine.start(); },
        decrease: () => { musicEngine.stop(); },
      },
    ];

    this.buildUI(W, H);

    // Input
    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.changeSelection(-1));
    kb.on('keydown-DOWN', () => this.changeSelection(1));
    kb.on('keydown-LEFT', () => { this.settings[this.selectedIndex].decrease(); this.refreshValues(); });
    kb.on('keydown-RIGHT', () => { this.settings[this.selectedIndex].increase(); this.refreshValues(); });
    kb.on('keydown-W', () => this.changeSelection(-1));
    kb.on('keydown-S', () => this.changeSelection(1));
    kb.on('keydown-A', () => { this.settings[this.selectedIndex].decrease(); this.refreshValues(); });
    kb.on('keydown-D', () => { this.settings[this.selectedIndex].increase(); this.refreshValues(); });
    kb.on('keydown-ESC', () => this.goBack());
    kb.on('keydown-BACKSPACE', () => this.goBack());
    kb.on('keydown-ENTER', () => this.goBack());

    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 300 });

    this.updateSelection();
  }

  private buildUI(W: number, H: number): void {
    const startY = 140;
    const spacing = 60;

    this.settings.forEach((s, i) => {
      const y = startY + i * spacing;
      const label = this.add.text(W / 2 - 180, y, s.label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        color: '#888888',
      });
      this.textObjects.push(label);

      const value = this.add.text(W / 2 + 100, y, s.getValue(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        color: '#00f0f0',
      }).setOrigin(0.5, 0);
      this.valueObjects.push(value);
    });

    // Back hint
    this.add.text(W / 2, H - 50, 'ESC / ENTER  Back to Menu', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#446644',
    }).setOrigin(0.5);

    // Arrow hints
    this.add.text(W / 2, H - 30, '\u2190 \u2192  Change Value', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#334433',
    }).setOrigin(0.5);
  }

  private changeSelection(dir: number): void {
    this.selectedIndex = (this.selectedIndex + dir + this.settings.length) % this.settings.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    this.textObjects.forEach((t, i) => {
      if (i === this.selectedIndex) {
        t.setColor('#00f0f0');
        t.setText('> ' + this.settings[i].label);
      } else {
        t.setColor('#666666');
        t.setText(this.settings[i].label);
      }
    });
    this.refreshValues();
  }

  private refreshValues(): void {
    this.valueObjects.forEach((v, i) => {
      v.setText(this.settings[i].getValue());
    });
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Menu');
    });
  }
}
