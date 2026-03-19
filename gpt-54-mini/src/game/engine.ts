import type { RandomSource } from "./random";
import { createDefaultRandomSource, createMulberry32, shuffle } from "./random";
import type { CellPosition, PieceKind, PieceState, Rotation } from "./types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const LINE_CLEAR_MS = 190;
export const NEXT_QUEUE_SIZE = 7;

export type BoardCell = PieceKind | null;
export type Board = BoardCell[][];

export interface GameOptions {
  startLevel: number;
  seed?: number;
  random?: RandomSource;
}

export interface GameState {
  board: Board;
  activePiece: PieceState | null;
  queue: PieceKind[];
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  clearing: {
    rows: number[];
    remainingMs: number;
    scoreDelta: number;
  } | null;
}

export type GameEvent =
  | { type: "move"; direction: "left" | "right" | "down" }
  | { type: "rotate"; direction: -1 | 1 }
  | { type: "lock"; rows: number[] }
  | { type: "clear-start"; rows: number[]; count: number; scoreDelta: number }
  | { type: "clear-end"; rows: number[] }
  | { type: "spawn"; piece: PieceState }
  | { type: "level-up"; level: number }
  | { type: "game-over" };

export interface ActionResult {
  changed: boolean;
  events: GameEvent[];
}

export const PIECE_KINDS: readonly PieceKind[] = ["I", "J", "L", "O", "S", "T", "Z"];
const SCORE_TABLE = [40, 100, 300, 1200] as const;
const GRAVITY_MS = [
  800, 716, 633, 550, 466, 383, 300, 216, 133, 100, 83, 83, 75, 75, 66, 66,
  50, 50, 40, 40, 33, 33, 25, 25, 20, 20, 16, 16, 13, 13,
];

const SHAPES: Record<PieceKind, readonly CellPosition[][]> = {
  I: [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ],
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
  ],
  J: [
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  ],
  L: [
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  O: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  ],
  S: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  T: [
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  Z: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ],
  ],
};

class PieceBag {
  private readonly rng: RandomSource;
  private bag: PieceKind[] = [];

  constructor(rng: RandomSource) {
    this.rng = rng;
  }

  next(): PieceKind {
    if (this.bag.length === 0) {
      this.refill();
    }

    const next = this.bag.shift();
    if (!next) {
      throw new Error("Piece bag unexpectedly ran empty.");
    }

    return next;
  }

  preview(minimum: number): PieceKind[] {
    while (this.bag.length < minimum) {
      this.refill();
    }

    return this.bag.slice();
  }

  private refill(): void {
    this.bag.push(...shuffle(PIECE_KINDS, this.rng));
  }
}

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null),
  );
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function levelFromLines(startLevel: number, lines: number): number {
  return Math.min(29, startLevel + Math.floor(lines / 10));
}

export function gravityForLevel(level: number): number {
  return GRAVITY_MS[clamp(level, 0, GRAVITY_MS.length - 1)];
}

export function scoreForLineCount(count: number, level: number): number {
  if (count < 1 || count > 4) {
    return 0;
  }

  return SCORE_TABLE[count - 1] * (level + 1);
}

export function getPieceCells(piece: PieceState): CellPosition[] {
  return SHAPES[piece.kind][piece.rotation].map((offset) => ({
    x: piece.x + offset.x,
    y: piece.y + offset.y,
  }));
}

export function canPlacePiece(board: Board, piece: PieceState): boolean {
  for (const cell of getPieceCells(piece)) {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) {
      return false;
    }

    if (cell.y >= 0 && board[cell.y][cell.x]) {
      return false;
    }
  }

  return true;
}

export function fullRows(board: Board): number[] {
  const rows: number[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    if (board[y].every(Boolean)) {
      rows.push(y);
    }
  }

  return rows;
}

export function clearBoardRows(board: Board, rowsToRemove: readonly number[]): Board {
  const remove = new Set(rowsToRemove);
  const kept = board.filter((_, rowIndex) => !remove.has(rowIndex));

  while (kept.length < BOARD_HEIGHT) {
    kept.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
  }

  return kept;
}

