import Phaser from "phaser";
import "./style.css";

type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type GameMode = "marathon" | "sprint" | "ultra";

type Settings = {
  musicVolume: number;
  sfxVolume: number;
  crtFx: boolean;
};

type PieceState = {
  type: PieceType;
  x: number;
  y: number;
  rot: number;
};

const SCREEN_W = 960;
const SCREEN_H = 720;
const BOARD_COLS = 10;
const BOARD_ROWS_VISIBLE = 20;
const BOARD_ROWS_TOTAL = 22;
const CELL = 28;
const BOARD_X = 236;
const BOARD_Y = 72;
const LINES_FOR_LEVEL = 10;

const SETTINGS_KEY = "retro_tetris_settings_v1";

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.42,
  sfxVolume: 0.65,
  crtFx: true,
};

const COLORS: Record<PieceType, number> = {
  I: 0x47f8ff,
  O: 0xffed5b,
  T: 0xca66ff,
  S: 0x4df487,
  Z: 0xff6d76,
  J: 0x5e85ff,
  L: 0xffb04b,
};

const PIECE_ORDER: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

const SHAPES: Record<PieceType, [number, number][][]> = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
};

const JLSTZ_KICKS: Record<string, [number, number][]> = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};

const I_KICKS: Record<string, [number, number][]> = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

function loadSettings(): Settings {
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      musicVolume: clamp(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume, 0, 1),
      sfxVolume: clamp(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume, 0, 1),
      crtFx: parsed.crtFx ?? DEFAULT_SETTINGS.crtFx,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: Settings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatMode(mode: GameMode): string {
  if (mode === "marathon") return "Marathon";
  if (mode === "sprint") return "Sprint 40L";
  return "Ultra 120s";
}

class RetroAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private beatTimer: number | null = null;
  private noteIndex = 0;
  private readonly melody = [
    76, 71, 72, 74, 72, 71, 69, 69,
    72, 76, 74, 72, 71, 71, 72, 74,
    76, 72, 69, 69, 0, 74, 77, 76,
    74, 72, 71, 72, 74, 76, 72, 69,
  ];
  private readonly bass = [
    52, 52, 52, 52, 50, 50, 50, 50,
    48, 48, 48, 48, 50, 50, 50, 50,
  ];
  private started = false;

  start(settings: Settings): void {
    if (this.started) {
      this.applySettings(settings);
      return;
    }

    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.started = true;
    this.applySettings(settings);
    this.startSequencer();
  }

  applySettings(settings: Settings): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;

    this.master.gain.value = 0.6;
    this.musicGain.gain.value = settings.musicVolume;
    this.sfxGain.gain.value = settings.sfxVolume;
  }

  stop(): void {
    if (this.beatTimer !== null) {
      window.clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.started = false;
  }

  playDrop(): void {
    this.playBeep(220, 0.03, 0.08, "square");
  }

  playMove(): void {
    this.playBeep(350, 0.02, 0.03, "triangle");
  }

  playRotate(): void {
    this.playBeep(420, 0.02, 0.05, "square");
  }

  playLineClear(lines: number): void {
    const base = [560, 660, 760, 960][Math.max(0, Math.min(3, lines - 1))];
    this.playBeep(base, 0.06, 0.12, "square");
    this.playBeep(base * 1.5, 0.08, 0.12, "triangle");
  }

  playGameOver(): void {
    this.playBeep(180, 0.14, 0.25, "sawtooth");
    this.playBeep(150, 0.2, 0.2, "triangle");
  }

  private playBeep(
    freq: number,
    duration: number,
    gainAmount: number,
    wave: OscillatorType,
  ): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainAmount, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private midiToFreq(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  private startSequencer(): void {
    if (!this.ctx || !this.musicGain) return;

    const bpm = 156;
    const beatMs = (60_000 / bpm) / 2;

    this.beatTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;

      const step = this.noteIndex;
      const melodyNote = this.melody[step % this.melody.length];
      const bassNote = this.bass[step % this.bass.length];
      const now = this.ctx.currentTime;

      if (melodyNote > 0) {
        this.playTone(this.midiToFreq(melodyNote), now, 0.19, 0.09, "square");
      }

      this.playTone(this.midiToFreq(bassNote), now, 0.24, 0.055, "triangle");

      if (step % 2 === 0) {
        this.playTone(120, now, 0.02, 0.03, "square");
      }

      this.noteIndex += 1;
    }, beatMs);
  }

  private playTone(
    freq: number,
    start: number,
    duration: number,
    level: number,
    wave: OscillatorType,
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }
}

