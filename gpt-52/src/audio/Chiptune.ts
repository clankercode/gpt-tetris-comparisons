type SfxName = "move" | "rotate" | "drop" | "lock" | "line" | "tetris" | "level" | "gameover" | "ui";

export class Chiptune {
  private ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private sfx: GainNode;
  private running = false;
  private unlocked = false;

  private tempoBpm = 164;
  private step = 0;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private lookaheadMs = 25;
  private scheduleAheadSec = 0.12;

  private musicOn = true;
  private musicVolume = 0.55;
  private sfxVolume = 0.7;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AnyAudioContext = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.ctx = new AnyAudioContext();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();

    this.master.gain.value = 0.9;
    this.music.gain.value = this.musicVolume;
    this.sfx.gain.value = this.sfxVolume;

    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  attachUnlockOnFirstInput() {
    const unlock = () => {
      void this.ensureUnlocked();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
  }

  async ensureUnlocked() {
    if (this.unlocked) return;
    try {
      await this.ctx.resume();
    } catch {
      // ignore
    }
    this.unlocked = this.ctx.state === "running";
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    this.music.gain.value = this.musicOn ? this.musicVolume : 0;
  }

  setMusicVolume(v: number) {
    this.musicVolume = clamp01(v);
    this.music.gain.value = this.musicOn ? this.musicVolume : 0;
  }

  setSfxVolume(v: number) {
    this.sfxVolume = clamp01(v);
    this.sfx.gain.value = this.sfxVolume;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
  }

  stop() {
    this.running = false;
    if (this.schedulerId != null) window.clearInterval(this.schedulerId);
    this.schedulerId = null;
  }

  playSfx(name: SfxName) {
    const t = this.ctx.currentTime;
    const vol = (g: GainNode, a: number, b: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.005);
      g.gain.exponentialRampToValueAtTime(b, t + 0.15);
    };

    if (name === "move" || name === "ui") {
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(name === "ui" ? 840 : 560, t);
      const g = this.ctx.createGain();
      vol(g, 0.12, 0.0001);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.16);
      return;
    }

    if (name === "rotate") {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(780, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
      const g = this.ctx.createGain();
      vol(g, 0.13, 0.0001);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.12);
      return;
    }

    if (name === "drop" || name === "lock") {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(name === "drop" ? 160 : 120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      const g = this.ctx.createGain();
      vol(g, 0.2, 0.0001);
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(800, t);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.14);
      return;
    }

    if (name === "line" || name === "tetris" || name === "level" || name === "gameover") {
      const notes = {
        line: [76, 79, 83],
        tetris: [79, 83, 88, 91],
        level: [72, 76, 79, 84],
        gameover: [64, 60, 55, 52]
      }[name];
      const base = t;
      for (let i = 0; i < notes.length; i++) {
        const osc = this.ctx.createOscillator();
        osc.type = i % 2 === 0 ? "square" : "triangle";
        osc.frequency.setValueAtTime(midiToHz(notes[i]!), base + i * 0.07);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, base + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.18, base + i * 0.07 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, base + i * 0.07 + 0.12);
        osc.connect(g);
        g.connect(this.sfx);
        osc.start(base + i * 0.07);
        osc.stop(base + i * 0.07 + 0.14);
      }
      return;
    }
  }

  private scheduler() {
    if (!this.running) return;
    const secPerBeat = 60 / this.tempoBpm;
    const secPerStep = secPerBeat / 4; // 16th notes

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.step = (this.step + 1) % 64; // 4 bars of 16ths
      this.nextNoteTime += secPerStep;
    }
  }

  private scheduleStep(step: number, time: number) {
    // Original chiptune with a "falling blocks" vibe (no copyrighted melody).
    const lead = [
      null, 84, null, 83, null, 79, null, 81, //
      null, 83, null, 84, null, 88, null, 86, //
      null, 84, null, 83, null, 79, null, 76, //
      null, 79, null, 81, null, 83, null, 84, //
      null, 83, null, 81, null, 79, null, 76, //
      null, 79, null, 81, null, 83, null, 81, //
      null, 79, null, 76, null, 74, null, 72, //
      null, 74, null, 76, null, 79, null, 81
    ] as Array<number | null>;

    const bass = [
      40, null, null, null, 40, null, null, null, //
      45, null, null, null, 45, null, null, null, //
      43, null, null, null, 43, null, null, null, //
      38, null, null, null, 38, null, null, null, //
      40, null, null, null, 40, null, null, null, //
      45, null, null, null, 45, null, null, null, //
      43, null, null, null, 43, null, null, null, //
      38, null, null, null, 38, null, null, null
    ] as Array<number | null>;

    const hat = step % 4 === 2 || step % 8 === 6;

    const leadNote = lead[step];
    if (leadNote != null) this.pluckSquare(leadNote, time, 0.08, 0.12, 0.15);
    const bassNote = bass[step];
    if (bassNote != null) this.pluckTriangle(bassNote, time, 0.12, 0.1);
    if (hat) this.noiseHat(time, 0.05, 0.06);
  }

  private pluckSquare(midi: number, time: number, dur: number, gain: number, detuneCents: number) {
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = "square";
    oscB.type = "square";
    oscA.frequency.setValueAtTime(midiToHz(midi), time);
    oscB.frequency.setValueAtTime(midiToHz(midi), time);
    oscB.detune.setValueAtTime(detuneCents, time);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(4200, time);
    f.Q.setValueAtTime(0.8, time);

    oscA.connect(f);
    oscB.connect(f);
    f.connect(g);
    g.connect(this.music);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + dur + 0.02);
    oscB.stop(time + dur + 0.02);
  }

  private pluckTriangle(midi: number, time: number, dur: number, gain: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToHz(midi), time);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, time);
    f.Q.setValueAtTime(0.7, time);

    osc.connect(f);
    f.connect(g);
    g.connect(this.music);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private noiseHat(time: number, dur: number, gain: number) {
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.8;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(5000, time);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(hp);
    hp.connect(g);
    g.connect(this.music);
    src.start(time);
    src.stop(time + dur + 0.01);
  }
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