export class TetrisGame {
  public state: GameState;

  private readonly bag: PieceBag;
  private startLevel: number;
  private clearTimer = 0;
  private gravityAccumulator = 0;

  constructor(options: GameOptions) {
    this.startLevel = clamp(Math.floor(options.startLevel), 0, 29);
    const rng =
      options.random ??
      (typeof options.seed === "number"
        ? createMulberry32(options.seed)
        : createDefaultRandomSource());
    this.bag = new PieceBag(rng);
    this.state = this.createFreshState();
    this.spawnInitialPiece();
  }

  restart(options?: Partial<GameOptions>): ActionResult {
    if (typeof options?.startLevel === "number") {
      this.startLevel = clamp(Math.floor(options.startLevel), 0, 29);
    }

    this.state.board = createEmptyBoard();
    this.state.queue.length = 0;
    this.state.activePiece = null;
    this.state.score = 0;
    this.state.lines = 0;
    this.state.level = clamp(Math.floor(options?.startLevel ?? this.startLevel), 0, 29);
    this.state.gameOver = false;
    this.state.clearing = null;
    this.clearTimer = 0;
    this.gravityAccumulator = 0;

    const events: GameEvent[] = [];
    const spawned = this.spawnNextPiece();
    if (spawned) {
      events.push(...spawned);
    }

    return { changed: true, events };
  }

  move(dx: number): ActionResult {
    if (!this.canAct()) {
      return { changed: false, events: [] };
    }

    const piece = this.requireActivePiece();
    const candidate = { ...piece, x: piece.x + dx };

    if (!canPlacePiece(this.state.board, candidate)) {
      return { changed: false, events: [] };
    }

    this.state.activePiece = candidate;
    return {
      changed: true,
      events: [
        {
          type: "move",
          direction: dx < 0 ? "left" : "right",
        },
      ],
    };
  }

  rotate(direction: -1 | 1): ActionResult {
    if (!this.canAct()) {
      return { changed: false, events: [] };
    }

    const piece = this.requireActivePiece();
    const rotation = ((piece.rotation + direction + 4) % 4) as Rotation;
    const candidate = { ...piece, rotation };

    if (!canPlacePiece(this.state.board, candidate)) {
      return { changed: false, events: [] };
    }

    this.state.activePiece = candidate;
    return {
      changed: true,
      events: [{ type: "rotate", direction }],
    };
  }

  softDrop(): ActionResult {
    if (!this.canAct()) {
      return { changed: false, events: [] };
    }

    const piece = this.requireActivePiece();
    const candidate = { ...piece, y: piece.y + 1 };

    if (canPlacePiece(this.state.board, candidate)) {
      this.state.activePiece = candidate;
      return {
        changed: true,
        events: [{ type: "move", direction: "down" }],
      };
    }

    return this.lockPiece();
  }

  tick(deltaMs: number): ActionResult {
    const events: GameEvent[] = [];

    if (this.state.gameOver) {
      return { changed: false, events };
    }

    if (this.state.clearing) {
      this.clearTimer -= deltaMs;
      this.state.clearing.remainingMs = Math.max(0, this.clearTimer);

      if (this.clearTimer > 0) {
        return { changed: false, events };
      }

      const clearEvents = this.finishClear();
      return { changed: true, events: clearEvents };
    }

    this.gravityAccumulator += deltaMs;
    let changed = false;

    while (
      !this.state.gameOver &&
      !this.state.clearing &&
      this.state.activePiece &&
      this.gravityAccumulator >= gravityForLevel(this.state.level)
    ) {
      this.gravityAccumulator -= gravityForLevel(this.state.level);
      const piece = this.requireActivePiece();
      const candidate = { ...piece, y: piece.y + 1 };

      if (canPlacePiece(this.state.board, candidate)) {
        this.state.activePiece = candidate;
        changed = true;
        events.push({ type: "move", direction: "down" });
        continue;
      }

      const lockResult = this.lockPiece();
      events.push(...lockResult.events);
      changed ||= lockResult.changed;
      break;
    }

    return { changed, events };
  }