const audio = new RetroAudio();
let settings = loadSettings();

function withAudioUnlock(scene: Phaser.Scene): void {
  const unlock = () => {
    settings = loadSettings();
    audio.start(settings);
    scene.input.off("pointerdown", unlock);
    scene.input.keyboard?.off("keydown", unlock);
  };

  scene.input.on("pointerdown", unlock);
  scene.input.keyboard?.on("keydown", unlock);
}

class MenuBaseScene extends Phaser.Scene {
  protected titleText!: Phaser.GameObjects.Text;

  createBackground(subtitle: string): void {
    this.cameras.main.setBackgroundColor(0x070514);

    const frame = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, 820, 620, 0x0b1023, 0.8);
    frame.setStrokeStyle(3, 0x31ffd2, 0.85);

    this.add.text(SCREEN_W / 2, 112, "NEON BRICKLINE 1989", {
      fontFamily: "Courier New",
      fontSize: "42px",
      color: "#6ff9ff",
      stroke: "#1b3e75",
      strokeThickness: 6,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: "#73fff4",
        blur: 14,
        fill: true,
      },
    }).setOrigin(0.5);

    this.add.text(SCREEN_W / 2, 164, subtitle, {
      fontFamily: "Courier New",
      fontSize: "20px",
      color: "#ffd476",
    }).setOrigin(0.5);

    this.add.tween({
      targets: frame,
      alpha: { from: 0.75, to: 0.95 },
      duration: 1600,
      yoyo: true,
      loop: -1,
      ease: "Sine.inOut",
    });

    if (settings.crtFx) {
      const g = this.add.graphics();
      g.setAlpha(0.12);
      g.lineStyle(1, 0xffffff, 1);
      for (let y = 40; y < SCREEN_H - 40; y += 4) {
        g.lineBetween(70, y, SCREEN_W - 70, y);
      }
    }

    withAudioUnlock(this);
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("MainMenuScene");
  }
}

class MainMenuScene extends MenuBaseScene {
  private menu: Phaser.GameObjects.Text[] = [];
  private selected = 0;

  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    this.createBackground("Insert Coin. Keep the stack alive.");

    const options = ["New Game", "Settings", "About"];
    options.forEach((label, i) => {
      const txt = this.add.text(SCREEN_W / 2, 250 + i * 62, label, {
        fontFamily: "Courier New",
        fontSize: "34px",
        color: "#99beff",
        stroke: "#0a1235",
        strokeThickness: 4,
      }).setOrigin(0.5);

      txt.setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selected = i;
          this.refreshMenu();
        })
        .on("pointerdown", () => this.activate());

      this.menu.push(txt);
    });

    this.add.text(SCREEN_W / 2, 498,
      "Controls\nArrows Move  Z/X Rotate  C Hold\nDown Soft Drop  Space Hard Drop  P Pause  Esc Menu",
      {
        fontFamily: "Courier New",
        fontSize: "19px",
        color: "#9ce9d8",
        align: "center",
        lineSpacing: 7,
      },
    ).setOrigin(0.5);

    this.add.text(SCREEN_W / 2, 651, "Press Enter", {
      fontFamily: "Courier New",
      fontSize: "19px",
      color: "#f4e08a",
    }).setOrigin(0.5);

    this.input.keyboard?.on("keydown-UP", () => {
      this.selected = (this.selected + this.menu.length - 1) % this.menu.length;
      this.refreshMenu();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-DOWN", () => {
      this.selected = (this.selected + 1) % this.menu.length;
      this.refreshMenu();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-ENTER", () => this.activate());
    this.input.keyboard?.on("keydown-SPACE", () => this.activate());

    this.refreshMenu();
  }

  private refreshMenu(): void {
    this.menu.forEach((txt, i) => {
      txt.setColor(i === this.selected ? "#ffe27f" : "#99beff");
      txt.setScale(i === this.selected ? 1.1 : 1);
    });
  }

  private activate(): void {
    audio.playRotate();
    if (this.selected === 0) this.scene.start("ModeSelectScene");
    if (this.selected === 1) this.scene.start("SettingsScene");
    if (this.selected === 2) this.scene.start("AboutScene");
  }
}

