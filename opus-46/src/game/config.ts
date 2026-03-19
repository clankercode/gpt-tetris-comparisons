import type { PieceType, ShapeMatrix, Settings, MusicTheme } from "./types";

// ── Board dimensions ──────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2; // rows above visible area
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

// ── Cell size in pixels ───────────────────────────────────────────
export const CELL_SIZE = 28;

// ── Game canvas dimensions ────────────────────────────────────────
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 640;

// ── Board offset (where the board is drawn) ───────────────────────
export const BOARD_X = 24;
export const BOARD_Y = 40;

// ── Tetromino shapes (rotation 0) ─────────────────────────────────
export const SHAPES: Record<PieceType, ShapeMatrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// ── SRS Wall Kick Data ────────────────────────────────────────────
// [rotation_from][rotation_to] => array of (dx, dy) offsets to try
type KickTable = Record<string, [number, number][]>;

export const WALL_KICKS: KickTable = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

export const WALL_KICKS_I: KickTable = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// ── Colors ────────────────────────────────────────────────────────
export const PIECE_COLORS: Record<PieceType, number> = {
  I: 0x00ffff, // cyan
  O: 0xffff00, // yellow
  T: 0xaa00ff, // purple
  S: 0x00ff66, // green
  Z: 0xff3333, // red
  J: 0x3366ff, // blue
  L: 0xff8800, // orange
};

export const PIECE_GLOW_COLORS: Record<PieceType, number> = {
  I: 0x66ffff,
  O: 0xffff88,
  T: 0xcc66ff,
  S: 0x66ff99,
  Z: 0xff7777,
  J: 0x6699ff,
  L: 0xffaa44,
};

// ── Background / UI colors ────────────────────────────────────────
export const BG_COLOR = 0x0a0a12;
export const BOARD_BG_COLOR = 0x0f0f1a;
export const GRID_COLOR = 0x1a1a2e;
export const TEXT_COLOR = "#00ff88";
export const TEXT_COLOR_DIM = "#007744";
export const TEXT_COLOR_BRIGHT = "#44ffaa";
export const TITLE_COLOR = "#00ffcc";
export const ACCENT_COLOR = "#ff6600";

// ── Gravity speeds (frames at 60fps per cell drop) ────────────────
// Index = level, value = milliseconds per drop
export const GRAVITY_SPEEDS: number[] = [
  800, 720, 630, 550, 470, 380, 300, 220, 150, 100,
  80, 70, 60, 50, 40, 33, 28, 22, 17, 13,
  10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
];

// ── Lock delay ────────────────────────────────────────────────────
export const LOCK_DELAY = 500; // ms
export const MAX_LOCK_RESETS = 15;

// ── Scoring (NES-style) ──────────────────────────────────────────
export const LINE_SCORES = [0, 40, 100, 300, 1200];
export const SOFT_DROP_SCORE = 1;  // per cell
export const HARD_DROP_SCORE = 2;  // per cell

// ── Lines per level ──────────────────────────────────────────────
export const LINES_PER_LEVEL = 10;

// ── DAS (Delayed Auto Shift) ─────────────────────────────────────
export const DAS_DELAY = 170;  // ms before auto-repeat starts
export const DAS_RATE = 50;    // ms between auto-repeat moves

// ── Default settings ─────────────────────────────────────────────
export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  crtEffect: true,
  screenShake: true,
};

// ── Music themes ─────────────────────────────────────────────────
// MIDI note numbers. Rests encoded as 0.
export const MUSIC_THEMES: MusicTheme[] = [
  {
    name: "Type A",
    bpm: 140,
    lead: [
      76, 71, 72, 74, 72, 71, 69, 69, 72, 76, 74, 72,
      71, 71, 72, 74, 76, 72, 69, 69, 0, 0,
      74, 74, 77, 81, 79, 77, 76, 72, 76, 74, 72,
      71, 71, 72, 74, 76, 72, 69, 69, 0, 0,
    ],
    bass: [
      52, 0, 57, 0, 55, 0, 53, 0, 52, 0, 57, 0,
      55, 0, 53, 0, 52, 0, 57, 0, 55, 0,
      53, 0, 57, 0, 60, 0, 57, 0, 55, 0,
      52, 0, 57, 0, 55, 0, 53, 0, 52, 0,
    ],
  },
  {
    name: "Pulse Wave",
    bpm: 150,
    lead: [
      72, 72, 0, 67, 69, 0, 72, 74, 76, 74, 72, 0,
      69, 67, 0, 64, 67, 69, 72, 0, 0, 0,
      76, 74, 72, 0, 69, 72, 74, 0, 76, 79, 77, 76,
      74, 72, 0, 69, 67, 0, 64, 0, 0, 0,
    ],
    bass: [
      48, 0, 55, 0, 52, 0, 48, 0, 53, 0, 57, 0,
      55, 0, 52, 0, 48, 0, 55, 0, 52, 0,
      48, 0, 53, 0, 57, 0, 55, 0, 52, 0,
      48, 0, 55, 0, 52, 0, 48, 0, 0, 0,
    ],
  },
  {
    name: "Night Mode",
    bpm: 120,
    lead: [
      64, 0, 67, 0, 71, 0, 72, 0, 71, 0, 67, 0,
      64, 0, 0, 0, 62, 0, 64, 0, 67, 0,
      69, 0, 71, 0, 72, 0, 74, 0, 72, 0,
      71, 0, 69, 0, 67, 0, 64, 0, 0, 0,
    ],
    bass: [
      40, 0, 0, 0, 47, 0, 0, 0, 45, 0, 0, 0,
      43, 0, 0, 0, 40, 0, 0, 0, 47, 0,
      0, 0, 45, 0, 0, 0, 43, 0, 0, 0,
      40, 0, 0, 0, 47, 0, 0, 0, 45, 0,
    ],
  },
];

// ── Piece order for bag randomizer ───────────────────────────────
export const ALL_PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
