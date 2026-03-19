/**
 * MusicEngine — Procedural chiptune synthesizer
 * Plays Korobeiniki (Tetris Type A) using Web Audio API square/triangle oscillators.
 */

// [freq_hz, duration_in_sixteenths]
type NoteEntry = [number, number];

// Korobeiniki (Type A) — complete melody with correct SRS frequencies
const KOROBEINIKI_MELODY: NoteEntry[] = [
  // Phrase 1
  [659.25, 4], [493.88, 2], [523.25, 2],
  [587.33, 4], [523.25, 2], [493.88, 2],
  [440.00, 4], [440.00, 2], [523.25, 2],
  [659.25, 4], [587.33, 2], [523.25, 2],
  [493.88, 6], [523.25, 2],
  [587.33, 4], [659.25, 4],
  [523.25, 4], [440.00, 4],
  [440.00, 8],
  // Phrase 2
  [0, 2], [587.33, 2],
  [698.46, 4], [880.00, 4],
  [783.99, 2], [698.46, 2], [659.25, 4],
  [0, 2], [523.25, 2],
  [659.25, 4], [587.33, 2], [523.25, 2],
  [493.88, 6], [523.25, 2],
  [587.33, 4], [659.25, 4],
  [523.25, 4], [440.00, 4],
  [440.00, 8],
  // Phrase 3
  [659.25, 4], [523.25, 2], [523.25, 2],
  [659.25, 4], [783.99, 4],
  [880.00, 4], [698.46, 4],
  [659.25, 4], [523.25, 2], [523.25, 2],
  [659.25, 4], [783.99, 4],
  [880.00, 4], [0, 4],
  // Phrase 4
  [659.25, 4], [0, 2], [493.88, 2],
  [523.25, 4], [0, 2], [587.33, 2],
  [659.25, 4], [587.33, 2], [523.25, 2],
  [493.88, 6], [523.25, 2],
  [587.33, 4], [659.25, 4],
  [523.25, 4], [440.00, 4],
  [440.00, 8],
];