class ModeSelectScene extends MenuBaseScene {
  private menu: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private readonly modes: Array<{ label: string; value: GameMode | "back" }> = [
    { label: "Marathon", value: "marathon" },
    { label: "Sprint (40 lines)", value: "sprint" },
    { label: "Ultra (120 sec)", value: "ultra" },
    { label: "Back", value: "back" },
  ];

  constructor() {
    super("ModeSelectScene");
  }

  create(): void {
    this.createBackground("New Game");

    this.modes.forEach((entry, i) => {
      const txt = this.add.text(SCREEN_W / 2, 270 + i * 60, entry.label, {
        fontFamily: "Courier New",
        fontSize: "32px",
        color: "#99beff",
        stroke: "#0a1235",
        strokeThickness: 4,
      }).setOrigin(0.5);

      txt.setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selected = i;
          this.refresh();
        })
        .on("pointerdown", () => this.activate());

      this.menu.push(txt);
    });

    this.input.keyboard?.on("keydown-UP", () => {
      this.selected = (this.selected + this.menu.length - 1) % this.menu.length;
      this.refresh();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-DOWN", () => {
      this.selected = (this.selected + 1) % this.menu.length;
      this.refresh();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-ENTER", () => this.activate());
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MainMenuScene"));

    this.refresh();
  }

  private refresh(): void {
    this.menu.forEach((txt, i) => {
      txt.setColor(i === this.selected ? "#ffe27f" : "#99beff");
      txt.setScale(i === this.selected ? 1.1 : 1);
    });
  }

  private activate(): void {
    const selected = this.modes[this.selected];
    audio.playRotate();

    if (selected.value === "back") {
      this.scene.start("MainMenuScene");
      return;
    }

    this.scene.start("GameScene", { mode: selected.value });
  }
}

