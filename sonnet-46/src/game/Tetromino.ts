/**
 * Tetromino definitions — shapes, colors, rotation states.
 * Uses the standard Super Rotation System (SRS).
 */

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Each rotation state is an array of [row, col] offsets from pivot
export interface TetrominoDef {
  type: TetrominoType;
  color: number;       // Phaser hex color
  glowColor: number;   // Brighter glow tint
  rotations: number[][][]; // [rotation][cell][row, col]
}

// Standard SRS rotations — represented as cell [row,col] relative to pivot
export const TETROMINOES: Record<TetrominoType, TetrominoDef> = {
  I: {
    type: 'I',
    color: 0x00f0f0,
    glowColor: 0x88ffff,
    rotations: [
      [[-1,0],[-1,1],[-1,2],[-1,3]],  // spawn above row 0
      [[0,2],[1,2],[2,2],[3,2]],       // 90°
      [[1,0],[1,1],[1,2],[1,3]],       // 180°
      [[0,1],[1,1],[2,1],[3,1]],       // 270°
    ],
  },
  O: {
    type: 'O',
    color: 0xf0f000,
    glowColor: 0xffff88,
    rotations: [
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]],
    ],
  },
  T: {
    type: 'T',
    color: 0xa000f0,
    glowColor: 0xcc88ff,
    rotations: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,0],[1,1],[2,1]],
    ],
  },
  S: {
    type: 'S',
    color: 0x00f000,
    glowColor: 0x88ff88,
    rotations: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,1],[1,2],[2,0],[2,1]],
      [[0,0],[1,0],[1,1],[2,1]],
    ],
  },
  Z: {
    type: 'Z',
    color: 0xf00000,
    glowColor: 0xff8888,
    rotations: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,2],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
  },
  J: {
    type: 'J',
    color: 0x0000f0,
    glowColor: 0x8888ff,
    rotations: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,0],[2,1]],
    ],
  },
  L: {
    type: 'L',
    color: 0xf0a000,
    glowColor: 0xffcc88,
    rotations: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[1,2],[2,0]],
      [[0,0],[0,1],[1,1],[2,1]],
    ],
  },
};

export const TETROMINO_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/**
 * 7-bag randomizer — ensures each piece type appears once per bag.
 */
export class PieceBag {
  private bag: TetrominoType[] = [];

  next(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  peek(count: number): TetrominoType[] {
    while (this.bag.length < count) this.refill();
    // peek from the end (next pieces)
    return this.bag.slice(-count).reverse();
  }

  private refill(): void {
    const newBag = [...TETROMINO_TYPES];
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    this.bag.unshift(...newBag);
  }
}

export class ActivePiece {
  type: TetrominoType;
  rotation: number = 0;
  row: number;
  col: number;
  def: TetrominoDef;

  constructor(type: TetrominoType, startRow = 0, startCol = 3) {
    this.type = type;
    this.def = TETROMINOES[type];
    this.row = startRow;
    this.col = startCol;
  }

  get cells(): Array<[number, number]> {
    return this.def.rotations[this.rotation].map(
      ([r, c]) => [this.row + r, this.col + c]
    );
  }

  clone(): ActivePiece {
    const p = new ActivePiece(this.type, this.row, this.col);
    p.rotation = this.rotation;
    return p;
  }
}

// SRS wall kick data
// Offsets to try when rotating (source_rotation -> target_rotation)
export const SRS_KICKS: Record<string, Array<[number, number]>> = {
  // J, L, S, T, Z pieces
  '0->1': [[0,0],[-1,0],[-1,1],[2,0],[2,1]],
  '1->0': [[0,0],[1,0],[1,-1],[-2,0],[-2,-1]],
  '1->2': [[0,0],[1,0],[1,-1],[-2,0],[-2,-1]],
  '2->1': [[0,0],[-1,0],[-1,1],[2,0],[2,1]],
  '2->3': [[0,0],[1,0],[1,1],[-2,0],[-2,1]],
  '3->2': [[0,0],[-1,0],[-1,-1],[2,0],[2,-1]],
  '3->0': [[0,0],[-1,0],[-1,-1],[2,0],[2,-1]],
  '0->3': [[0,0],[1,0],[1,1],[-2,0],[-2,1]],
};

export const SRS_KICKS_I: Record<string, Array<[number, number]>> = {
  '0->1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1->0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1->2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2->1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2->3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3->2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3->0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0->3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};
