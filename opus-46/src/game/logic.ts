import type { Board, Cell, GameState, Piece, PieceType, Position, ShapeMatrix } from "./types";
import {
  ALL_PIECES, COLS, TOTAL_ROWS, HIDDEN_ROWS, SHAPES,
  WALL_KICKS, WALL_KICKS_I, LINE_SCORES, LINES_PER_LEVEL,
  SOFT_DROP_SCORE, HARD_DROP_SCORE,
} from "./config";

// ── Board helpers ─────────────────────────────────────────────────

export function createBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null) as Cell[]);
}

// ── Bag randomizer ────────────────────────────────────────────────

export function generateBag(): PieceType[] {
  const bag = [...ALL_PIECES];
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function ensureQueue(state: GameState, minSize: number): void {
  while (state.nextQueue.length < minSize) {
    if (state.bag.length === 0) {
      state.bag = generateBag();
    }
    state.nextQueue.push(state.bag.pop()!);
  }
}

// ── Piece creation ────────────────────────────────────────────────

export function createPiece(type: PieceType): Piece {
  const shape = SHAPES[type].map(row => [...row]);
  const spawnX = Math.floor((COLS - shape[0].length) / 2);
  const spawnY = HIDDEN_ROWS - shape.length; // start above visible area
  return { type, shape, pos: { x: spawnX, y: spawnY }, rotation: 0 };
}

// ── Rotation ──────────────────────────────────────────────────────

export function rotateMatrix(matrix: ShapeMatrix, clockwise: boolean): ShapeMatrix {
  const size = matrix.length;
  const result: ShapeMatrix = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (clockwise) {
        result[x][size - 1 - y] = matrix[y][x];
      } else {
        result[size - 1 - x][y] = matrix[y][x];
      }
    }
  }
  return result;
}

// ── Collision detection ───────────────────────────────────────────

export function isValidPosition(board: Board, shape: ShapeMatrix, pos: Position): boolean {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] === 0) continue;
      const bx = pos.x + x;
      const by = pos.y + y;
      if (bx < 0 || bx >= COLS || by >= TOTAL_ROWS) return false;
      if (by < 0) continue; // above board is ok
      if (board[by][bx] !== null) return false;
    }
  }
  return true;
}

// ── Movement ──────────────────────────────────────────────────────

export function movePiece(board: Board, piece: Piece, dx: number, dy: number): boolean {
  const newPos = { x: piece.pos.x + dx, y: piece.pos.y + dy };
  if (isValidPosition(board, piece.shape, newPos)) {
    piece.pos = newPos;
    return true;
  }
  return false;
}

export function rotatePiece(board: Board, piece: Piece, clockwise: boolean): boolean {
  const newShape = rotateMatrix(piece.shape, clockwise);
  const oldRot = piece.rotation;
  const newRot = clockwise ? (oldRot + 1) % 4 : (oldRot + 3) % 4;
  const kickKey = `${oldRot}>${newRot}`;
  const kicks = piece.type === "I" ? WALL_KICKS_I[kickKey] : WALL_KICKS[kickKey];

  if (!kicks) return false;

  for (const [dx, dy] of kicks) {
    const newPos = { x: piece.pos.x + dx, y: piece.pos.y - dy }; // SRS uses inverted Y for kicks
    if (isValidPosition(board, newShape, newPos)) {
      piece.shape = newShape;
      piece.pos = newPos;
      piece.rotation = newRot;
      return true;
    }
  }
  return false;
}

// ── Ghost piece (hard drop preview) ───────────────────────────────

export function getGhostY(board: Board, piece: Piece): number {
  let gy = piece.pos.y;
  while (isValidPosition(board, piece.shape, { x: piece.pos.x, y: gy + 1 })) {
    gy++;
  }
  return gy;
}

// ── Lock piece onto board ─────────────────────────────────────────

export function lockPiece(board: Board, piece: Piece): void {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] === 0) continue;
      const bx = piece.pos.x + x;
      const by = piece.pos.y + y;
      if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < COLS) {
        board[by][bx] = piece.type;
      }
    }
  }
}

