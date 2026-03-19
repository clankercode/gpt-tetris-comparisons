export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

export type PaletteKey = "aurora" | "sunset" | "mono";
export type MusicThemeKey = "type_a" | "laser" | "night_drive";

export interface GameOptions {
  startLevel: number;
  musicTheme: MusicThemeKey;
  palette: PaletteKey;
}

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  crtIntensity: number;
  screenShake: boolean;
}

export interface ActivePiece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

export interface LockResult {
  clearedRows: number[];
  clearType: "none" | "single" | "double" | "triple" | "tetris";
}

export interface TetrisState {
  board: (PieceType | null)[][];
  active: ActivePiece;
  queue: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  gameOver: boolean;
  lockResult: LockResult;
}
