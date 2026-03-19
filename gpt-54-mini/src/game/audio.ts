import { DEFAULT_PROFILE, type AudioSettings } from "./storage";

type MusicMode = "menu" | "game" | "off";
type SfxName = "menu" | "move" | "rotate" | "lock" | "clear" | "gameover" | "confirm" | "back";

interface MusicPattern {
  readonly bpm: number;
  readonly bass: readonly (number | null)[];
  readonly lead: readonly (number | null)[];
  readonly percussion: readonly boolean[];
}

const NOTE = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
} as const;

const MENU_PATTERN: MusicPattern = {
  bpm: 112,
  bass: [
    NOTE.A2,
    null,
    NOTE.E2,
    null,
    NOTE.F2,
    null,
    NOTE.G2,
    null,
    NOTE.A2,
    null,
    NOTE.E2,
    null,
    NOTE.D2,
    null,
    NOTE.E2,
    null,
  ],
  lead: [
    NOTE.A4,
    NOTE.C5,
    NOTE.E5,
    NOTE.C5,
    NOTE.G4,
    NOTE.C5,
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.C5,
    NOTE.B4,
    NOTE.C5,
    NOTE.A4,
    NOTE.E5,
  ],
  percussion: [
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    true,
  ],
};

const GAME_PATTERN: MusicPattern = {
  bpm: 132,
  bass: [
    NOTE.A2,
    null,
    NOTE.E2,
    null,
    NOTE.G2,
    null,
    NOTE.E2,
    null,
    NOTE.F2,
    null,
    NOTE.C2,
    null,
    NOTE.D2,
    null,
    NOTE.E2,
    null,
  ],
  lead: [
    NOTE.A4,
    NOTE.E5,
    NOTE.G4,
    NOTE.E5,
    NOTE.C5,
    NOTE.D5,
    NOTE.E5,
    NOTE.C5,
    NOTE.F4,
    NOTE.C5,
    NOTE.D5,
    NOTE.E5,
    NOTE.G4,
    NOTE.A4,
    NOTE.E5,
    NOTE.D5,
  ],
  percussion: [
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    true,
  ],
};

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.3), context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function makeEnvelope(
  context: AudioContext,
  gain: GainNode,
  startTime: number,
  attack = 0.01,
  decay = 0.14,
): void {
  gain.gain.cancelScheduledValues(startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(1, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);
}

export class RetroAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicMode: MusicMode = "menu";
  private musicStep = 0;
  private gameLevel = 0;
  private settings: AudioSettings = { ...DEFAULT_PROFILE.audio };
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;

  setSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    this.applySettings();
  }

  setMode(mode: MusicMode): void {
    this.musicMode = mode;
    this.restartMusic();
  }

  setGameLevel(level: number): void {
    this.gameLevel = Math.max(0, Math.min(29, Math.floor(level)));
    if (this.musicMode === "game") {
      this.restartMusic();
    }
  }

  async unlock(): Promise<void> {
    if (this.unlocked) {
      return;
    }

    this.unlocked = true;
    this.ensureContext();
    if (!this.context) {
      return;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.restartMusic();
    this.playSfx("menu");
  }

  playSfx(name: SfxName): void {
    if (!this.settings.sfxEnabled) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.sfxGain) {
      return;
    }

    const now = context.currentTime + 0.01;

    switch (name) {
      case "menu":
      case "confirm":
        this.playTone(740, 0.05, 0.18, "square", 0.2, now);
        this.playTone(990, 0.04, 0.11, "triangle", 0.12, now + 0.015);
        break;
      case "back":
        this.playTone(392, 0.05, 0.16, "triangle", 0.16, now);
        this.playTone(262, 0.06, 0.12, "square", 0.08, now + 0.02);
        break;
      case "move":
        this.playTone(520, 0.02, 0.06, "square", 0.14, now);
        break;
      case "rotate":
        this.playTone(620, 0.02, 0.08, "square", 0.16, now);
        this.playTone(780, 0.015, 0.05, "triangle", 0.08, now + 0.01);
        break;
      case "lock":
        this.playTone(190, 0.025, 0.12, "triangle", 0.18, now);
        break;
      case "clear":
        this.playTone(620, 0.02, 0.16, "triangle", 0.18, now);
        this.playTone(932, 0.03, 0.12, "square", 0.12, now + 0.02);
        this.playNoiseBurst(now + 0.01, 0.03, 0.055);
        break;
      case "gameover":
        this.playTone(220, 0.05, 0.32, "sawtooth", 0.18, now);
        this.playTone(164, 0.07, 0.42, "square", 0.11, now + 0.12);
        this.playNoiseBurst(now + 0.01, 0.025, 0.08);
        break;
    }
  }

  private playTone(
    frequency: number,
    attack: number,
    release: number,
    wave: OscillatorType,
    gainAmount: number,
    startTime: number,
  ): void {
    const context = this.context;
    if (!context || !this.sfxGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainAmount, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + release);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + release + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  private playNoiseBurst(startTime: number, gainAmount: number, duration: number): void {
    const context = this.context;
    if (!context || !this.sfxGain) {
      return;
    }

    this.noiseBuffer ??= createNoiseBuffer(context);
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = this.noiseBuffer;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainAmount, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private restartMusic(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }

    if (!this.context || !this.settings.musicEnabled || this.musicMode === "off") {
      return;
    }

    this.musicStep = this.musicStep % 16;
    this.scheduleNextStep();
  }

  private scheduleNextStep(): void {
    if (!this.context || !this.musicGain || !this.settings.musicEnabled || this.musicMode === "off") {
      return;
    }

    const pattern = this.musicMode === "game" ? GAME_PATTERN : MENU_PATTERN;
    const stepDurationMs = (60_000 / pattern.bpm) / 4;
    const stepIndex = this.musicStep % pattern.lead.length;
    const now = this.context.currentTime + 0.02;
    const stepOffset = stepIndex % pattern.lead.length;
    const levelBoost = this.musicMode === "game" ? Math.min(this.gameLevel, 12) * 0.01 : 0;
    const durationScale = 1 - levelBoost;

    const bass = pattern.bass[stepOffset];
    const lead = pattern.lead[stepOffset];
    const percussion = pattern.percussion[stepOffset];

    if (bass !== null) {
      this.playMusicTone(bass / 2, now, 0.16 * durationScale, "triangle", 0.18);
    }

    if (lead !== null) {
      const octaveBoost = this.musicMode === "game" ? 1.08 : 1.0;
      this.playMusicTone(lead, now, 0.12 * durationScale, "square", 0.12 * octaveBoost);
      if (stepOffset % 4 === 0) {
        this.playMusicTone(lead * 2, now + 0.015, 0.06 * durationScale, "triangle", 0.06);
      }
    }

    if (percussion) {
      this.playNoiseBurst(now + 0.005, this.musicMode === "game" ? 0.045 : 0.035, 0.05);
    }

    this.musicStep = (this.musicStep + 1) % pattern.lead.length;
    this.musicTimer = window.setTimeout(() => this.scheduleNextStep(), stepDurationMs);
  }

  private playMusicTone(
    frequency: number,
    startTime: number,
    duration: number,
    wave: OscillatorType,
    gainAmount: number,
  ): void {
    if (!this.musicGain || !this.context) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(60, frequency), startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainAmount, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (!this.context) {
      const AudioContextCtor = window.AudioContext || (window as Window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
      if (!AudioContextCtor) {
        return null;
      }

      this.context = new AudioContextCtor();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.context.destination);
      this.applySettings();
    }

    return this.context;
  }

  private applySettings(): void {
    if (!this.context || !this.master || !this.musicGain || !this.sfxGain) {
      return;
    }

    this.musicGain.gain.value = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    this.sfxGain.gain.value = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    this.master.gain.value = 0.8;

    if (!this.settings.musicEnabled || this.musicMode === "off") {
      this.stopMusicTimer();
    } else {
      this.restartMusic();
    }
  }

  private stopMusicTimer(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new RetroAudio();
