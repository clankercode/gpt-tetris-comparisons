export type TetrominoId = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface PieceState {
  id: TetrominoId;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

const WIDTH = 10;
const HEIGHT = 20;
const TETROMINOES: TetrominoId[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
const SPAWN_X = 3;
const SPAWN_Y = 0;

const WALL_KICK_GENERIC: [number, number][] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
  [2, 0],
  [-2, 0],
  [1, -1],
  [-1, -1]
];

const WALL_KICK_I: [number, number][] = [
  [0, 0],
  [ -2, 0],
  [2, 0],
  [ -2, -1],
  [1, -1],
  [ -2, 1],
  [2, 1]
];

export const TETROMINO_SHAPES: Record<TetrominoId, [number, number][][]> = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1]
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3]
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3]
    ]
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2]
    ]
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2]
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2]
    ]
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ]
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2]
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2]
    ]
  ]
};

export const TETROMINO_COLORS: Record<TetrominoId, number> = {
  I: 0x00f3ff,
  J: 0x3577ff,
  L: 0xffa726,
  O: 0xffee3f,
  S: 0x38ff7a,
  T: 0xc05fff,
  Z: 0xff3d5f
};

export class TetrisEngine {
  public readonly cols = WIDTH;
  public readonly rows = HEIGHT;
  private _board: number[][] = [];
  private _queue: TetrominoId[] = [];
  private _score = 0;
  private _lines = 0;
  private _level = 1;

  constructor(level = 1) {
    this._level = Math.max(1, level);
    this.reset(this._level);
  }

  public reset(level = 1): void {
    this._level = Math.max(1, level);
    this._score = 0;
    this._lines = 0;
    this._queue = [];
    this._board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
    this.fillQueue();
  }

  public get board(): number[][] {
    return this._board;
  }

  public get score(): number {
    return this._score;
  }

  public get lines(): number {
    return this._lines;
  }

  public get level(): number {
    return this._level;
  }

  public get dropInterval(): number {
    const base = 900;
    const reduction = (this._level - 1) * 70;
    return Math.max(90, base - reduction);
  }

  public getNextQueue(count = 1): TetrominoId[] {
    this.fillQueue();
    return this._queue.slice(0, count);
  }

  public spawnPiece(): PieceState {
    this.fillQueue();
    const id = this._queue.shift()!;
    this.fillQueue();
    return {
      id,
      rotation: 0,
      x: SPAWN_X,
      y: SPAWN_Y
    };
  }

  public pieceCells(piece: PieceState, rotation = piece.rotation): [number, number][] {
    return TETROMINO_SHAPES[piece.id][rotation].map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  public canPlace(piece: PieceState, dx = 0, dy = 0, rotation = piece.rotation): boolean {
    const candidate: PieceState = {
      ...piece,
      x: piece.x + dx,
      y: piece.y + dy,
      rotation
    };
    for (const [x, y] of TETROMINO_SHAPES[piece.id][rotation]) {
      const px = candidate.x + x;
      const py = candidate.y + y;
      if (px < 0 || px >= WIDTH || py >= HEIGHT) {
        return false;
      }
      if (py < 0) {
        continue;
      }
      if (this._board[py][px] !== 0) {
        return false;
      }
    }
    return true;
  }

  public rotatePiece(piece: PieceState, direction: 1 | -1): PieceState | null {
    const newRotation = direction === 1 ? ((piece.rotation + 1) % 4) as 0 | 1 | 2 | 3 : ((piece.rotation + 3) % 4) as 0 | 1 | 2 | 3;
    const kicks = piece.id === 'I' ? WALL_KICK_I : WALL_KICK_GENERIC;
    for (const [kx, ky] of kicks) {
      const candidate: PieceState = {
        ...piece,
        rotation: newRotation,
        x: piece.x + kx,
        y: piece.y + ky
      };
      if (this.canPlace(candidate, 0, 0, candidate.rotation)) {
        return candidate;
      }
    }
    return null;
  }

  public placePiece(piece: PieceState): number[] {
    const color = this.colorId(piece.id);
    for (const [px, py] of this.pieceCells(piece)) {
      if (py >= 0 && py < HEIGHT && px >= 0 && px < WIDTH) {
        this._board[py][px] = color;
      }
    }
    const completed = this.findCompletedLines();
    return completed;
  }

  public clearLines(rows: number[]): number {
    if (rows.length === 0) {
      return 0;
    }
    const uniqueRows = Array.from(new Set(rows)).sort((a, b) => a - b);
    for (let i = uniqueRows.length - 1; i >= 0; i -= 1) {
      const row = uniqueRows[i];
      this._board.splice(row, 1);
      this._board.unshift(Array(WIDTH).fill(0));
    }
    const count = uniqueRows.length;
    const scoreTable = [0, 40, 100, 300, 1200] as const;
    this._score += scoreTable[count] * this._level;
    this._lines += count;
    this._level = Math.floor(this._lines / 10) + 1;
    return count;
  }

  public addScore(points: number): void {
    this._score += Math.max(0, points);
  }

  public ghostDropY(piece: PieceState): number {
    let y = piece.y;
    const candidate: PieceState = { ...piece };
    while (this.canPlace(candidate, 0, 1)) {
      candidate.y += 1;
    }
    return candidate.y;
  }

  private fillQueue(): void {
    while (this._queue.length < 7) {
      const batch = TETROMINOES.slice();
      for (let i = batch.length - 1; i > 0; i -= 1) {
        const swap = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[swap]] = [batch[swap], batch[i]];
      }
      this._queue.push(...batch);
    }
  }

  private findCompletedLines(): number[] {
    const rows: number[] = [];
    for (let row = 0; row < HEIGHT; row += 1) {
      if (this._board[row].every((cell) => cell !== 0)) {
        rows.push(row);
      }
    }
    return rows;
  }

  private colorId(id: TetrominoId): number {
    const idx = TETROMINOES.indexOf(id);
    return idx + 1;
  }

  public hasCollisionAtSpawn(piece: PieceState): boolean {
    return !this.canPlace(piece);
  }
}
