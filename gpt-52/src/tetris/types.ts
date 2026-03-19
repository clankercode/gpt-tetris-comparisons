export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type Rotation = 0 | 1 | 2 | 3;

export type Vec = { x: number; y: number };

export type Cell = {
  type: TetrominoType;
  lockId: number;
};