  get previewQueue(): PieceKind[] {
    return this.state.queue.slice();
  }

  private createFreshState(): GameState {
    const queue = Array.from({ length: NEXT_QUEUE_SIZE }, () => this.bag.next());
    this.state = {
      board: createEmptyBoard(),
      activePiece: null,
      queue,
      score: 0,
      lines: 0,
      level: this.startLevel,
      gameOver: false,
      clearing: null,
    };

    return this.state;
  }

  private spawnInitialPiece(): void {
    const spawned = this.spawnNextPiece();
    if (spawned.some((event) => event.type === "game-over")) {
      this.state.gameOver = true;
    }
  }

  private canAct(): boolean {
    return !this.state.gameOver && !this.state.clearing && Boolean(this.state.activePiece);
  }

  private requireActivePiece(): PieceState {
    if (!this.state.activePiece) {
      throw new Error("Expected an active piece.");
    }

    return this.state.activePiece;
  }

  private spawnNextPiece(): GameEvent[] {
    while (this.state.queue.length < NEXT_QUEUE_SIZE) {
      this.state.queue.push(this.bag.next());
    }

    const kind = this.state.queue.shift();
    if (!kind) {
      throw new Error("The piece queue unexpectedly ran empty.");
    }

    const piece: PieceState = {
      kind,
      rotation: 0,
      x: 3,
      y: -2,
    };

    this.state.activePiece = piece;
    if (!canPlacePiece(this.state.board, piece)) {
      this.state.gameOver = true;
      this.state.activePiece = null;
      return [{ type: "game-over" }];
    }

    while (this.state.queue.length < NEXT_QUEUE_SIZE) {
      this.state.queue.push(this.bag.next());
    }

    return [{ type: "spawn", piece }];
  }

  private lockPiece(): ActionResult {
    const piece = this.requireActivePiece();
    const cells = getPieceCells(piece);
    let touchedAboveTop = false;

    for (const cell of cells) {
      if (cell.y < 0) {
        touchedAboveTop = true;
        continue;
      }

      this.state.board[cell.y][cell.x] = piece.kind;
    }

    this.state.activePiece = null;

    if (touchedAboveTop) {
      this.state.gameOver = true;
      return { changed: true, events: [{ type: "lock", rows: [] }, { type: "game-over" }] };
    }

    const rows = fullRows(this.state.board);
    if (rows.length === 0) {
      const spawnEvents = this.spawnNextPiece();
      return {
        changed: true,
        events: [{ type: "lock", rows: [] }, ...spawnEvents],
      };
    }

    const levelBefore = this.state.level;
    const scoreDelta = scoreForLineCount(rows.length, this.state.level);
    this.state.score += scoreDelta;
    this.state.lines += rows.length;
    this.state.level = levelFromLines(this.startLevel, this.state.lines);
    this.state.clearing = {
      rows,
      remainingMs: LINE_CLEAR_MS,
      scoreDelta,
    };
    this.clearTimer = LINE_CLEAR_MS;

    const events: GameEvent[] = [{ type: "lock", rows }];
    if (this.state.level !== levelBefore) {
      events.push({ type: "level-up", level: this.state.level });
    }
    events.push({
      type: "clear-start",
      rows,
      count: rows.length,
      scoreDelta,
    });

    return { changed: true, events };
  }

  private finishClear(): GameEvent[] {
    const clearing = this.state.clearing;
    if (!clearing) {
      return [];
    }

    this.state.board = clearBoardRows(this.state.board, clearing.rows);
    this.state.clearing = null;
    this.clearTimer = 0;

    const events: GameEvent[] = [{ type: "clear-end", rows: clearing.rows }];
    const spawnEvents = this.spawnNextPiece();
    events.push(...spawnEvents);
    return events;
  }
}
