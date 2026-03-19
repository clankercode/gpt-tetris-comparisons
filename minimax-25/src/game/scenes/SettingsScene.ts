import Phaser from 'phaser';
import { GameSettings } from '../types';

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private returnTo!: string;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private canSelect = true;
  private toggles: { sound: Phaser.GameObjects.Text; music: Phaser.GameObjects.Text } = {
    sound: null!,
    music: null!,
  };

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: { settings: GameSettings; returnTo: string }) {
    this.settings = { ...data.settings };
    this.returnTo = data.returnTo;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    const title = this.add.text(400, 100, 'SETTINGS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ff00ff',
    });
    title.setOrigin(0.5);

    this.menuItems = [];

    const soundLabel = this.add.text(250, 220, 'SOUND FX', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#00ff88',
    });

    this.toggles.sound = this.add.text(550, 220, this.settings.sound ? 'ON' : 'OFF', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: this.settings.sound ? '#00ff00' : '#ff0000',
    });
    this.toggles.sound.setOrigin(1, 0);

    const soundBtn = this.add.rectangle(400, 220, 400, 40, 0x000000, 0);
    soundBtn.setInteractive({ useHandCursor: true });
    soundBtn.on('pointerdown', () => this.toggleSound());
    soundBtn.on('pointerover', () => this.selectIndex(0));

    const musicLabel = this.add.text(250, 280, 'MUSIC', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#00ff88',
    });

    this.toggles.music = this.add.text(550, 280, this.settings.music ? 'ON' : 'OFF', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: this.settings.music ? '#00ff00' : '#ff0000',
    });
    this.toggles.music.setOrigin(1, 0);

    const musicBtn = this.add.rectangle(400, 280, 400, 40, 0x000000, 0);
    musicBtn.setInteractive({ useHandCursor: true });
    musicBtn.on('pointerdown', () => this.toggleMusic());
    musicBtn.on('pointerover', () => this.selectIndex(1));

    const backText = this.add.text(400, 400, '> BACK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ff00ff',
    });
    backText.setOrigin(0.5);

    const backBtn = this.add.rectangle(400, 400, 200, 40, 0x000000, 0);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.goBack());
    backBtn.on('pointerover', () => this.selectIndex(2));

    this.menuItems = [soundLabel, musicLabel, backText];
    this.updateSelection();

    const hint = this.add.text(400, 500, 'PRESS B OR ESC TO GO BACK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#666688',
    });
    hint.setOrigin(0.5);

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Escape' || event.code === 'KeyB') {
        this.goBack();
      } else if (event.code === 'ArrowUp') {
        this.navigate(-1);
      } else if (event.code === 'ArrowDown') {
        this.navigate(1);
      } else if (event.code === 'Enter' || event.code === 'Space') {
        this.selectCurrent();
      } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (this.selectedIndex === 0) {
          this.toggleSound();
        } else if (this.selectedIndex === 1) {
          this.toggleMusic();
        }
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
    });
  }

  private toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.toggles.sound.setText(this.settings.sound ? 'ON' : 'OFF');
    this.toggles.sound.setColor(this.settings.sound ? '#00ff00' : '#ff0000');

    this.tweens.add({
      targets: this.toggles.sound,
      scale: { from: 1.2, to: 1 },
      duration: 100,
    });
  }

  private toggleMusic() {
    this.settings.music = !this.settings.music;
    this.toggles.music.setText(this.settings.music ? 'ON' : 'OFF');
    this.toggles.music.setColor(this.settings.music ? '#00ff00' : '#ff0000');

    this.tweens.add({
      targets: this.toggles.music,
      scale: { from: 1.2, to: 1 },
      duration: 100,
    });
  }

  private selectCurrent() {
    if (!this.canSelect) return;
    this.canSelect = false;

    if (this.selectedIndex === 0) {
      this.toggleSound();
    } else if (this.selectedIndex === 1) {
      this.toggleMusic();
    } else if (this.selectedIndex === 2) {
      this.goBack();
    }

    this.time.delayedCall(200, () => {
      this.canSelect = true;
    });
  }

  private goBack() {
    this.scene.stop();
    this.scene.resume(this.returnTo, { settings: this.settings });
  }
}