class SettingsScene extends MenuBaseScene {
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("SettingsScene");
  }

  create(): void {
    settings = loadSettings();
    this.createBackground("Settings");

    const desc = this.add.text(SCREEN_W / 2, 222, "Left/Right adjust values, Enter on Back", {
      fontFamily: "Courier New",
      fontSize: "18px",
      color: "#9edff2",
    }).setOrigin(0.5);

    desc.setAlpha(0.9);

    for (let i = 0; i < 4; i += 1) {
      this.rows.push(this.add.text(240, 298 + i * 70, "", {
        fontFamily: "Courier New",
        fontSize: "30px",
        color: "#a9bbff",
        stroke: "#0f1b42",
        strokeThickness: 4,
      }));
    }

    this.input.keyboard?.on("keydown-UP", () => {
      this.selected = (this.selected + 3) % 4;
      this.renderRows();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-DOWN", () => {
      this.selected = (this.selected + 1) % 4;
      this.renderRows();
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.adjust(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.adjust(1));

    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.selected === 3) {
        audio.playRotate();
        this.scene.start("MainMenuScene");
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MainMenuScene"));

    this.renderRows();
  }

  private adjust(dir: -1 | 1): void {
    if (this.selected === 0) {
      settings.musicVolume = clamp(settings.musicVolume + dir * 0.05, 0, 1);
      audio.applySettings(settings);
      audio.playMove();
    }

    if (this.selected === 1) {
      settings.sfxVolume = clamp(settings.sfxVolume + dir * 0.05, 0, 1);
      audio.applySettings(settings);
      audio.playMove();
    }

    if (this.selected === 2 && dir !== 0) {
      settings.crtFx = !settings.crtFx;
      audio.playRotate();
    }

    saveSettings(settings);
    this.renderRows();
  }

  private renderRows(): void {
    const values = [
      `Music Volume: ${(settings.musicVolume * 100).toFixed(0)}%`,
      `SFX Volume: ${(settings.sfxVolume * 100).toFixed(0)}%`,
      `CRT FX: ${settings.crtFx ? "ON" : "OFF"}`,
      "Back",
    ];

    this.rows.forEach((row, i) => {
      row.setText(values[i]);
      row.setColor(i === this.selected ? "#ffe27f" : "#a9bbff");
      row.setScale(i === this.selected ? 1.07 : 1);
    });
  }
}

class AboutScene extends MenuBaseScene {
  constructor() {
    super("AboutScene");
  }

  create(): void {
    this.createBackground("About");

    this.add.text(
      SCREEN_W / 2,
      320,
      [
        "Neon Brickline 1989",
        "A retro-futurist Phaser Tetris clone.",
        "Ruleset: 7-bag, SRS rotation, hold, ghost, hard drop.",
        "Modes: Marathon, Sprint, Ultra.",
        "Music: procedural chiptune generated in-browser.",
        "",
        "Press ESC or ENTER to return.",
      ].join("\n"),
      {
        fontFamily: "Courier New",
        fontSize: "22px",
        color: "#b9dcff",
        align: "center",
        lineSpacing: 7,
      },
    ).setOrigin(0.5);

    this.input.keyboard?.on("keydown-ESC", () => this.scene.start("MainMenuScene"));
    this.input.keyboard?.on("keydown-ENTER", () => this.scene.start("MainMenuScene"));
  }
}

class GameScene extends Phaser.Scene {
  private mode: GameMode = "marathon";
  private board: (PieceType | null)[][] = [];
  private current!: PieceState;
  private hold: PieceType | null = null;
  private holdUsed = false;
  private queue: PieceType[] = [];
  private bag: PieceType[] = [];

  private level = 1;
  private score = 0;
  private lines = 0;
  private combo = -1;
  private backToBack = 0;
  private softDropPoints = 0;

  private lockTime = 0;
  private fallAccumulator = 0;

  private ultraMs = 120_000;
  private sprintTarget = 40;

  private gameOver = false;
  private paused = false;

  private pendingClearRows: number[] = [];
  private clearDelayMs = 0;
  private flashMs = 0;

  private graphics!: Phaser.GameObjects.Graphics;
  private sideText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private overlayText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  init(data: { mode?: GameMode }): void {
    if (data.mode) this.mode = data.mode;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x040410);
    withAudioUnlock(this);

    this.board = Array.from({ length: BOARD_ROWS_TOTAL }, () => Array.from({ length: BOARD_COLS }, () => null));
    this.queue = [];
    this.bag = [];
    this.hold = null;
    this.holdUsed = false;

    this.level = 1;
    this.score = 0;
    this.lines = 0;
    this.combo = -1;
    this.backToBack = 0;
    this.softDropPoints = 0;

    this.lockTime = 0;
    this.fallAccumulator = 0;

    this.ultraMs = 120_000;
    this.gameOver = false;
    this.paused = false;

    this.pendingClearRows = [];
    this.clearDelayMs = 0;
    this.flashMs = 0;

    this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x08112f, 0.65);
    this.add.rectangle(BOARD_X + BOARD_COLS * CELL * 0.5, BOARD_Y + BOARD_ROWS_VISIBLE * CELL * 0.5, BOARD_COLS * CELL + 20, BOARD_ROWS_VISIBLE * CELL + 20, 0x0b1128, 0.95)
      .setStrokeStyle(3, 0x47f8ff, 0.85);

    if (settings.crtFx) {
      const scan = this.add.graphics();
      scan.lineStyle(1, 0xffffff, 0.1);
      for (let y = 42; y < SCREEN_H - 42; y += 3) {
        scan.lineBetween(58, y, SCREEN_W - 58, y);
      }
    }

    this.graphics = this.add.graphics();

    this.sideText = this.add.text(572, 98, "", {
      fontFamily: "Courier New",
      fontSize: "24px",
      color: "#cdf1ff",
      lineSpacing: 10,
    });

    this.statusText = this.add.text(572, 520, "", {
      fontFamily: "Courier New",
      fontSize: "20px",
      color: "#f6dca3",
      lineSpacing: 8,
    });

    this.overlayText = this.add.text(SCREEN_W / 2, SCREEN_H / 2, "", {
      fontFamily: "Courier New",
      fontSize: "42px",
      color: "#ffe27f",
      align: "center",
      stroke: "#111111",
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10);

    this.input.keyboard?.on("keydown-LEFT", () => this.tryMove(-1, 0));
    this.input.keyboard?.on("keydown-RIGHT", () => this.tryMove(1, 0));
    this.input.keyboard?.on("keydown-DOWN", () => this.softDrop());
    this.input.keyboard?.on("keydown-Z", () => this.rotate(-1));
    this.input.keyboard?.on("keydown-X", () => this.rotate(1));
    this.input.keyboard?.on("keydown-UP", () => this.rotate(1));
    this.input.keyboard?.on("keydown-C", () => this.holdSwap());
    this.input.keyboard?.on("keydown-SPACE", () => this.hardDrop());

    this.input.keyboard?.on("keydown-P", () => {
      if (this.gameOver) return;
      this.paused = !this.paused;
      this.overlayText.setText(this.paused ? "PAUSED\nPress P" : "");
      audio.playMove();
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("MainMenuScene");
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.gameOver) this.scene.start("MainMenuScene");
    });

    this.fillQueue();
    this.current = this.takePiece();
    this.draw();
  }

  update(_: number, delta: number): void {
    if (this.gameOver || this.paused) {
      return;
    }

    if (this.mode === "ultra") {
      this.ultraMs -= delta;
      if (this.ultraMs <= 0) {
        this.ultraMs = 0;
        this.finishGame("Time Up");
      }
    }

    if (this.clearDelayMs > 0) {
      this.clearDelayMs -= delta;
      this.flashMs += delta;
      if (this.clearDelayMs <= 0) {
        this.commitClearRows();
      }
      this.draw();
      return;
    }

    const levelSpeed = Math.max(70, 900 - (this.level - 1) * 65);
    this.fallAccumulator += delta;

    while (this.fallAccumulator >= levelSpeed) {
      this.fallAccumulator -= levelSpeed;
      if (!this.tryMove(0, 1, false)) {
        this.lockTime += levelSpeed;
        if (this.lockTime >= 500) {
          this.lockPiece();
          break;
        }
      } else {
        this.lockTime = 0;
      }
    }

    this.draw();
  }

  private tryMove(dx: number, dy: number, playSfx = true): boolean {
    if (this.gameOver || this.paused || this.clearDelayMs > 0) return false;

    const next: PieceState = {
      ...this.current,
      x: this.current.x + dx,
      y: this.current.y + dy,
    };

    if (this.isValid(next)) {
      this.current = next;
      if (dx !== 0 && playSfx) audio.playMove();
      if (dy > 0 && playSfx) this.softDropPoints += dy;
      if (dy === 0) this.lockTime = 0;
      return true;
    }

    return false;
  }

  private softDrop(): void {
    if (this.tryMove(0, 1, false)) {
      this.score += 1;
    }
  }

  private hardDrop(): void {
    if (this.gameOver || this.paused || this.clearDelayMs > 0) return;

    let distance = 0;
    while (this.tryMove(0, 1, false)) {
      distance += 1;
    }

    this.score += distance * 2;
    this.lockPiece();
    audio.playDrop();
  }

  private rotate(dir: -1 | 1): void {
    if (this.gameOver || this.paused || this.clearDelayMs > 0) return;

    const from = this.current.rot;
    const to = (from + dir + 4) % 4;
    const key = `${from}>${to}`;
    const table = this.current.type === "I" ? I_KICKS : JLSTZ_KICKS;
    const kicks = this.current.type === "O" ? [[0, 0]] : (table[key] ?? [[0, 0]]);

    for (const [kx, ky] of kicks) {
      const trial: PieceState = {
        ...this.current,
        rot: to,
        x: this.current.x + kx,
        y: this.current.y - ky,
      };
      if (this.isValid(trial)) {
        this.current = trial;
        this.lockTime = 0;
        audio.playRotate();
        return;
      }
    }
  }

  private holdSwap(): void {
    if (this.holdUsed || this.gameOver || this.paused || this.clearDelayMs > 0) return;

    audio.playMove();
    const curType = this.current.type;

    if (this.hold === null) {
      this.hold = curType;
      this.current = this.takePiece();
    } else {
      const swapped = this.hold;
      this.hold = curType;
      this.current = this.makeSpawn(swapped);
      if (!this.isValid(this.current)) {
        this.finishGame("Top Out");
        return;
      }
    }

    this.holdUsed = true;
  }

  private lockPiece(): void {
    for (const [x, y] of this.getCells(this.current)) {
      if (y < 0) {
        this.finishGame("Top Out");
        return;
      }
      this.board[y][x] = this.current.type;
    }

    const rows: number[] = [];
    for (let y = 0; y < BOARD_ROWS_TOTAL; y += 1) {
      if (this.board[y].every((c) => c !== null)) {
        rows.push(y);
      }
    }

    if (rows.length > 0) {
      this.pendingClearRows = rows;
      this.clearDelayMs = 190;
      this.flashMs = 0;
      audio.playLineClear(rows.length);
      this.applyScoring(rows.length);
    } else {
      this.combo = -1;
      this.backToBack = 0;
      this.spawnNextPiece();
    }

    this.lockTime = 0;
  }

  private applyScoring(linesCleared: number): void {
    const base = [0, 100, 300, 500, 800][linesCleared] || 0;
    let gained = base * this.level;

    const isTetris = linesCleared === 4;
    if (isTetris) {
      if (this.backToBack > 0) {
        gained = Math.round(gained * 1.5);
      }
      this.backToBack += 1;
    } else {
      this.backToBack = 0;
    }

    this.combo += 1;
    if (this.combo > 0) {
      gained += this.combo * 40 * this.level;
    }

    this.lines += linesCleared;
    this.score += gained + this.softDropPoints;
    this.softDropPoints = 0;

    this.level = 1 + Math.floor(this.lines / LINES_FOR_LEVEL);

    if (this.mode === "sprint" && this.lines >= this.sprintTarget) {
      this.finishGame("Sprint Clear");
    }
  }

  private commitClearRows(): void {
    const rows = [...this.pendingClearRows].sort((a, b) => a - b);
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      this.board.splice(rows[i], 1);
    }
    while (this.board.length < BOARD_ROWS_TOTAL) {
      this.board.unshift(Array.from({ length: BOARD_COLS }, () => null));
    }

    this.pendingClearRows = [];
    this.clearDelayMs = 0;
    this.flashMs = 0;

    this.spawnNextPiece();
  }

  private spawnNextPiece(): void {
    this.holdUsed = false;
    this.current = this.takePiece();
    if (!this.isValid(this.current)) {
      this.finishGame("Top Out");
    }
  }

  private finishGame(reason: string): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.overlayText.setText(`${reason}\nScore ${this.score}\nPress Enter`);
    audio.playGameOver();
  }

  private takePiece(): PieceState {
    this.fillQueue();
    const next = this.queue.shift() as PieceType;
    this.fillQueue();
    return this.makeSpawn(next);
  }

  private fillQueue(): void {
    while (this.queue.length < 5) {
      if (this.bag.length === 0) {
        this.bag = Phaser.Utils.Array.Shuffle([...PIECE_ORDER]);
      }
      this.queue.push(this.bag.shift() as PieceType);
    }
  }

  private makeSpawn(type: PieceType): PieceState {
    return {
      type,
      x: 3,
      y: 0,
      rot: 0,
    };
  }

  private isValid(piece: PieceState): boolean {
    for (const [x, y] of this.getCells(piece)) {
      if (x < 0 || x >= BOARD_COLS) return false;
      if (y >= BOARD_ROWS_TOTAL) return false;
      if (y >= 0 && this.board[y][x] !== null) return false;
    }
    return true;
  }

  private getCells(piece: PieceState): [number, number][] {
    const rel = SHAPES[piece.type][piece.rot];
    return rel.map(([x, y]) => [x + piece.x, y + piece.y]);
  }

  private getGhostPiece(): PieceState {
    const ghost: PieceState = { ...this.current };
    while (this.isValid({ ...ghost, y: ghost.y + 1 })) {
      ghost.y += 1;
    }
    return ghost;
  }

  private drawBlock(x: number, y: number, color: number, alpha = 1): void {
    const px = BOARD_X + x * CELL;
    const py = BOARD_Y + (y - 2) * CELL;

    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRoundedRect(px + 1, py + 1, CELL - 2, CELL - 2, 4);
    this.graphics.fillStyle(0xffffff, alpha * 0.2);
    this.graphics.fillRect(px + 3, py + 3, CELL - 10, 5);
  }

  private draw(): void {
    this.graphics.clear();

    this.graphics.fillStyle(0x020512, 0.45);
    this.graphics.fillRect(BOARD_X, BOARD_Y, BOARD_COLS * CELL, BOARD_ROWS_VISIBLE * CELL);

    for (let y = 2; y < BOARD_ROWS_TOTAL; y += 1) {
      for (let x = 0; x < BOARD_COLS; x += 1) {
        const cell = this.board[y][x];
        if (cell) {
          this.drawBlock(x, y, COLORS[cell]);
        }
      }
    }

    const ghost = this.getGhostPiece();
    for (const [x, y] of this.getCells(ghost)) {
      if (y >= 2) {
        this.drawBlock(x, y, COLORS[this.current.type], 0.28);
      }
    }

    for (const [x, y] of this.getCells(this.current)) {
      if (y >= 2) {
        this.drawBlock(x, y, COLORS[this.current.type]);
      }
    }

    if (this.pendingClearRows.length > 0) {
      const flash = 0.25 + 0.55 * Math.abs(Math.sin(this.flashMs * 0.035));
      this.graphics.fillStyle(0xffffff, flash);
      for (const row of this.pendingClearRows) {
        const py = BOARD_Y + (row - 2) * CELL;
        this.graphics.fillRect(BOARD_X + 1, py + 1, BOARD_COLS * CELL - 2, CELL - 2);
      }
      this.cameras.main.shake(30, 0.0018);
    }

    this.sideText.setText([
      `Mode: ${formatMode(this.mode)}`,
      `Score: ${this.score}`,
      `Level: ${this.level}`,
      `Lines: ${this.lines}`,
      this.mode === "sprint" ? `To Goal: ${Math.max(0, this.sprintTarget - this.lines)}` : "",
      this.mode === "ultra" ? `Time: ${(this.ultraMs / 1000).toFixed(1)}s` : "",
      "",
      `Hold: ${this.hold ?? "-"}`,
      `Next: ${this.queue.slice(0, 4).join("  ")}`,
    ].join("\n"));

    this.statusText.setText(
      "Z/X Rotate  C Hold\nArrows Move  Space Drop\nP Pause  Esc Menu",
    );
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_W,
  height: SCREEN_H,
  parent: "app",
  backgroundColor: "#05020d",
  scene: [BootScene, MainMenuScene, ModeSelectScene, SettingsScene, AboutScene, GameScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};

new Phaser.Game(config);
