import type { Settings, MusicTheme } from "./types";
import { MUSIC_THEMES } from "./config";

/**
 * Procedural audio engine using Web Audio API.
 * All sounds are synthesized at runtime -- no audio files needed.
 */
export class RetroAudio {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;

  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private currentTheme: MusicTheme | null = null;
  private isPlaying = false;

  constructor(private settings: Settings) {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applyVolumes();
  }

  // ── Volume control ────────────────────────────────────────────

  applyVolumes(): void {
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.applyVolumes();
  }

  // ── Resume context (needed for autoplay policy) ───────────────

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  // ── MIDI to frequency ─────────────────────────────────────────

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ── Oscillator helpers ────────────────────────────────────────

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainNode: GainNode,
    startTime: number,
    volume = 0.3
  ): void {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(volume, startTime);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(env);
    env.connect(gainNode);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playNoise(
    duration: number,
    gainNode: GainNode,
    startTime: number,
    volume = 0.15,
    filterFreq = 800
  ): void {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(volume, startTime);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(env);
    env.connect(gainNode);
    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // ── Music sequencer ───────────────────────────────────────────

  startMusic(themeIndex: number): void {
    this.stopMusic();
    const theme = MUSIC_THEMES[themeIndex];
    if (!theme) return;

    this.currentTheme = theme;
    this.musicStep = 0;
    this.isPlaying = true;

    const stepDuration = 60 / theme.bpm / 2; // 8th notes
    const scheduleAhead = 0.2;

    this.musicInterval = setInterval(() => {
      if (!this.isPlaying || !this.currentTheme) return;

      const now = this.ctx.currentTime;
      const time = now + scheduleAhead;

      // Lead voice (square wave)
      const leadNote = this.currentTheme.lead[this.musicStep % this.currentTheme.lead.length];
      if (leadNote > 0) {
        this.playTone(this.midiToFreq(leadNote), stepDuration * 0.8, "square", this.musicGain, time, 0.18);
      }

      // Bass voice (triangle wave)
      const bassNote = this.currentTheme.bass[this.musicStep % this.currentTheme.bass.length];
      if (bassNote > 0) {
        this.playTone(this.midiToFreq(bassNote), stepDuration * 0.9, "triangle", this.musicGain, time, 0.22);
      }

      // Percussion: kick on every 4th step, hi-hat on every 2nd
      if (this.musicStep % 4 === 0) {
        this.playNoise(0.08, this.musicGain, time, 0.12, 200);
      }
      if (this.musicStep % 2 === 1) {
        this.playNoise(0.04, this.musicGain, time, 0.06, 6000);
      }

      this.musicStep++;
    }, stepDuration * 1000);
  }

  stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isPlaying = false;
    this.currentTheme = null;
  }

  // ── SFX ───────────────────────────────────────────────────────

  playMove(): void {
    const now = this.ctx.currentTime;
    this.playTone(220, 0.06, "square", this.sfxGain, now, 0.2);
  }

  playRotate(): void {
    const now = this.ctx.currentTime;
    this.playTone(440, 0.06, "square", this.sfxGain, now, 0.2);
  }

  playDrop(): void {
    const now = this.ctx.currentTime;
    this.playNoise(0.12, this.sfxGain, now, 0.25, 380);
  }

  playHold(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.1);
    env.gain.setValueAtTime(0.25, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLineClear(count: number): void {
    const now = this.ctx.currentTime;
    const isTetris = count >= 4;

    // Chord
    const baseFreq = isTetris ? 523 : 392;
    this.playTone(baseFreq, 0.25, "square", this.sfxGain, now, 0.2);
    this.playTone(baseFreq * 1.25, 0.25, "square", this.sfxGain, now, 0.15);
    if (isTetris) {
      this.playTone(baseFreq * 1.5, 0.3, "square", this.sfxGain, now, 0.15);
      // Extra rising sweep for tetris
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      env.gain.setValueAtTime(0.12, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);
    }
    this.playNoise(0.15, this.sfxGain, now, 0.15, 1200);
  }

  playGameOver(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(392, now);
    osc.frequency.exponentialRampToValueAtTime(98, now + 1.0);
    env.gain.setValueAtTime(0.3, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);

    // Noise burst
    this.playNoise(0.5, this.sfxGain, now, 0.15, 400);
  }

  playMenuSelect(): void {
    const now = this.ctx.currentTime;
    this.playTone(330, 0.05, "square", this.sfxGain, now, 0.15);
    this.playTone(440, 0.08, "square", this.sfxGain, now + 0.05, 0.15);
  }

  playMenuMove(): void {
    const now = this.ctx.currentTime;
    this.playTone(280, 0.04, "square", this.sfxGain, now, 0.12);
  }

  playMenuBack(): void {
    const now = this.ctx.currentTime;
    this.playTone(330, 0.06, "square", this.sfxGain, now, 0.12);
    this.playTone(220, 0.08, "square", this.sfxGain, now + 0.06, 0.12);
  }
}
