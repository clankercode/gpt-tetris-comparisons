import { BOARD_WIDTH, BOARD_HEIGHT } from '../config';
import { Tetromino } from './Tetromino';
import type { TetrominoType } from '../config';

export type BoardCell = TetrominoType | null;

export class Board {
  private grid: BoardCell[][];

  constructor() {
    this.grid = [];
    this.clear();
  }

  clear(): void {
    this.grid = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      this.grid.push(new Array<BoardCell>(BOARD_WIDTH).fill(null));
    }
  }

  get(x: number, y: number): BoardCell {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return 'I' as TetrominoType;
    if (y < 0) return null;
    return this.grid[y]![x]!;
  }

  set(x: number, y: number, value: BoardCell): void {
    if (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT) {
      this.grid[y]![x] = value;
    }
  }

  isValidPosition(piece: Tetromino, offsetX = 0, offsetY = 0): boolean {
    const shape = piece.getShape();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row]!.length; col++) {
        if (shape[row]![col]) {
          const x = piece.x + col + offsetX;
          const y = piece.y + row + offsetY;
          if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
          if (y >= 0 && this.grid[y]![x] !== null) return false;
        }
      }
    }
    return true;
  }

  lockPiece(piece: Tetromino): void {
    const shape = piece.getShape();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row]!.length; col++) {
        if (shape[row]![col]) {
          const x = piece.x + col;
          const y = piece.y + row;
          if (y >= 0 && y < BOARD_HEIGHT) {
            this.grid[y]![x] = piece.type;
          }
        }
      }
    }
  }

  clearLines(): number[] {
    const cleared: number[] = [];
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.grid[y]!.every(cell => cell !== null)) {
        cleared.push(y);
      }
    }
    for (const y of cleared) {
      this.grid.splice(y, 1);
      this.grid.unshift(new Array<BoardCell>(BOARD_WIDTH).fill(null));
    }
    return cleared;
  }

  getDropPosition(piece: Tetromino): number {
    let dropY = piece.y;
    while (this.isValidPosition(piece, 0, dropY - piece.y + 1)) {
      dropY++;
    }
    return dropY;
  }

  getGrid(): BoardCell[][] {
    return this.grid;
  }
}
