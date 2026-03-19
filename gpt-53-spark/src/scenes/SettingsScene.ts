import Phaser from 'phaser';
import { defaultGameSettings, GameSettings } from '../core/settings';

type SettingKey = 'music' | 'sfx' | 'ghost' | 'back';

const SETTINGS: { key: SettingKey; label: string }[] = [
  { key: 'music', label: 'MUSIC VOLUME' },
  { key: 'sfx', label: 'SFX VOLUME' },
  { key: 'ghost', label: 'GHOST PIECE' },
  { key: 'back', label: 'BACK TO MENU' }
];

export default class SettingsScene extends Phaser.Scene {
  private selectedIndex = 0;
  private selectedBorder?: Phaser.GameObjects.Rectangle;
  private valueTexts: Phaser.GameObjects.Text[] = [];
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private settings!: GameSettings;

  public create(): void {
    this.cameras.main.setBackgroundColor(0x040b20);
    const cx = this.scale.width / 2;
    const baseY = this.scale.height / 2 - 90;
    this.settings = {
      ...defaultGameSettings,
      ...this.registry.get('gameSettings')
    };

    this.add.text(cx, 70, 'SETTINGS', {
      fontSize: '48px',
      color: '#8ef0ff',
      fontFamily: 'VT323, "Courier New", monospace',
      align: 'center'
    }).setOrigin(0.5).setShadow(0, 0, '#3df6ff', 8, false, true);

    this.selectedBorder = this.add.rectangle(cx - 220, baseY - 8, 500, 44, 0x2df6ff, 0.16);

    SETTINGS.forEach((entry, index) => {
      const y = baseY + index * 52;
      const row = this.add.text(cx - 260, y, entry.label, {
        fontSize: '28px',
        color: '#d6f7ff',
        fontFamily: 'VT323, "Courier New", monospace'
      });
      const value = this.add.text(cx + 130, y, this.valueLabel(entry.key), {
        fontSize: '28px',
        color: '#93ffe8',
        fontFamily: 'VT323, "Courier New", monospace'
      });
      this.optionTexts.push(row);
      this.valueTexts.push(value);
    });

    this.add.text(cx, this.scale.height - 100, [
      'Use ▲ and ▼ to navigate.',
      'Use ← and → to edit values (except BACK).',
      'Press Enter to confirm selection.'
    ].join('\n'), {
      fontSize: '18px',
      color: '#95caff',
      align: 'center',
      fontFamily: 'VT323, "Courier New", monospace'
    }).setOrigin(0.5);

    this.updateCursor();
    this.bindInput();
  }

  private bindInput(): void {
    const up = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const down = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    const left = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const right = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    const enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const esc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    up.on('down', () => {
      this.selectedIndex = (this.selectedIndex + SETTINGS.length - 1) % SETTINGS.length;
      this.updateCursor();
      this.soundBeep();
    });

    down.on('down', () => {
      this.selectedIndex = (this.selectedIndex + 1) % SETTINGS.length;
      this.updateCursor();
      this.soundBeep();
    });

    left.on('down', () => {
      this.adjustSetting(-0.05);
      this.updateValues();
      this.soundBeep();
    });

    right.on('down', () => {
      this.adjustSetting(0.05);
      this.updateValues();
      this.soundBeep();
    });

    enter.on('down', () => {
      const selected = SETTINGS[this.selectedIndex].key;
      if (selected === 'back') {
        this.registry.set('gameSettings', this.settings);
        this.scene.start('MenuScene');
      } else {
        this.toggleGhostIfApplicable();
        this.soundBeep();
      }
    });

    esc.on('down', () => {
      this.registry.set('gameSettings', this.settings);
      this.scene.start('MenuScene');
    });
  }

  private adjustSetting(step: number): void {
    const current = SETTINGS[this.selectedIndex].key;
    if (current === 'music') {
      this.settings.musicVolume = Math.min(1, Math.max(0, Number((this.settings.musicVolume + step).toFixed(2))));
    } else if (current === 'sfx') {
      this.settings.sfxVolume = Math.min(1, Math.max(0, Number((this.settings.sfxVolume + step).toFixed(2))));
    } else if (current === 'ghost') {
      this.settings.showGhost = !this.settings.showGhost;
    }
  }

  private toggleGhostIfApplicable(): void {
    if (SETTINGS[this.selectedIndex].key === 'ghost') {
      this.settings.showGhost = !this.settings.showGhost;
    }
  }

  private updateValues(): void {
    SETTINGS.forEach((entry, index) => {
      if (this.valueTexts[index]) {
        this.valueTexts[index].setText(this.valueLabel(entry.key));
      }
    });
  }

  private valueLabel(key: SettingKey): string {
    if (key === 'music') {
      return `${Math.round(this.settings.musicVolume * 100)}%`;
    }
    if (key === 'sfx') {
      return `${Math.round(this.settings.sfxVolume * 100)}%`;
    }
    if (key === 'ghost') {
      return this.settings.showGhost ? 'ON' : 'OFF';
    }
    return '';
  }

  private updateCursor(): void {
    if (!this.selectedBorder) {
      return;
    }
    const baseY = this.scale.height / 2 - 90;
    this.selectedBorder.setY(baseY + this.selectedIndex * 52 - 8);
    this.optionTexts.forEach((label, idx) => {
      if (idx === this.selectedIndex) {
        label.setColor('#4dffed');
      } else {
        label.setColor('#d6f7ff');
      }
    });
  }

  private soundBeep(): void {
    this.soundBeepTone();
  }

  private soundBeepTone(): void {
    // Lightweight, optional visual-only game menu cue.
    // Real gameplay uses the scene music loop in GameScene.
    if (!this.cameras.main.shake) {
      return;
    }
    this.cameras.main.shake(30, 0.001);
  }
}
