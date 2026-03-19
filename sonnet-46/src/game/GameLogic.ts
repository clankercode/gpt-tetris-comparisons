/**
 * GameLogic — Pure game state machine, independent of rendering.
 * Scenes call update() and handle events through callbacks.
 */

import { Board } from './Board';
import { ActivePiece, PieceBag, TETROMINOES, TetrominoType } from './Tetromino';

export interface GameState {
  score: number;
  level: number;
  lines: number;
  highScore: number;
}

export interface GameEvents {
  onMove?: () => void;
  onRotate?: () => void;
  onDrop?: (dist: number) => void;
  onLockPiece?: () => void;
  onLinesCleared?: (lines: number, rows: number[]) => void;
  onLevelUp?: (level: number) => void;
  onGameOver?: () => void;
  onHold?: () => void;
}

// Points per lines cleared (multiplied by level)
const LINE_SCORES = [0, 100, 300, 500, 800];
const SOFT_DROP_SCORE = 1;
const HARD_DROP_SCORE = 2;

// Gravity in ms per row drop (by level 1–15)
const GRAVITY_MS = [
  0, 800, 717, 633, 550, 467, 383, 300, 217, 133, 100,
  83, 83, 83, 67, 50,
];

export class GameLogic {
  board: Board;
  bag: PieceBag;
  current: ActivePiece | null = null;
  held: TetrominoType | null = null;
  canHold: boolean = true;
  state: GameState;
  events: GameEvents = {};
  private gravityAccum = 0;
  private lockDelay = 0;
  private lockDelayLimit = 500; // ms
  private lockMoveCount = 0;
  private lockMoveMax = 15;
  private gameOver = false;
  private paused = false;
  private softDropping = false;

  // Color indices for pieces (1–7 map to I,O,T,S,Z,J,L)
  private static COLOR_MAP: Record<TetrominoType, number> = {
    I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
  };

  constructor(startLevel = 1, highScore = 0) {
    this.board = new Board();
    this.bag = new PieceBag();
    this.state = {
      score: 0,
      level: Math.max(1, Math.min(startLevel, 15)),
      lines: 0,
      highScore,
    };
    this.spawnPiece();
  }

  get isPaused(): boolean { return this.paused; }
  get isGameOver(): boolean { return this.gameOver; }
  get isSoftDropping(): boolean { return this.softDropping; }
  set isSoftDropping(v: boolean) { this.softDropping = v; }

  get gravityMs(): number {
    const lvl = Math.min(this.state.level, GRAVITY_MS.length - 1);
    return GRAVITY_MS[lvl];
  }

