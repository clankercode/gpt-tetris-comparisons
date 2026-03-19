import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, loadSettings, saveSettings, DEFAULT_SETTINGS, type GameSettings } from '../config';

interface SettingItem {
  key: keyof GameSettings;
  label: string;
  type: 'slider' | 'toggle' | 'key';
}

interface NumericSettings {
  musicVolume: number;
  sfxVolume: number;
  startLevel: number;
}

interface BooleanSettings {
  ghostPiece: boolean;
  crtEffect: boolean;
}

interface KeySettings {
  keyLeft: string;
  keyRight: string;
  keyRotateCW: string;
  keyRotateCCW: string;
  keySoftDrop: string;
  keyHardDrop: string;
  keyHold: string;
  keyPause: string;
}

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private selectedIndex = 0;
  private items: SettingItem[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private keyCapture = false;
  private capturingKey: keyof GameSettings | null = null;
  private labelTexts: Phaser.GameObjects.Text[] = [];
  private valueTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this.settings = loadSettings();
    this.selectedIndex = 0;
    this.keyCapture = false;
    this.capturingKey = null;
    this.labelTexts = [];
    this.valueTexts = [];
    
    this.items = [
      { key: 'musicVolume', label: 'Music Volume', type: 'slider' },
      { key: 'sfxVolume', label: 'SFX Volume', type: 'slider' },
      { key: 'startLevel', label: 'Start Level', type: 'slider' },
      { key: 'ghostPiece', label: 'Ghost Piece', type: 'toggle' },
      { key: 'crtEffect', label: 'CRT Effect', type: 'toggle' },
      { key: 'keyLeft', label: 'Move Left', type: 'key' },
      { key: 'keyRight', label: 'Move Right', type: 'key' },
      { key: 'keyRotateCW', label: 'Rotate CW', type: 'key' },
      { key: 'keyRotateCCW', label: 'Rotate CCW', type: 'key' },
      { key: 'keySoftDrop', label: 'Soft Drop', type: 'key' },
      { key: 'keyHardDrop', label: 'Hard Drop', type: 'key' },
      { key: 'keyHold', label: 'Hold', type: 'key' },
      { key: 'keyPause', label: 'Pause', type: 'key' },
    ];

    this.createUI();
    this.setupInput();
  }

  createUI() {
    this.graphics = this.add.graphics();
    
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0a12).setOrigin(0, 0);
    
    this.add.text(GAME_WIDTH / 2, 50, 'SETTINGS', { 
      fontFamily: 'monospace', 
      fontSize: '32px', 
      color: '#f08000' 
    }).setOrigin(0.5);
    
    this.createSettingTexts();
    
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'ENTER: Edit  ESC: Back', { 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      color: '#606060' 
    }).setOrigin(0.5);
    
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'R: Reset to Defaults', { 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      color: '#404040' 
    }).setOrigin(0.5);
  }

  createSettingTexts() {
    const startY = 100;
    const lineHeight = 36;
    
    this.items.forEach((item, index) => {
      const y = startY + index * lineHeight;
      
      const labelColor = index === this.selectedIndex ? '#f08000' : '#e0e0e0';
      
      const labelText = this.add.text(60, y, item.label, { 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        color: labelColor 
      }).setOrigin(0, 0.5);
      this.labelTexts.push(labelText);
      
      const valueText = this.add.text(GAME_WIDTH - 60, y, this.getValueText(item), { 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        color: '#808080' 
      }).setOrigin(1, 0.5);
      this.valueTexts.push(valueText);
    });
  }

  getValueText(item: SettingItem): string {
    const value = this.settings[item.key];
    
    if (item.type === 'slider') {
      if (item.key === 'startLevel') {
        return String(value);
      }
      return `${Math.round(value as number * 100)}%`;
    } else if (item.type === 'toggle') {
      return value ? 'ON' : 'OFF';
    } else {
      return this.formatKeyCode(value as string);
    }
  }

  formatKeyCode(code: string): string {
    return code
      .replace('Key', '')
      .replace('Arrow', '')
      .replace('Digit', '')
      .toUpperCase();
  }

  updateSelection() {
    this.graphics.clear();
    
    const startY = 100;
    const lineHeight = 36;
    
    this.items.forEach((item, index) => {
      const y = startY + index * lineHeight;
      const isSelected = index === this.selectedIndex;
      
      if (isSelected) {
        this.graphics.fillStyle(0x1a1a2e, 1);
        this.graphics.fillRect(40, y - 12, GAME_WIDTH - 80, 32);
        
        this.graphics.fillStyle(0xf08000, 1);
        this.graphics.fillRect(40, y - 12, 4, 32);
      }
      
      const labelColor = isSelected ? '#f08000' : '#e0e0e0';
      const valueColor = this.capturingKey === item.key ? '#00ff00' : '#808080';
      
      this.labelTexts[index]!.setColor(labelColor);
      this.valueTexts[index]!.setText(this.getValueText(item));
      this.valueTexts[index]!.setColor(valueColor);
    });
  }

  setupInput() {
    this.input.keyboard!.on('keydown-UP', () => {
      if (this.keyCapture) return;
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-DOWN', () => {
      if (this.keyCapture) return;
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      const item = this.items[this.selectedIndex];
      if (item.type === 'key') {
        this.capturingKey = item.key;
        this.keyCapture = true;
        this.updateSelection();
      }
    });

    this.input.keyboard!.on('keydown-LEFT', () => {
      if (this.keyCapture) return;
      this.adjustValue(-1);
    });

    this.input.keyboard!.on('keydown-RIGHT', () => {
      if (this.keyCapture) return;
      this.adjustValue(1);
    });

    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.keyCapture) {
        this.keyCapture = false;
        this.capturingKey = null;
        this.updateSelection();
      } else {
        saveSettings(this.settings);
        this.scene.start('MenuScene');
      }
    });

    this.input.keyboard!.on('keydown-R', () => {
      if (!this.keyCapture) {
        this.settings = { ...DEFAULT_SETTINGS };
        this.updateSelection();
      }
    });

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.keyCapture && this.capturingKey) {
        event.preventDefault();
        if (this.capturingKey.startsWith('key')) {
          (this.settings as unknown as Record<string, string>)[this.capturingKey] = event.code;
        }
        this.keyCapture = false;
        this.capturingKey = null;
        this.updateSelection();
      }
    });
  }

  adjustValue(delta: number) {
    const item = this.items[this.selectedIndex];
    const key = item.key as keyof NumericSettings;
    
    if (item.type === 'slider') {
      if (key === 'startLevel') {
        const current = this.settings.startLevel;
        this.settings.startLevel = Math.max(0, Math.min(19, current + delta));
      } else if (key === 'musicVolume') {
        const current = this.settings.musicVolume;
        this.settings.musicVolume = Math.max(0, Math.min(1, current + delta * 0.1));
      } else if (key === 'sfxVolume') {
        const current = this.settings.sfxVolume;
        this.settings.sfxVolume = Math.max(0, Math.min(1, current + delta * 0.1));
      }
    } else if (item.type === 'toggle') {
      const toggleKey = item.key as keyof BooleanSettings;
      if (delta !== 0) {
        this.settings[toggleKey] = !this.settings[toggleKey];
      }
    }
    
    this.updateSelection();
  }
}
