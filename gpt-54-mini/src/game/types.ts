export type PieceKind = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

export type Rotation = 0 | 1 | 2 | 3;

export interface CellPosition {
  readonly x: number;
  readonly y: number;
}

export interface PieceState {
  readonly kind: PieceKind;
  readonly rotation: Rotation;
  readonly x: number;
  readonly y: number;
}

