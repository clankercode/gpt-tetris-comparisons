import Phaser from 'phaser';
import { loadSettings } from '../config';

export class AudioManager {
  private scene: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private musicVolume = 0.7;
  private sfxVolume = 0.8;
  private currentMusic: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const settings = loadSettings();
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
  }

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('Web Audio not supported');
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    if (this.currentMusic) {
      this.currentMusic.gain.gain.value = volume * 0.3;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
  }

  startMenuMusic(): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    this.stopMusic();
    this.playChiptuneLoop([
      { note: 'E4', duration: 0.25 },
      { note: 'B3', duration: 0.25 },
      { note: 'C4', duration: 0.25 },
      { note: 'D4', duration: 0.25 },
      { note: 'E4', duration: 0.25 },
      { note: 'D4', duration: 0.25 },
      { note: 'C4', duration: 0.25 },
      { note: 'B3', duration: 0.25 },
    ], 0.5);
  }

  startGameMusic(): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    this.stopMusic();
    this.playChiptuneLoop([
      { note: 'E5', duration: 0.125 },
      { note: 'E5', duration: 0.125 },
      { note: 'REST', duration: 0.125 },
      { note: 'E5', duration: 0.125 },
      { note: 'REST', duration: 0.125 },
      { note: 'C5', duration: 0.125 },
      { note: 'E5', duration: 0.125 },
      { note: 'REST', duration: 0.125 },
      { note: 'G5', duration: 0.25 },
      { note: 'REST', duration: 0.25 },
      { note: 'G4', duration: 0.25 },
    ], 0.5);
  }

  stopMusic(): void {
    if (this.currentMusic) {
      try {
        this.currentMusic.oscillator.stop();
      } catch {}
      this.currentMusic = null;
    }
  }

  private playChiptuneLoop(notes: { note: string; duration: number }[], tempo: number): void {
    if (!this.audioContext) return;

    const noteFreq: Record<string, number> = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'REST': 0,
    };

    const playLoop = () => {
      if (!this.audioContext) return;
      
      let time = this.audioContext.currentTime;
      
      for (const note of notes) {
        const duration = note.duration * tempo;
        
        if (note.note !== 'REST' && noteFreq[note.note]) {
          const osc = this.audioContext!.createOscillator();
          const gain = this.audioContext!.createGain();
          
          osc.type = 'square';
          osc.frequency.value = noteFreq[note.note];
          
          gain.gain.value = this.musicVolume * 0.15;
          gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.9);
          
          osc.connect(gain);
          gain.connect(this.audioContext!.destination);
          
          osc.start(time);
          osc.stop(time + duration);
        }
        
        time += duration;
      }
      
      const totalDuration = notes.reduce((sum, n) => sum + n.duration * tempo, 0);
      setTimeout(playLoop, totalDuration * 1000);
    };
    
    playLoop();
  }

  playMove(): void {
    this.playTone(200, 0.05, 'square');
  }

  playRotate(): void {
    this.playTone(300, 0.08, 'square');
  }

  playDrop(): void {
    this.playTone(150, 0.1, 'square');
  }

  playHardDrop(): void {
    this.playTone(100, 0.15, 'sawtooth');
  }

  playLineClear(count: number): void {
    const baseFreq = 400 + count * 100;
    this.playTone(baseFreq, 0.2, 'square');
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.15, 'square'), 100);
    if (count >= 3) {
      setTimeout(() => this.playTone(baseFreq * 2, 0.1, 'square'), 200);
    }
  }

  playGameOver(): void {
    this.playTone(200, 0.3, 'sawtooth');
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 300);
    setTimeout(() => this.playTone(100, 0.5, 'sawtooth'), 600);
  }

  playLevelUp(): void {
    this.playTone(400, 0.1, 'square');
    setTimeout(() => this.playTone(500, 0.1, 'square'), 100);
    setTimeout(() => this.playTone(600, 0.15, 'square'), 200);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext || this.sfxVolume === 0) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = type;
      osc.frequency.value = frequency;
      
      gain.gain.value = this.sfxVolume * 0.3;
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch {}
  }
}