  getPreview(count = 3): TetrominoType[] {
    return this.bag.peek(count);
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  /** Move left/right. Returns true if moved. */
  moveHorizontal(dir: -1 | 1): boolean {
    if (!this.current || this.gameOver || this.paused) return false;
    const next = this.current.clone();
    next.col += dir;
    if (this.board.isValidPosition(next)) {
      this.current = next;
      this.resetLockDelayOnMove();
      this.events.onMove?.();
      return true;
    }
    return false;
  }

  /** Soft drop. Returns true if moved. */
  softDrop(): boolean {
    if (!this.current || this.gameOver || this.paused) return false;
    const next = this.current.clone();
    next.row += 1;
    if (this.board.isValidPosition(next)) {
      this.current = next;
      this.state.score += SOFT_DROP_SCORE;
      this.gravityAccum = 0;
      return true;
    }
    return false;
  }

  /** Hard drop — instant place. */
  hardDrop(): void {
    if (!this.current || this.gameOver || this.paused) return;
    const dist = this.board.hardDrop(this.current);
    this.state.score += dist * HARD_DROP_SCORE;
    this.events.onDrop?.(dist);
    this.lockPiece();
  }

  /** Rotate CW (dir=1) or CCW (dir=-1). Returns true if rotated. */
  rotate(dir: 1 | -1): boolean {
    if (!this.current || this.gameOver || this.paused) return false;
    const kicked = this.board.tryRotate(this.current, dir);
    if (kicked) {
      this.current = kicked;
      this.resetLockDelayOnMove();
      this.events.onRotate?.();
      return true;
    }
    return false;
  }

  /** Hold current piece. */
  hold(): void {
    if (!this.current || !this.canHold || this.gameOver || this.paused) return;
    const type = this.current.type;
    if (this.held !== null) {
      const restored = new ActivePiece(this.held, 0, 3);
      this.current = restored;
    } else {
      this.current = null;
      this.spawnPiece();
    }
    this.held = type;
    this.canHold = false;
    this.gravityAccum = 0;
    this.lockDelay = 0;
    this.events.onHold?.();
  }

  /** Call every frame with delta ms. */
  update(delta: number): void {
    if (this.gameOver || this.paused || !this.current) return;

    const gravity = this.softDropping
      ? Math.min(this.gravityMs / 20, 50)
      : this.gravityMs;

    this.gravityAccum += delta;

    if (this.gravityAccum >= gravity) {
      this.gravityAccum = 0;
      const canFall = this.board.canMove(this.current, 1, 0);
      if (canFall) {
        this.current.row += 1;
        this.lockDelay = 0;
      } else {
        // Piece is on ground — start lock delay
        this.lockDelay += delta;
        if (this.lockDelay >= this.lockDelayLimit) {
          this.lockPiece();
        }
      }
    } else if (!this.board.canMove(this.current, 1, 0)) {
      this.lockDelay += delta;
      if (this.lockDelay >= this.lockDelayLimit) {
        this.lockPiece();
      }
    }
  }

  private lockPiece(): void {
    if (!this.current) return;

    const colorIndex = GameLogic.COLOR_MAP[this.current.type];
    this.board.placePiece(this.current, colorIndex);
    this.events.onLockPiece?.();

    // Check top-out
    if (this.board.isTopOut()) {
      this.gameOver = true;
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
      }
      this.events.onGameOver?.();
      return;
    }

    const { linesCleared, clearedRows } = this.board.clearLines();
    if (linesCleared > 0) {
      const points = LINE_SCORES[linesCleared] * this.state.level;
      this.state.score += points;
      this.state.lines += linesCleared;

      const newLevel = Math.floor(this.state.lines / 10) + 1;
      const didLevelUp = newLevel > this.state.level;
      this.state.level = Math.min(newLevel, 15);

      this.events.onLinesCleared?.(linesCleared, clearedRows);
      if (didLevelUp) this.events.onLevelUp?.(this.state.level);
    }

    this.current = null;
    this.spawnPiece();
    this.canHold = true;
    this.lockDelay = 0;
    this.lockMoveCount = 0;
    this.gravityAccum = 0;
  }

  private spawnPiece(): void {
    const type = this.bag.next();
    this.current = new ActivePiece(type, 0, 3);

    // Check for game over at spawn
    if (!this.board.isValidPosition(this.current)) {
      // Try one row higher
      this.current.row = -1;
      if (!this.board.isValidPosition(this.current)) {
        this.gameOver = true;
        if (this.state.score > this.state.highScore) {
          this.state.highScore = this.state.score;
        }
        this.events.onGameOver?.();
        this.current = null;
      }
    }
  }

  private resetLockDelayOnMove(): void {
    if (this.lockMoveCount < this.lockMoveMax) {
      this.lockDelay = 0;
      this.lockMoveCount++;
    }
  }
}

/** Color palette — index 1–7 maps to tetromino colors */
export const PIECE_COLORS: Record<number, number> = {
  1: 0x00f0f0, // I - cyan
  2: 0xf0f000, // O - yellow
  3: 0xa000f0, // T - purple
  4: 0x00f000, // S - green
  5: 0xf00000, // Z - red
  6: 0x0000f0, // J - blue
  7: 0xf0a000, // L - orange
};

export const PIECE_GLOW_COLORS: Record<number, number> = {
  1: 0x88ffff,
  2: 0xffff88,
  3: 0xcc88ff,
  4: 0x88ff88,
  5: 0xff8888,
  6: 0x8888ff,
  7: 0xffcc88,
};
