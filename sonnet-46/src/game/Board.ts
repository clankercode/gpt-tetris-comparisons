/**
 * Board — 10×20 Tetris grid with collision detection and line clearing.
 */

import { ActivePiece, SRS_KICKS, SRS_KICKS_I } from './Tetromino';

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
// Extra rows above visible area for spawning
export const BOARD_BUFFER = 2;
export const TOTAL_ROWS = BOARD_ROWS + BOARD_BUFFER;

// 0 = empty, otherwise = color index
export type Cell = number;

export interface LineClearResult {
  linesCleared: number;
  clearedRows: number[];
}

export class Board {
  // grid[row][col], row 0 = top visible, row 19 = bottom
  // Internal rows 0..1 are buffer (above visible)
  private grid: Cell[][];

  constructor() {
    this.grid = this.makeEmpty();
  }

  private makeEmpty(): Cell[][] {
    return Array.from({ length: TOTAL_ROWS }, () => new Array(BOARD_COLS).fill(0));
  }

  reset(): void {
    this.grid = this.makeEmpty();
  }

  getCell(row: number, col: number): Cell {
    if (row < 0 || row >= TOTAL_ROWS || col < 0 || col >= BOARD_COLS) return -1;
    return this.grid[row][col];
  }

  /** row/col are in "visible" coordinates (0 = first visible row) */
  getVisibleCell(row: number, col: number): Cell {
    return this.getCell(row + BOARD_BUFFER, col);
  }

  isValidPosition(piece: ActivePiece): boolean {
    for (const [r, c] of piece.cells) {
      const gr = r + BOARD_BUFFER;
      if (c < 0 || c >= BOARD_COLS) return false;
      if (gr >= TOTAL_ROWS) return false;
      if (gr >= 0 && this.grid[gr][c] !== 0) return false;
    }
    return true;
  }

  placePiece(piece: ActivePiece, colorIndex: number): void {
    for (const [r, c] of piece.cells) {
      const gr = r + BOARD_BUFFER;
      if (gr >= 0 && gr < TOTAL_ROWS && c >= 0 && c < BOARD_COLS) {
        this.grid[gr][c] = colorIndex;
      }
    }
  }

  clearLines(): LineClearResult {
    const clearedRows: number[] = [];

    for (let gr = TOTAL_ROWS - 1; gr >= 0; gr--) {
      if (this.grid[gr].every(cell => cell !== 0)) {
        clearedRows.push(gr - BOARD_BUFFER); // visible row index
      }
    }

    if (clearedRows.length === 0) return { linesCleared: 0, clearedRows: [] };

    // Remove full rows and prepend empty rows
    const gridRows = clearedRows.map(r => r + BOARD_BUFFER);
    this.grid = this.grid.filter((_, i) => !gridRows.includes(i));
    while (this.grid.length < TOTAL_ROWS) {
      this.grid.unshift(new Array(BOARD_COLS).fill(0));
    }

    return { linesCleared: clearedRows.length, clearedRows };
  }

  /** Try to rotate piece using SRS wall kicks. Returns kicked piece or null. */
  tryRotate(piece: ActivePiece, dir: 1 | -1): ActivePiece | null {
    const newRot = ((piece.rotation + dir) + 4) % 4 as 0 | 1 | 2 | 3;
    const key = `${piece.rotation}->${newRot}`;
    const kicks = piece.type === 'I' ? SRS_KICKS_I : SRS_KICKS;
    const offsets = kicks[key] ?? [[0,0]];

    for (const [dr, dc] of offsets) {
      const test = piece.clone();
      test.rotation = newRot;
      test.row += dr;
      test.col += dc;
      if (this.isValidPosition(test)) return test;
    }
    return null;
  }

  /** Hard drop — move piece down until it can't. Returns drop distance. */
  hardDrop(piece: ActivePiece): number {
    let dist = 0;
    while (true) {
      const next = piece.clone();
      next.row += 1;
      if (!this.isValidPosition(next)) break;
      piece.row += 1;
      dist++;
    }
    return dist;
  }

  /** Ghost piece position */
  getGhostPiece(piece: ActivePiece): ActivePiece {
    const ghost = piece.clone();
    this.hardDrop(ghost);
    return ghost;
  }

  /** Check if piece can move in direction */
  canMove(piece: ActivePiece, dr: number, dc: number): boolean {
    const test = piece.clone();
    test.row += dr;
    test.col += dc;
    return this.isValidPosition(test);
  }

  /** Is the board in game-over state (any cell in the buffer rows)? */
  isTopOut(): boolean {
    for (let gr = 0; gr < BOARD_BUFFER; gr++) {
      if (this.grid[gr].some(c => c !== 0)) return true;
    }
    return false;
  }

  /** Returns a snapshot of the visible grid */
  getVisibleGrid(): Cell[][] {
    return this.grid.slice(BOARD_BUFFER).map(row => [...row]);
  }

  /** For effects: get all cells in a specific visible row */
  getRow(visibleRow: number): Cell[] {
    return [...this.grid[visibleRow + BOARD_BUFFER]];
  }
}
