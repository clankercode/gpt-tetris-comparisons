import { BOARD_WIDTH, TETROMINOES, KICK_DATA, COLORS, type TetrominoType } from '../config';

export { type TetrominoType } from '../config';

export class Tetromino {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;

  constructor(type: TetrominoType) {
    this.type = type;
    this.x = Math.floor((BOARD_WIDTH - this.getSize()) / 2);
    this.y = type === 'I' ? -1 : 0;
    this.rotation = 0;
  }

  getSize(): number {
    return TETROMINOES[this.type]![0]!.length;
  }

  getShape(): number[][] {
    return TETROMINOES[this.type]![this.rotation]!;
  }

  getColor(): number {
    return COLORS[this.type] as number;
  }

  rotate(dir: number): void {
    this.rotation = (this.rotation + dir + 4) % 4;
  }

  getWallKicks(dir: number, fromRotation: number): number[][] {
    const kickTable = this.type === 'I' ? KICK_DATA.I : KICK_DATA.normal;
    const kickIndex = dir === 1 ? fromRotation : (fromRotation + dir + 4) % 4;
    return kickTable![kickIndex]!;
  }

  clone(): Tetromino {
    const t = new Tetromino(this.type);
    t.x = this.x;
    t.y = this.y;
    t.rotation = this.rotation;
    return t;
  }

  getCells(): [number, number][] {
    const cells: [number, number][] = [];
    const shape = this.getShape();
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row]!.length; col++) {
        if (shape[row]![col]) {
          cells.push([this.x + col, this.y + row]);
        }
      }
    }
    return cells;
  }
}
