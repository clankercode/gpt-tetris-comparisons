import { MUSIC_THEMES } from "./config";
import type { MusicThemeKey, SettingsState } from "./types";

const STORAGE_KEY = "neon-matrix-settings";

export function loadSettings(): SettingsState {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return { masterVolume: 0.85, musicVolume: 0.6, sfxVolume: 0.8, crtIntensity: 0.7, screenShake: true };
  }

  try {
    return JSON.parse(raw) as SettingsState;
  } catch {
    return { masterVolume: 0.85, musicVolume: 0.6, sfxVolume: 0.8, crtIntensity: 0.7, screenShake: true };
  }
}

export function saveSettings(settings: SettingsState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export class RetroAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextNoteAt = 0;
  private step = 0;
  private activeTheme: MusicThemeKey | null = null;
  private settings: SettingsState;

  constructor(settings: SettingsState) {
    this.settings = settings;
  }

  updateSettings(settings: SettingsState): void {
    this.settings = settings;
    if (!this.masterGain || !this.musicGain || !this.sfxGain) {
      return;
    }

    this.masterGain.gain.value = settings.masterVolume;
    this.musicGain.gain.value = settings.musicVolume;
    this.sfxGain.gain.value = settings.sfxVolume;
  }

  async resume(): Promise<void> {
    if (!this.context) {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioCtor();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();

      this.masterGain.connect(this.context.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.updateSettings(this.settings);
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  startMusic(themeKey: MusicThemeKey): void {
    this.activeTheme = themeKey;
    if (!this.context || !this.musicGain) {
      return;
    }

    this.stopMusic();
    this.activeTheme = themeKey;
    this.nextNoteAt = this.context.currentTime + 0.06;
    this.step = 0;

    this.schedulerId = window.setInterval(() => {
      this.scheduleMusic();
    }, 90);
  }

  stopMusic(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  playMove(): void {
    this.playSquareBlip(220, 0.04, 0.06);
  }

  playRotate(): void {
    this.playSquareBlip(440, 0.06, 0.06);
  }

  playDrop(): void {
    this.playNoiseHit(0.07, 380);
  }

  playHold(): void {
    this.playTriangleSweep(380, 260, 0.14);
  }

  playLineClear(count: number): void {
    const chord = count >= 4 ? [523.25, 659.25, 783.99] : [392, 523.25];
    chord.forEach((freq, index) => {
      this.playTone(freq, 0.18 + index * 0.03, "square", 0.07);
    });
    this.playNoiseHit(count >= 4 ? 0.25 : 0.14, 1800);
  }

  playGameOver(): void {
    this.playTriangleSweep(392, 98, 0.7);
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicGain || !this.activeTheme) {
      return;
    }

    const theme = MUSIC_THEMES[this.activeTheme];
    const secondsPerBeat = 60 / theme.bpm;
    const stepDuration = secondsPerBeat / 2;
    const lookAhead = this.context.currentTime + 0.25;

    while (this.nextNoteAt < lookAhead) {
      const lead = theme.lead[this.step % theme.lead.length];
      const bass = theme.bass[this.step % theme.bass.length];
      this.playPatternVoice(lead, this.nextNoteAt, 0.18, "square", 0.08);
      this.playPatternVoice(bass, this.nextNoteAt, 0.22, "triangle", 0.09);

      if (this.step % 4 === 0) {
        this.playNoiseHitAt(this.nextNoteAt, 0.04, 1200);
      }

      this.nextNoteAt += stepDuration;
      this.step += 1;
    }
  }

  private midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private playPatternVoice(midi: number, time: number, length: number, type: OscillatorType, gainAmount: number): void {
    this.playTone(this.midiToFrequency(midi), length, type, gainAmount, time);
  }

  private playSquareBlip(freq: number, length: number, gainAmount: number): void {
    this.playTone(freq, length, "square", gainAmount);
  }

  private playTriangleSweep(start: number, end: number, length: number): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + length);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }

  private playTone(freq: number, length: number, type: OscillatorType, gainAmount: number, startTime?: number): void {
    if (!this.context || !this.sfxGain || !this.musicGain) {
      return;
    }

    const now = startTime ?? this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const destination = startTime ? this.musicGain : this.sfxGain;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + length + 0.04);
  }

  private playNoiseHit(length: number, cutoff: number): void {
    if (!this.context) {
      return;
    }
    this.playNoiseHitAt(this.context.currentTime, length, cutoff);
  }

  private playNoiseHitAt(startTime: number, length: number, cutoff: number): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * length), this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, startTime);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + length);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(startTime);
    source.stop(startTime + length + 0.02);
  }
}
