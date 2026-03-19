export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 640;

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const TILE_SIZE = 28;
export const BOARD_X = 24;
export const BOARD_Y = 48;

export const COLORS = {
  I: 0x00f0f0,
  O: 0xf0f000,
  T: 0xa000f0,
  S: 0x00f000,
  Z: 0xf00000,
  J: 0x0000f0,
  L: 0xf0a000,
  ghost: 0x333333,
  background: 0x0a0a12,
  boardBg: 0x101020,
  gridLine: 0x1a1a2e,
  text: 0xe0e0e0,
  textDim: 0x808080,
  accent: 0xf08000,
};

export const TETROMINOES: Record<string, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

export const KICK_DATA = {
  normal: [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  ],
  I: [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  ],
};

export const LEVEL_SPEEDS = [
  800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
  80, 80, 80, 70, 70, 70, 50, 50, 50, 30,
];

export const SCORE_TABLE = [0, 100, 300, 500, 800];

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  startLevel: number;
  ghostPiece: boolean;
  crtEffect: boolean;
  keyLeft: string;
  keyRight: string;
  keyRotateCW: string;
  keyRotateCCW: string;
  keySoftDrop: string;
  keyHardDrop: string;
  keyHold: string;
  keyPause: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  startLevel: 0,
  ghostPiece: true,
  crtEffect: true,
  keyLeft: 'ArrowLeft',
  keyRight: 'ArrowRight',
  keyRotateCW: 'ArrowUp',
  keyRotateCCW: 'KeyZ',
  keySoftDrop: 'ArrowDown',
  keyHardDrop: 'Space',
  keyHold: 'KeyC',
  keyPause: 'Escape',
};

export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem('tetris-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem('tetris-settings', JSON.stringify(settings));
  } catch {}
}

export interface HighScore {
  name: string;
  score: number;
  level: number;
  lines: number;
  date: string;
}

export function loadHighScores(): HighScore[] {
  try {
    const saved = localStorage.getItem('tetris-highscores');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveHighScores(scores: HighScore[]): void {
  try {
    localStorage.setItem('tetris-highscores', JSON.stringify(scores.slice(0, 10)));
  } catch {}
}
