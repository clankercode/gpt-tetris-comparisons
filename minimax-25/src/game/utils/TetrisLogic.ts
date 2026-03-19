export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const CELL_SIZE = 28;

export const TETROMINO_COLORS: Record<string, number> = {
  I: 0x00f5ff,
  J: 0x0066ff,
  L: 0xff9900,
  O: 0xffdd00,
  S: 0x00ff66,
  T: 0xcc00ff,
  Z: 0xff3333,
};

export const TETROMINOES: Record<string, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const SPAWN_POSITIONS: Record<string, number> = {
  I: 0,
  J: 1,
  L: 1,
  O: 1,
  S: 1,
  T: 1,
  Z: 1,
};

export interface GameState {
  board: (string | null)[][];
  currentPiece: TetrominoData | null;
  nextPiece: string | null;
  bag: string[];
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
  dropTimer: number;
  dropInterval: number;
}

export interface TetrominoData {
  type: string;
  shape: number[][];
  x: number;
  y: number;
  rotation: number;
}

export function createEmptyBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null)
  );
}

export function shuffleBag(): string[] {
  const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

export function getNextPiece(bag: string[]): { piece: string; bag: string[] } {
  let newBag = [...bag];
  if (newBag.length === 0) {
    newBag = shuffleBag();
  }
  return { piece: newBag.pop()!, bag: newBag };
}

export function createTetromino(type: string): TetrominoData {
  const shape = TETROMINOES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
    y: SPAWN_POSITIONS[type],
    rotation: 0,
  };
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    rotated.push(newRow);
  }
  return rotated;
}

export function isValidPosition(
  board: (string | null)[][],
  shape: number[][],
  x: number,
  y: number
): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false;
        }
        if (newY >= 0 && board[newY][newX] !== null) {
          return false;
        }
      }
    }
  }
  return true;
}

export function lockPiece(
  board: (string | null)[][],
  piece: TetrominoData
): (string | null)[][] {
  const newBoard = board.map(row => [...row]);
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        const y = piece.y + row;
        const x = piece.x + col;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          newBoard[y][x] = piece.type;
        }
      }
    }
  }
  return newBoard;
}

export function clearLines(board: (string | null)[][]): {
  board: (string | null)[][];
  linesCleared: number;
} {
  const newBoard = board.filter(row => row.some(cell => cell === null));
  const linesCleared = BOARD_HEIGHT - newBoard.length;
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null));
  }
  return { board: newBoard, linesCleared };
}

export function calculateScore(linesCleared: number, level: number): number {
  const points = [0, 100, 300, 500, 800];
  return points[linesCleared] * level;
}

export function calculateLevel(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

export function calculateDropInterval(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 100);
}

export function getGhostPosition(
  board: (string | null)[][],
  piece: TetrominoData
): number {
  let ghostY = piece.y;
  while (isValidPosition(board, piece.shape, piece.x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}
