/** Tetromino piece type identifiers */
export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/** A 2D shape matrix: 1 = filled, 0 = empty */
export type ShapeMatrix = number[][];

/** Position on the board */
export interface Position {
  x: number;
  y: number;
}

/** An active piece on the board */
export interface Piece {
  type: PieceType;
  shape: ShapeMatrix;
  pos: Position;
  rotation: number; // 0-3
}

/** A single cell on the board (null = empty) */
export type Cell = PieceType | null;

/** The game board grid */
export type Board = Cell[][];

/** Game state */
export interface GameState {
  board: Board;
  current: Piece | null;
  held: PieceType | null;
  canHold: boolean;
  nextQueue: PieceType[];
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  bag: PieceType[];
}

/** Settings persisted to localStorage */
export interface Settings {
  masterVolume: number;  // 0-1
  musicVolume: number;   // 0-1
  sfxVolume: number;     // 0-1
  crtEffect: boolean;
  screenShake: boolean;
}

/** Options chosen for a new game */
export interface GameOptions {
  startLevel: number;
  musicTheme: number; // index into MUSIC_THEMES
}

/** Music theme definition */
export interface MusicTheme {
  name: string;
  bpm: number;
  lead: number[];  // MIDI note numbers
  bass: number[];
}
