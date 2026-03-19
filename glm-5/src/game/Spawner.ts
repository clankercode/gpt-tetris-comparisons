import { Tetromino } from './Tetromino';
import { TETROMINOES, type TetrominoType } from '../config';

export class Spawner {
  private bag: TetrominoType[] = [];
  private nextPieces: TetrominoType[] = [];
  private previewCount: number;

  constructor(previewCount = 3) {
    this.previewCount = previewCount;
    for (let i = 0; i < previewCount + 1; i++) {
      this.nextPieces.push(this.getNextFromBag());
    }
  }

  private shuffleBag(): void {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = types[i]!;
      types[i] = types[j]!;
      types[j] = temp;
    }
    this.bag = types;
  }

  private getNextFromBag(): TetrominoType {
    if (this.bag.length === 0) {
      this.shuffleBag();
    }
    return this.bag.pop()!;
  }

  spawn(): Tetromino {
    const type = this.nextPieces.shift()!;
    this.nextPieces.push(this.getNextFromBag());
    return new Tetromino(type);
  }

  getNext(): TetrominoType[] {
    return [...this.nextPieces];
  }

  peekNext(): TetrominoType {
    return this.nextPieces[0]!;
  }
}
