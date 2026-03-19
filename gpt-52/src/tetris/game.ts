import type { GameMode } from "../state/Settings";
import type { Rotation, TetrominoType, Vec } from "./types";
import { Board, BOARD_H, BOARD_W } from "./board";
import { Randomizer7Bag } from "./randomizer";
import { Piece } from "./piece";
import { kicksFor } from "./srs";

export type GameOverReason = "topout";

export type GameEvent =
  | { type: "spawn"; piece: Piece }
  | { type: "hold"; held: TetrominoType | null }
  | { type: "lock" }
  | { type: "lineclear"; cleared: number; rows: number[] }
  | { type: "level"; level: number }
  | { type: "gameover"; reason: GameOverReason }
  | { type: "score"; score: number };

export type GameState = {
  mode: GameMode;
  board: Board;
  active: Piece;
  hold: TetrominoType | null;
  canHold: boolean;
  next: TetrominoType[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
  startMs: number;
  sprintTargetLines: number;
  sprintDone: boolean;
};

export class TetrisGame {
  readonly board = new Board();
  private rand = new Randomizer7Bag();

  private _active = new Piece(this.rand.next());
  private _hold: TetrominoType | null = null;
  private _canHold = true;
  private _next: TetrominoType[] = [];

  score = 0;
  lines = 0;
  level = 0;
  over = false;

  mode: GameMode = "marathon";
  startMs = 0;
  sprintTargetLines = 40;
  sprintDone = false;

  // Timers (ms)
  gravityAcc = 0;
  lockAcc = 0;
  lockDelayMs = 500;
  softDrop = false;

  // Callbacks
  onEvent: (e: GameEvent) => void = () => {};

  constructor() {
    this.fillNext();
    this.spawnFromNext();
  }

  start(mode: GameMode, nowMs: number) {
    this.mode = mode;
    this.board.clear();
    this.rand = new Randomizer7Bag();
    this._hold = null;
    this._canHold = true;
    this._next = [];
    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.over = false;
    this.sprintDone = false;
    this.startMs = nowMs;
    this.gravityAcc = 0;
    this.lockAcc = 0;
    this.softDrop = false;
    this.fillNext();
    this.spawnFromNext();
  }

  snapshot(): GameState {
    return {
      mode: this.mode,
      board: this.board,
      active: this._active,
      hold: this._hold,
      canHold: this._canHold,
      next: [...this._next],
      score: this.score,
      lines: this.lines,
      level: this.level,
      over: this.over,
      startMs: this.startMs,
      sprintTargetLines: this.sprintTargetLines,
      sprintDone: this.sprintDone
    };
  }

  get active() {
    return this._active;
  }

  get nextQueue() {
    return this._next;
  }

  get hold() {
    return this._hold;
  }

  get canHold() {
    return this._canHold;
  }

  tick(dtMs: number) {
    if (this.over || this.sprintDone) return;

    const gMs = this.softDrop ? 35 : gravityMsForLevel(this.level);

    this.gravityAcc += dtMs;
    while (this.gravityAcc >= gMs) {
      this.gravityAcc -= gMs;
      if (this.tryMove(0, 1)) {
        if (this.softDrop) this.addScore(1);
        this.lockAcc = 0;
      } else {
        break;
      }
    }

    if (!this.canMove(0, 1)) {
      this.lockAcc += dtMs;
      if (this.lockAcc >= this.lockDelayMs) this.lockPiece();
    } else {
      this.lockAcc = 0;
    }
  }

  setSoftDrop(on: boolean) {
    this.softDrop = on;
  }

  tryMove(dx: number, dy: number): boolean {
    const p = this._active;
    if (!this.canAt(p.x + dx, p.y + dy, p.rot)) return false;
    p.x += dx;
    p.y += dy;
    return true;
  }

  hardDrop(): number {
    const p = this._active;
    let dist = 0;
    while (this.canAt(p.x, p.y + 1, p.rot)) {
      p.y += 1;
      dist++;
    }
    if (dist > 0) this.addScore(dist * 2);
    this.lockPiece();
    return dist;
  }

  rotate(dir: -1 | 1): boolean {
    const p = this._active;
    const from = p.rot;
    const to = ((from + (dir === 1 ? 1 : 3)) % 4) as Rotation;
    const kicks = kicksFor(p.type, from, to);
    for (const k of kicks) {
      if (this.canAt(p.x + k.x, p.y + k.y, to)) {
        p.x += k.x;
        p.y += k.y;
        p.rot = to;
        this.lockAcc = 0;
        return true;
      }
    }
    return false;
  }

  holdSwap(): boolean {
    if (!this._canHold) return false;
    const current = this._active.type;
    if (this._hold == null) {
      this._hold = current;
      this._canHold = false;
      this.onEvent({ type: "hold", held: this._hold });
      this.spawnFromNext();
      return true;
    }
    const tmp = this._hold;
    this._hold = current;
    this._active = new Piece(tmp);
    this._canHold = false;
    this.lockAcc = 0;
    this.onEvent({ type: "hold", held: this._hold });
    this.onEvent({ type: "spawn", piece: this._active });
    if (!this.canAt(this._active.x, this._active.y, this._active.rot)) {
      this.gameOver("topout");
    }
    return true;
  }

  private lockPiece() {
    const p = this._active;
    const lockId = (Math.random() * 1e9) | 0;
    for (const b of p.blocks()) {
      const x = p.x + b.x;
      const y = p.y + b.y;
      if (y >= 0) this.board.set(x, y, { type: p.type, lockId });
    }
    this.onEvent({ type: "lock" });

    const { cleared, rows } = this.board.clearFullRows();
    if (cleared > 0) {
      this.lines += cleared;
      const add = scoreForClear(cleared, this.level);
      this.addScore(add);
      this.onEvent({ type: "lineclear", cleared, rows });
      const newLevel = Math.floor(this.lines / 10);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.onEvent({ type: "level", level: this.level });
      }
      if (this.mode === "sprint40" && this.lines >= this.sprintTargetLines) {
        this.sprintDone = true;
      }
    }

    if (this.board.topOut()) {
      this.gameOver("topout");
      return;
    }

    this._canHold = true;
    this.lockAcc = 0;
    this.spawnFromNext();
  }

  private spawnFromNext() {
    this.fillNext();
    const t = this._next.shift()!;
    this._active = new Piece(t);
    this.onEvent({ type: "spawn", piece: this._active });
    if (!this.canAt(this._active.x, this._active.y, this._active.rot)) {
      this.gameOver("topout");
    }
  }

  private fillNext() {
    while (this._next.length < 5) this._next.push(this.rand.next());
  }

  private canMove(dx: number, dy: number): boolean {
    const p = this._active;
    return this.canAt(p.x + dx, p.y + dy, p.rot);
  }

  canAt(x0: number, y0: number, rot: Rotation): boolean {
    const p = this._active;
    for (const b of p.blocks(rot)) {
      const x = x0 + b.x;
      const y = y0 + b.y;
      if (x < 0 || x >= BOARD_W || y >= BOARD_H) return false;
      if (y >= 0 && this.board.get(x, y)) return false;
    }
    return true;
  }

  getProjectedDropY(): number {
    const p = this._active;
    let y = p.y;
    while (this.canAt(p.x, y + 1, p.rot)) y++;
    return y;
  }

  activeCellsAt(pos?: { x: number; y: number; rot: Rotation }): Vec[] {
    const p = this._active;
    const x0 = pos?.x ?? p.x;
    const y0 = pos?.y ?? p.y;
    const r = pos?.rot ?? p.rot;
    return p.blocks(r).map((b) => ({ x: x0 + b.x, y: y0 + b.y }));
  }

  private addScore(n: number) {
    if (n <= 0) return;
    this.score += n;
    this.onEvent({ type: "score", score: this.score });
  }

  softDropStep(): boolean {
    if (this.tryMove(0, 1)) {
      this.addScore(1);
      return true;
    }
    return false;
  }

  private gameOver(reason: GameOverReason) {
    this.over = true;
    this.onEvent({ type: "gameover", reason });
  }
}

function gravityMsForLevel(level: number): number {
  // Not exact guideline table, but captures the classic ramp.
  const l = Math.max(0, Math.min(20, level));
  const table = [
    800, 716, 633, 550, 466, 383, 300, 216, 133, 100, //
    83, 66, 55, 50, 45, 41, 37, 33, 28, 24, 20
  ];
  return table[l] ?? 20;
}

function scoreForClear(cleared: number, level: number): number {
  const base = cleared === 1 ? 100 : cleared === 2 ? 300 : cleared === 3 ? 500 : 800;
  return base * (level + 1);
}