const BASS_LINE: NoteEntry[] = [
  [164.81, 4], [196.00, 4],
  [146.83, 4], [164.81, 4],
  [146.83, 4], [164.81, 2], [196.00, 2],
  [220.00, 8],

  [220.00, 4], [246.94, 4],
  [220.00, 4], [196.00, 4],
  [196.00, 4], [220.00, 2], [246.94, 2],
  [261.63, 8],

  [196.00, 4], [220.00, 4],
  [164.81, 4], [196.00, 4],
  [146.83, 4], [164.81, 4],
  [220.00, 8],

  [220.00, 4], [246.94, 4],
  [220.00, 4], [196.00, 4],
  [196.00, 4], [220.00, 2], [246.94, 2],
  [164.81, 8],

  [164.81, 4], [196.00, 4],
  [220.00, 4], [261.63, 4],
  [329.63, 4], [261.63, 4],
  [220.00, 4], [196.00, 4],

  [164.81, 4], [196.00, 4],
  [220.00, 4], [261.63, 4],
  [329.63, 8],
  [0, 8],

  [220.00, 4], [246.94, 4],
  [261.63, 4], [220.00, 4],
  [196.00, 4], [220.00, 2], [246.94, 2],
  [261.63, 8],
];

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private melodyGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private playing = false;
  private scheduledNodes: AudioNode[] = [];
  private _volume = 0.6;
  private loopTimeout: ReturnType<typeof setTimeout> | null = null;

  get volume(): number { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx!.currentTime, 0.05);
    }
  }

  get isPlaying(): boolean { return this.playing; }

  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volume;
    this.masterGain.connect(this.ctx.destination);

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.55;
    this.melodyGain.connect(this.masterGain);

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.35;
    this.bassGain.connect(this.masterGain);

    this.scheduleLoop();
  }

  stop(): void {
    this.playing = false;
    if (this.loopTimeout) clearTimeout(this.loopTimeout);
    this.loopTimeout = null;
    this.scheduledNodes.forEach(n => {
      try { (n as OscillatorNode).stop?.(); } catch (_) { /* already stopped */ }
    });
    this.scheduledNodes = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private scheduleLoop(): void {
    if (!this.playing || !this.ctx || !this.melodyGain || !this.bassGain) return;

    const BPM = 158;
    const SIXTEENTH = 60 / BPM / 4;
    let t = this.ctx.currentTime + 0.05;

    // Schedule melody
    for (const [freq, dur] of KOROBEINIKI_MELODY) {
      const end = t + dur * SIXTEENTH;
      if (freq > 0) {
        this.scheduleNote(freq, t, end - t - 0.01, 'square', this.melodyGain, 0.7);
      }
      t = end;
    }

    const loopDuration = t - this.ctx.currentTime - 0.05;

    // Schedule bass
    let bt = this.ctx.currentTime + 0.05;
    const bassLoopNotes = [...BASS_LINE];
    // Pad or trim bass to match melody length
    let bassTotal = bassLoopNotes.reduce((s, [, d]) => s + d, 0);
    const melodyTotal = KOROBEINIKI_MELODY.reduce((s, [, d]) => s + d, 0);
    while (bassTotal < melodyTotal) {
      for (const n of BASS_LINE) {
        bassLoopNotes.push(n);
        bassTotal += n[1];
        if (bassTotal >= melodyTotal) break;
      }
    }

    for (const [freq, dur] of bassLoopNotes) {
      if (bt - this.ctx.currentTime > loopDuration + 0.1) break;
      const end = bt + dur * SIXTEENTH;
      if (freq > 0) {
        this.scheduleNote(freq, bt, end - bt - 0.02, 'triangle', this.bassGain, 0.9);
      }
      bt = end;
    }

    // Loop
    this.loopTimeout = setTimeout(() => {
      this.scheduledNodes = [];
      this.scheduleLoop();
    }, loopDuration * 1000 - 100);
  }

  private scheduleNote(
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType,
    dest: AudioNode,
    attack: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(attack, start + 0.005);
    gain.gain.setValueAtTime(attack, start + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(start);
    osc.stop(start + duration + 0.01);

    this.scheduledNodes.push(osc);
  }

  playSfx(type: 'move' | 'rotate' | 'drop' | 'line' | 'tetris' | 'gameover' | 'levelup'): void {
    if (!this.ctx) {
      // Create a temporary context just for SFX if music isn't playing
      const tmpCtx = new AudioContext();
      this.playSfxInCtx(type, tmpCtx, tmpCtx.destination);
      return;
    }
    this.playSfxInCtx(type, this.ctx, this.masterGain ?? this.ctx.destination);
  }

  private playSfxInCtx(type: string, ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;

    const makeOsc = (freq: number, t: number, dur: number, oscType: OscillatorType = 'square', vol = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    };

    switch (type) {
      case 'move':
        makeOsc(220, now, 0.04, 'square', 0.12);
        break;
      case 'rotate':
        makeOsc(330, now, 0.04, 'square', 0.15);
        makeOsc(440, now + 0.02, 0.04, 'square', 0.1);
        break;
      case 'drop':
        makeOsc(150, now, 0.06, 'square', 0.25);
        makeOsc(100, now + 0.04, 0.08, 'square', 0.2);
        break;
      case 'line':
        makeOsc(440, now, 0.08, 'square', 0.3);
        makeOsc(550, now + 0.06, 0.08, 'square', 0.25);
        makeOsc(660, now + 0.12, 0.1, 'square', 0.25);
        break;
      case 'tetris':
        makeOsc(440, now, 0.06, 'square', 0.3);
        makeOsc(550, now + 0.05, 0.06, 'square', 0.3);
        makeOsc(660, now + 0.10, 0.06, 'square', 0.3);
        makeOsc(880, now + 0.15, 0.15, 'square', 0.35);
        break;
      case 'levelup':
        makeOsc(440, now, 0.05, 'square', 0.3);
        makeOsc(550, now + 0.05, 0.05, 'square', 0.3);
        makeOsc(660, now + 0.10, 0.05, 'square', 0.3);
        makeOsc(880, now + 0.15, 0.15, 'square', 0.4);
        makeOsc(1100, now + 0.25, 0.2, 'square', 0.35);
        break;
      case 'gameover':
        makeOsc(440, now, 0.15, 'sawtooth', 0.3);
        makeOsc(330, now + 0.12, 0.15, 'sawtooth', 0.3);
        makeOsc(220, now + 0.24, 0.2, 'sawtooth', 0.3);
        makeOsc(165, now + 0.40, 0.4, 'sawtooth', 0.3);
        break;
    }
  }
}

export const musicEngine = new MusicEngine();