// ── Line clearing ─────────────────────────────────────────────────

export function findFullLines(board: Board): number[] {
  const lines: number[] = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (board[y].every(cell => cell !== null)) {
      lines.push(y);
    }
  }
  return lines;
}

export function clearLines(board: Board, lines: number[]): void {
  // Remove lines from bottom to top
  const sorted = [...lines].sort((a, b) => b - a);
  for (const y of sorted) {
    board.splice(y, 1);
  }
  // Add empty rows at top
  while (board.length < TOTAL_ROWS) {
    board.unshift(Array(COLS).fill(null) as Cell[]);
  }
}

// ── Scoring ───────────────────────────────────────────────────────

export function calculateScore(linesCleared: number, level: number): number {
  return (LINE_SCORES[linesCleared] || 0) * (level + 1);
}

// ── Game state management ─────────────────────────────────────────

export function createGameState(startLevel: number): GameState {
  const state: GameState = {
    board: createBoard(),
    current: null,
    held: null,
    canHold: true,
    nextQueue: [],
    score: 0,
    level: startLevel,
    lines: 0,
    gameOver: false,
    bag: [],
  };
  // Fill queue
  ensureQueue(state, 5);
  // Spawn first piece
  spawnNext(state);
  return state;
}

export function spawnNext(state: GameState): boolean {
  ensureQueue(state, 5);
  const type = state.nextQueue.shift()!;
  const piece = createPiece(type);

  if (!isValidPosition(state.board, piece.shape, piece.pos)) {
    state.gameOver = true;
    state.current = piece; // still set it for display
    return false;
  }

  state.current = piece;
  state.canHold = true;
  return true;
}

export function holdPiece(state: GameState): boolean {
  if (!state.canHold || !state.current) return false;

  const currentType = state.current.type;

  if (state.held === null) {
    state.held = currentType;
    spawnNext(state);
  } else {
    const swapType = state.held;
    state.held = currentType;
    state.current = createPiece(swapType);
    if (!isValidPosition(state.board, state.current.shape, state.current.pos)) {
      state.gameOver = true;
      return false;
    }
  }

  state.canHold = false;
  return true;
}

export function hardDrop(state: GameState): { linesCleared: number; dropDistance: number } {
  if (!state.current) return { linesCleared: 0, dropDistance: 0 };

  const ghostY = getGhostY(state.board, state.current);
  const dropDistance = ghostY - state.current.pos.y;
  state.current.pos.y = ghostY;
  state.score += dropDistance * HARD_DROP_SCORE;

  lockPiece(state.board, state.current);
  const fullLines = findFullLines(state.board);
  if (fullLines.length > 0) {
    state.score += calculateScore(fullLines.length, state.level);
    state.lines += fullLines.length;
    state.level = Math.max(state.level, Math.floor(state.lines / LINES_PER_LEVEL));
    clearLines(state.board, fullLines);
  }

  const linesCleared = fullLines.length;
  spawnNext(state);
  return { linesCleared, dropDistance };
}

export function softDrop(state: GameState): boolean {
  if (!state.current) return false;
  if (movePiece(state.board, state.current, 0, 1)) {
    state.score += SOFT_DROP_SCORE;
    return true;
  }
  return false;
}

export function lockAndSpawn(state: GameState): number {
  if (!state.current) return 0;

  lockPiece(state.board, state.current);
  const fullLines = findFullLines(state.board);
  if (fullLines.length > 0) {
    state.score += calculateScore(fullLines.length, state.level);
    state.lines += fullLines.length;
    state.level = Math.max(state.level, Math.floor(state.lines / LINES_PER_LEVEL));
    clearLines(state.board, fullLines);
  }

  spawnNext(state);
  return fullLines.length;
}

export function isOnGround(board: Board, piece: Piece): boolean {
  return !isValidPosition(board, piece.shape, { x: piece.pos.x, y: piece.pos.y + 1 });
}
