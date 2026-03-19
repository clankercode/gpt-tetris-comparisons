import type { Cell, TetrominoType } from "./types";

export const BOARD_W = 10;
export const BOARD_H = 22; // includes 2 hidden rows
export const VISIBLE_Y = 2;
export const VISIBLE_H = 20;

export class Board {
  grid: Array<Cell | null>;

  constructor() {
    this.grid = new Array<Cell | null>(BOARD_W * BOARD_H).fill(null);
  }

  get(x: number, y: number): Cell | null {
    if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return null;
    return this.grid[y * BOARD_W + x] ?? null;
  }

  set(x: number, y: number, v: Cell | null) {
    if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return;
    this.grid[y * BOARD_W + x] = v;
  }

  clear() {
    this.grid.fill(null);
  }

  isRowFull(y: number): boolean {
    for (let x = 0; x < BOARD_W; x++) {
      if (!this.get(x, y)) return false;
    }
    return true;
  }

  clearFullRows(): { cleared: number; rows: number[] } {
    const clearedRows: number[] = [];

    // Compact from bottom up (stable for multi-line clears).
    let writeY = BOARD_H - 1;
    for (let y = BOARD_H - 1; y >= 0; y--) {
      if (this.isRowFull(y)) {
        clearedRows.push(y);
        continue;
      }
      if (writeY !== y) {
        for (let x = 0; x < BOARD_W; x++) this.set(x, writeY, this.get(x, y));
      }
      writeY--;
    }
    for (let y = writeY; y >= 0; y--) for (let x = 0; x < BOARD_W; x++) this.set(x, y, null);

    return { cleared: clearedRows.length, rows: clearedRows };
  }

  topOut(): boolean {
    // Any blocks in the hidden area means game over after lock.
    for (let y = 0; y < VISIBLE_Y; y++) {
      for (let x = 0; x < BOARD_W; x++) if (this.get(x, y)) return true;
    }
    return false;
  }

  countLockedType(type: TetrominoType): number {
    let n = 0;
    for (const c of this.grid) if (c?.type === type) n++;
    return n;
  }
}
