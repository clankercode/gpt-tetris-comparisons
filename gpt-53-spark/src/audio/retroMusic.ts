export class RetroMusicPlayer {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private volume = 0.45;
  private readonly stepSpeedMs = 150;
  private readonly pattern: number[] = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 55];

  public start(volume?: number): void {
    if (typeof volume === 'number') {
      this.volume = volume;
    }
    if (this.context) {
      this.context.resume();
      this.startLoop();
      return;
    }
    this.context = new AudioContext();
    const gain = this.context.createGain();
    gain.gain.value = this.volume;
    gain.connect(this.context.destination);
    this.gainNode = gain;
    this.startLoop();
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public close(): void {
    this.stop();
    if (this.context) {
      this.context.close();
    }
    this.context = null;
    this.gainNode = null;
    this.step = 0;
  }

  private startLoop(): void {
    this.stop();
    this.step = 0;
    this.intervalId = setInterval(() => this.playStep(), this.stepSpeedMs);
  }

  private playStep(): void {
    if (!this.context || !this.gainNode) {
      return;
    }
    const note = this.pattern[this.step % this.pattern.length];
    this.step += 1;
    const baseFreq = this.noteToFrequency(note);
    const lead = baseFreq;
    const bass = baseFreq / 2;
    this.playTone(lead, 0.15, 'sawtooth', 0.035);
    this.playTone(bass, 0.2, 'square', 0.02);
  }

  private playTone(freq: number, duration: number, type: OscillatorType, detune = 0): void {
    if (!this.context || !this.gainNode) {
      return;
    }
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const subGain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    subGain.gain.value = 0.08;
    gain.connect(subGain);
    subGain.connect(this.gainNode);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      subGain.disconnect();
    };
  }

  private noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
}
