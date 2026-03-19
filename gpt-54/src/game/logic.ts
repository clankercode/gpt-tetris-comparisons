import { BOARD_HEIGHT, BOARD_WIDTH } from "./config";
import type { ActivePiece, LockResult, PieceType, TetrisState } from "./types";

type Cells = Array<[number, number]>;

const PIECES: Record<PieceType, Cells[]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

const JLSTZ_KICKS: Record<string, Cells> = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS: Record<string, Cells> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

function emptyBoard(): (PieceType | null)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null),
  );
}

function shuffleBag(): PieceType[] {
  const bag: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swap]] = [bag[swap], bag[index]];
  }
  return bag;
}

function ensureQueue(queue: PieceType[]): PieceType[] {
  const next = [...queue];
  while (next.length < 8) {
    next.push(...shuffleBag());
  }
  return next;
}

function spawnPiece(queue: PieceType[]): { active: ActivePiece; queue: PieceType[] } {
  const nextQueue = ensureQueue(queue);
  const type = nextQueue.shift()!;
  return {
    active: { type, rotation: 0, x: 3, y: 0 },
    queue: nextQueue,
  };
}

export function createInitialState(startLevel: number): TetrisState {
  const firstSpawn = spawnPiece([]);

  return {
    board: emptyBoard(),
    active: firstSpawn.active,
    queue: ensureQueue(firstSpawn.queue),
    hold: null,
    canHold: true,
    score: 0,
    level: startLevel,
    lines: 0,
    combo: -1,
    backToBack: false,
    gameOver: false,
    lockResult: { clearedRows: [], clearType: "none" },
  };
}

export function cellsFor(piece: ActivePiece): Cells {
  return PIECES[piece.type][piece.rotation].map(([x, y]) => [x + piece.x, y + piece.y]);
}

export function canPlace(board: (PieceType | null)[][], piece: ActivePiece): boolean {
  return cellsFor(piece).every(([x, y]) => {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return false;
    }

    if (y < 0) {
      return true;
    }

    return board[y][x] === null;
  });
}

export function movePiece(state: TetrisState, dx: number, dy: number): boolean {
  const next = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  if (!canPlace(state.board, next)) {
    return false;
  }
  state.active = next;
  return true;
}

export function rotatePiece(state: TetrisState, direction: 1 | -1): boolean {
  const from = state.active.rotation;
  const to = (from + direction + 4) % 4;
  const key = `${from}>${to}`;
  const kicks = state.active.type === "O"
    ? [[0, 0]]
    : state.active.type === "I"
      ? I_KICKS[key]
      : JLSTZ_KICKS[key];

  for (const [kickX, kickY] of kicks) {
    const candidate: ActivePiece = {
      ...state.active,
      rotation: to,
      x: state.active.x + kickX,
      y: state.active.y - kickY,
    };

    if (canPlace(state.board, candidate)) {
      state.active = candidate;
      return true;
    }
  }

  return false;
}

export function hardDropDistance(state: TetrisState): number {
  let distance = 0;
  while (canPlace(state.board, { ...state.active, y: state.active.y + distance + 1 })) {
    distance += 1;
  }
  return distance;
}

export function ghostPiece(state: TetrisState): ActivePiece {
  return { ...state.active, y: state.active.y + hardDropDistance(state) };
}

function clearLines(board: (PieceType | null)[][]): LockResult {
  const clearedRows: number[] = [];
  const remaining = board.filter((row, rowIndex) => {
    const filled = row.every(Boolean);
    if (filled) {
      clearedRows.push(rowIndex);
    }
    return !filled;
  });

  while (remaining.length < BOARD_HEIGHT) {
    remaining.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
  }

  board.splice(0, board.length, ...remaining);

  const count = clearedRows.length;
  const clearType: LockResult["clearType"] = count === 0
    ? "none"
    : count === 1
      ? "single"
      : count === 2
        ? "double"
        : count === 3
          ? "triple"
          : "tetris";

  return { clearedRows, clearType };
}

function lockPieceToBoard(state: TetrisState): LockResult {
  for (const [x, y] of cellsFor(state.active)) {
    if (y < 0) {
      state.gameOver = true;
      continue;
    }
    state.board[y][x] = state.active.type;
  }

  return clearLines(state.board);
}

function scoreForClear(clearType: LockResult["clearType"], level: number, backToBack: boolean, combo: number): number {
  const base = clearType === "single"
    ? 100
    : clearType === "double"
      ? 300
      : clearType === "triple"
        ? 500
        : clearType === "tetris"
          ? 800
          : 0;

  const b2bBonus = clearType === "tetris" && backToBack ? 1.5 : 1;
  const comboBonus = combo > 0 ? combo * 50 : 0;
  return Math.floor((base * b2bBonus + comboBonus) * level);
}

export function lockActivePiece(state: TetrisState): LockResult {
  const result = lockPieceToBoard(state);
  state.lockResult = result;

  if (result.clearedRows.length > 0) {
    state.combo += 1;
    state.lines += result.clearedRows.length;
    state.score += scoreForClear(result.clearType, state.level, state.backToBack, state.combo);
    state.backToBack = result.clearType === "tetris";
    state.level = Math.max(state.level, 1 + Math.floor(state.lines / 10));
  } else {
    state.combo = -1;
    state.backToBack = false;
  }

  const spawned = spawnPiece(state.queue);
  state.active = spawned.active;
  state.queue = ensureQueue(spawned.queue);
  state.canHold = true;

  if (!canPlace(state.board, state.active)) {
    state.gameOver = true;
  }

  return result;
}

export function holdPiece(state: TetrisState): boolean {
  if (!state.canHold) {
    return false;
  }

  const currentType = state.active.type;

  if (state.hold) {
    state.active = { type: state.hold, rotation: 0, x: 3, y: 0 };
    state.hold = currentType;
  } else {
    state.hold = currentType;
    const spawned = spawnPiece(state.queue);
    state.active = spawned.active;
    state.queue = ensureQueue(spawned.queue);
  }

  state.canHold = false;

  if (!canPlace(state.board, state.active)) {
    state.gameOver = true;
  }

  return true;
}

export function addSoftDropScore(state: TetrisState): void {
  state.score += 1;
}

export function addHardDropScore(state: TetrisState, distance: number): void {
  state.score += distance * 2;
}

export function gravityIntervalMs(level: number): number {
  return Math.max(70, 900 - (level - 1) * 55);
}
