// Retro Web Audio API Synth
export class Synth {
    ctx: AudioContext;
    masterGain: GainNode;

    constructor() {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.2; // default volume
        this.masterGain.connect(this.ctx.destination);
    }

    setVolume(vol: number) {
        this.masterGain.gain.value = vol;
    }

    playNote(freq: number, type: OscillatorType, duration: number) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMove() {
        this.playNote(220, 'square', 0.1);
    }

    playRotate() {
        this.playNote(440, 'square', 0.1);
    }

    playDrop() {
        this.playNote(110, 'triangle', 0.15);
    }

    playClear() {
        this.playNote(880, 'square', 0.1);
        setTimeout(() => this.playNote(1760, 'square', 0.2), 50);
    }

    playLevelUp() {
        this.playNote(440, 'square', 0.1);
        setTimeout(() => this.playNote(554, 'square', 0.1), 100);
        setTimeout(() => this.playNote(659, 'square', 0.2), 200);
    }

    playGameOver() {
        this.playNote(220, 'sawtooth', 0.5);
        setTimeout(() => this.playNote(196, 'sawtooth', 0.5), 300);
        setTimeout(() => this.playNote(164, 'sawtooth', 1.0), 600);
    }

    playBGM() {
        // Very basic procedural BGM loop.
        const notes = [
            659, 493, 523, 587, 523, 493, 440, 440, 523, 659, 587, 523, 493, 493, 523, 587, 659, 523, 440, 440
        ];
        let idx = 0;
        
        const playNext = () => {
            this.playNote(notes[idx], 'square', 0.2);
            idx = (idx + 1) % notes.length;
            this.bgmTimeout = setTimeout(playNext, 400); // 150 BPM
        };
        playNext();
    }

    stopBGM() {
        if (this.bgmTimeout) {
            clearTimeout(this.bgmTimeout);
        }
    }
    
    bgmTimeout: any;
}

export const audioSynth = new Synth();
