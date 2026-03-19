import Phaser from "phaser";
import type { Settings, GameOptions, GameState, PieceType } from "../types";
import {
  COLS, ROWS, HIDDEN_ROWS, CELL_SIZE, GAME_WIDTH, GAME_HEIGHT,
  BOARD_X, BOARD_Y, PIECE_COLORS, PIECE_GLOW_COLORS,
  BOARD_BG_COLOR, GRID_COLOR, BG_COLOR,
  TEXT_COLOR, TEXT_COLOR_DIM, ACCENT_COLOR,
  GRAVITY_SPEEDS, LOCK_DELAY, MAX_LOCK_RESETS,
  DAS_DELAY, DAS_RATE, SHAPES,
} from "../config";
import {
  createGameState, movePiece, rotatePiece, softDrop, hardDrop,
  holdPiece, isOnGround, getGhostY, lockAndSpawn,
} from "../logic";
import { RetroAudio } from "../audio";

// ── Particle for line clear effect ─────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private options!: GameOptions;
  private settings!: Settings;

  private gfx!: Phaser.GameObjects.Graphics;
  private uiGfx!: Phaser.GameObjects.Graphics;
  private effectGfx!: Phaser.GameObjects.Graphics;
  private scanlineGfx!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];

  // Timing
  private gravityTimer = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private isLocking = false;

  // DAS (auto-repeat)
  private dasDirection: -1 | 0 | 1 = 0;
  private dasTimer = 0;
  private dasActive = false;

  // Soft drop held
  private softDropHeld = false;

  // Pause
  private paused = false;

  // Effects
  private particles: Particle[] = [];
  private flashAlpha = 0;
  private lineClearRows: number[] = [];
  private lineClearTimer = 0;
  private shakeIntensity = 0;
  private shakeTimer = 0;

  // Animation timer
  private animTimer = 0;

  // Game over
  private gameOverTimer = 0;

  // Keys
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    p: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    escape: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: "game" });
  }

  init(data: { options: GameOptions; settings: Settings }): void {
    this.options = data.options;
    this.settings = data.settings;
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.uiGfx = this.add.graphics();
    this.effectGfx = this.add.graphics();
    this.scanlineGfx = this.add.graphics();
    this.texts = [];
    this.particles = [];
    this.flashAlpha = 0;
    this.shakeIntensity = 0;
    this.shakeTimer = 0;
    this.animTimer = 0;
    this.gameOverTimer = 0;
    this.paused = false;
    this.softDropHeld = false;
    this.dasDirection = 0;
    this.dasTimer = 0;
    this.dasActive = false;

    // Create game state
    this.state = createGameState(this.options.startLevel);

    // Init timing
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.isLocking = false;

    // Setup keys
    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      p: kb.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      escape: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    // Start music
    this.audio?.resume();
    this.audio?.startMusic(this.options.musicTheme);

    // Draw static scanlines
    this.drawScanlines();
  }

  private get audio(): RetroAudio | undefined {
    return window.__retroTetrisAudio;
  }

  update(_time: number, delta: number): void {
    this.animTimer += delta;

    if (this.state.gameOver) {
      this.gameOverTimer += delta;
      this.handleGameOverInput();
      this.updateParticles(delta);
      this.draw();
      return;
    }

    if (this.paused) {
      this.draw();
      return;
    }

    this.handleInput(delta);
    this.updateGravity(delta);
    this.updateLock(delta);
    this.updateEffects(delta);
    this.updateParticles(delta);
    this.draw();
  }

  // ── Input handling ────────────────────────────────────────────

  private handleInput(delta: number): void {
    if (!this.state.current) return;

    // Pause
    if (Phaser.Input.Keyboard.JustDown(this.keys.p)) {
      this.paused = !this.paused;
      return;
    }

    // Rotate CW (Up arrow)
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      if (rotatePiece(this.state.board, this.state.current, true)) {
        this.audio?.playRotate();
        this.onMoveResetLock();
      }
    }

    // Rotate CCW (Z)
    if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
      if (rotatePiece(this.state.board, this.state.current, false)) {
        this.audio?.playRotate();
        this.onMoveResetLock();
      }
    }

    // Hard drop (Space)
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      const result = hardDrop(this.state);
      this.audio?.playDrop();
      if (result.linesCleared > 0) {
        this.onLinesClear(result.linesCleared);
      }
      this.resetLockState();
      this.gravityTimer = 0;
    }

    // Hold (Shift)
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
      if (holdPiece(this.state)) {
        this.audio?.playHold();
        this.resetLockState();
      }
    }

    // Escape to menu
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.audio?.stopMusic();
      this.scene.start("menu");
      return;
    }

    // Horizontal movement with DAS
    const leftPressed = this.keys.left.isDown;
    const rightPressed = this.keys.right.isDown;

    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.dasDirection = -1;
      this.dasTimer = 0;
      this.dasActive = false;
      if (movePiece(this.state.board, this.state.current, -1, 0)) {
        this.audio?.playMove();
        this.onMoveResetLock();
      }
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.dasDirection = 1;
      this.dasTimer = 0;
      this.dasActive = false;
      if (movePiece(this.state.board, this.state.current, 1, 0)) {
        this.audio?.playMove();
        this.onMoveResetLock();
      }
    }

    // DAS auto-repeat
    if (this.dasDirection !== 0) {
      const isHeld = this.dasDirection === -1 ? leftPressed : rightPressed;
      if (isHeld) {
        this.dasTimer += delta;
        if (!this.dasActive && this.dasTimer >= DAS_DELAY) {
          this.dasActive = true;
          this.dasTimer = 0;
        }
        if (this.dasActive) {
          while (this.dasTimer >= DAS_RATE) {
            this.dasTimer -= DAS_RATE;
            if (movePiece(this.state.board, this.state.current, this.dasDirection, 0)) {
              this.onMoveResetLock();
            }
          }
        }
      } else {
        this.dasDirection = 0;
        this.dasTimer = 0;
        this.dasActive = false;
      }
    }

    // Soft drop
    this.softDropHeld = this.keys.down.isDown;
  }

  private handleGameOverInput(): void {
    if (this.gameOverTimer < 1000) return; // Grace period

    if (Phaser.Input.Keyboard.JustDown(this.keys.space) ||
        Phaser.Input.Keyboard.JustDown(this.keys.escape) ||
        Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.audio?.stopMusic();
      this.scene.start("menu");
    }
  }

  // ── Gravity & locking ────────────────────────────────────────

  private updateGravity(delta: number): void {
    if (!this.state.current) return;

    const speed = this.softDropHeld
      ? Math.min(GRAVITY_SPEEDS[this.state.level] || 10, 50)
      : (GRAVITY_SPEEDS[this.state.level] || 10);

    this.gravityTimer += delta;

    while (this.gravityTimer >= speed) {
      this.gravityTimer -= speed;

      if (this.softDropHeld) {
        if (softDrop(this.state)) {
          // moved down
        }
      } else {
        if (!movePiece(this.state.board, this.state.current!, 0, 1)) {
          // Can't move down, start lock
          if (!this.isLocking) {
            this.isLocking = true;
            this.lockTimer = 0;
          }
        }
      }
    }
  }

  private updateLock(delta: number): void {
    if (!this.state.current || !this.isLocking) return;

    // Check if piece is still on ground
    if (!isOnGround(this.state.board, this.state.current)) {
      this.isLocking = false;
      this.lockTimer = 0;
      return;
    }

    this.lockTimer += delta;
    if (this.lockTimer >= LOCK_DELAY) {
      // Lock the piece
      const linesCleared = lockAndSpawn(this.state);
      if (linesCleared > 0) {
        this.onLinesClear(linesCleared);
      }
      this.resetLockState();

      if (this.state.gameOver) {
        this.audio?.stopMusic();
        this.audio?.playGameOver();
      }
    }
  }

  private onMoveResetLock(): void {
    if (this.isLocking && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  private resetLockState(): void {
    this.isLocking = false;
    this.lockTimer = 0;
    this.lockResets = 0;
  }

  // ── Line clear effects ───────────────────────────────────────

  private onLinesClear(count: number): void {
    this.audio?.playLineClear(count);

    // Flash effect
    this.flashAlpha = count >= 4 ? 0.5 : 0.25;

    // Camera shake
    if (this.settings.screenShake) {
      this.shakeIntensity = count >= 4 ? 8 : count >= 2 ? 4 : 2;
      this.shakeTimer = count >= 4 ? 400 : 200;
    }

    // Spawn particles
    for (let i = 0; i < count * 15; i++) {
      this.particles.push({
        x: BOARD_X + Math.random() * COLS * CELL_SIZE,
        y: BOARD_Y + Math.random() * ROWS * CELL_SIZE,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300 - 100,
        life: 600 + Math.random() * 400,
        maxLife: 600 + Math.random() * 400,
        color: [0x00ff88, 0x00ffcc, 0xff6600, 0xffff00, 0x00ffff][Math.floor(Math.random() * 5)],
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateEffects(delta: number): void {
    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - delta / 200);
    }

    // Shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
        this.cameras.main.setScroll(0, 0);
      } else {
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        this.cameras.main.setScroll(ox, oy);
      }
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta / 1000;
      p.y += p.vy * delta / 1000;
      p.vy += 400 * delta / 1000; // gravity
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────────────

  private clearTexts(): void {
    for (const t of this.texts) t.destroy();
    this.texts = [];
  }

  private addText(x: number, y: number, text: string, color: string, size = 14, align = "left"): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      align: align as "left" | "center" | "right",
    });
    if (align === "center") t.setOrigin(0.5, 0);
    else if (align === "right") t.setOrigin(1, 0);
    this.texts.push(t);
    return t;
  }

  private drawScanlines(): void {
    if (!this.settings.crtEffect) return;
    this.scanlineGfx.clear();
    this.scanlineGfx.fillStyle(0x000000, 0.12);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      this.scanlineGfx.fillRect(0, y, GAME_WIDTH, 1);
    }
    this.scanlineGfx.setDepth(1000);
  }

  private draw(): void {
    this.gfx.clear();
    this.uiGfx.clear();
    this.effectGfx.clear();
    this.clearTexts();

    // Background
    this.gfx.fillStyle(BG_COLOR, 1);
    this.gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawBoard();
    this.drawGhost();
    this.drawCurrentPiece();
    this.drawUI();
    this.drawParticles();
    this.drawFlash();

    if (this.paused) this.drawPauseOverlay();
    if (this.state.gameOver) this.drawGameOverOverlay();
  }

  private drawBoard(): void {
    const bx = BOARD_X;
    const by = BOARD_Y;
    const bw = COLS * CELL_SIZE;
    const bh = ROWS * CELL_SIZE;

    // Board background
    this.gfx.fillStyle(BOARD_BG_COLOR, 1);
    this.gfx.fillRect(bx, by, bw, bh);

    // Grid lines
    this.gfx.lineStyle(1, GRID_COLOR, 0.4);
    for (let x = 0; x <= COLS; x++) {
      this.gfx.lineBetween(bx + x * CELL_SIZE, by, bx + x * CELL_SIZE, by + bh);
    }
    for (let y = 0; y <= ROWS; y++) {
      this.gfx.lineBetween(bx, by + y * CELL_SIZE, bx + bw, by + y * CELL_SIZE);
    }

    // Locked cells
    for (let r = HIDDEN_ROWS; r < HIDDEN_ROWS + ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.state.board[r][c];
        if (cell !== null) {
          this.drawCell(bx + c * CELL_SIZE, by + (r - HIDDEN_ROWS) * CELL_SIZE, cell);
        }
      }
    }

    // Board border
    this.gfx.lineStyle(2, 0x00ff88, 0.6);
    this.gfx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
  }

  private drawCell(x: number, y: number, type: PieceType, alpha = 1): void {
    const color = PIECE_COLORS[type];
    const glow = PIECE_GLOW_COLORS[type];
    const s = CELL_SIZE;

    // Main fill
    this.gfx.fillStyle(color, 0.85 * alpha);
    this.gfx.fillRect(x + 1, y + 1, s - 2, s - 2);

    // Inner highlight (top-left)
    this.gfx.fillStyle(glow, 0.4 * alpha);
    this.gfx.fillRect(x + 1, y + 1, s - 2, 3);
    this.gfx.fillRect(x + 1, y + 1, 3, s - 2);

    // Inner shadow (bottom-right)
    this.gfx.fillStyle(0x000000, 0.3 * alpha);
    this.gfx.fillRect(x + 1, y + s - 4, s - 2, 3);
    this.gfx.fillRect(x + s - 4, y + 1, 3, s - 2);
  }

  private drawGhost(): void {
    if (!this.state.current) return;
    const piece = this.state.current;
    const ghostY = getGhostY(this.state.board, piece);

    if (ghostY === piece.pos.y) return; // already at bottom

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 0) continue;
        const bx = piece.pos.x + c;
        const by = ghostY + r - HIDDEN_ROWS;
        if (by < 0) continue;

        const x = BOARD_X + bx * CELL_SIZE;
        const y = BOARD_Y + by * CELL_SIZE;
        const color = PIECE_COLORS[piece.type];

        this.gfx.lineStyle(1, color, 0.3);
        this.gfx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }
  }

  private drawCurrentPiece(): void {
    if (!this.state.current) return;
    const piece = this.state.current;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 0) continue;
        const bx = piece.pos.x + c;
        const by = piece.pos.y + r - HIDDEN_ROWS;
        if (by < 0) continue;

        this.drawCell(BOARD_X + bx * CELL_SIZE, BOARD_Y + by * CELL_SIZE, piece.type);
      }
    }
  }

  private drawUI(): void {
    const rightX = BOARD_X + COLS * CELL_SIZE + 20;

    // Score
    this.addText(rightX, BOARD_Y, "SCORE", TEXT_COLOR_DIM, 11);
    this.addText(rightX, BOARD_Y + 15, String(this.state.score), TEXT_COLOR, 16);

    // Level
    this.addText(rightX, BOARD_Y + 45, "LEVEL", TEXT_COLOR_DIM, 11);
    this.addText(rightX, BOARD_Y + 60, String(this.state.level), TEXT_COLOR, 16);

    // Lines
    this.addText(rightX, BOARD_Y + 90, "LINES", TEXT_COLOR_DIM, 11);
    this.addText(rightX, BOARD_Y + 105, String(this.state.lines), TEXT_COLOR, 16);

    // Next pieces
    this.addText(rightX, BOARD_Y + 145, "NEXT", TEXT_COLOR_DIM, 11);
    for (let i = 0; i < Math.min(3, this.state.nextQueue.length); i++) {
      this.drawMiniPiece(rightX + 5, BOARD_Y + 165 + i * 55, this.state.nextQueue[i]);
    }

    // Hold piece
    this.addText(rightX, BOARD_Y + 340, "HOLD", TEXT_COLOR_DIM, 11);
    if (this.state.held) {
      this.drawMiniPiece(rightX + 5, BOARD_Y + 358, this.state.held, !this.state.canHold ? 0.4 : 1);
    }
  }

  private drawMiniPiece(ox: number, oy: number, type: PieceType, alpha = 1): void {
    const shape = SHAPES[type];
    const miniSize = 10;
    const color = PIECE_COLORS[type];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 0) continue;
        this.uiGfx.fillStyle(color, 0.8 * alpha);
        this.uiGfx.fillRect(ox + c * miniSize, oy + r * miniSize, miniSize - 1, miniSize - 1);
      }
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.effectGfx.fillStyle(p.color, alpha);
      this.effectGfx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  private drawFlash(): void {
    if (this.flashAlpha > 0) {
      this.effectGfx.fillStyle(0xffffff, this.flashAlpha);
      this.effectGfx.fillRect(
        BOARD_X, BOARD_Y,
        COLS * CELL_SIZE, ROWS * CELL_SIZE
      );
    }
  }

  private drawPauseOverlay(): void {
    this.effectGfx.fillStyle(0x000000, 0.7);
    this.effectGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "PAUSED", "#00ffcc", 32, "center");
    this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, "Press P to resume", TEXT_COLOR_DIM, 14, "center");
    this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, "Press ESC for menu", TEXT_COLOR_DIM, 14, "center");
  }

  private drawGameOverOverlay(): void {
    const progress = Math.min(1, this.gameOverTimer / 1500);

    // Darkening overlay
    this.effectGfx.fillStyle(0x0a0a12, 0.8 * progress);
    this.effectGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (progress > 0.3) {
      // Glitch lines
      const glitchCount = Math.floor((progress - 0.3) * 10);
      for (let i = 0; i < glitchCount; i++) {
        const gy = Math.sin(this.animTimer / 100 + i * 7) * GAME_HEIGHT / 2 + GAME_HEIGHT / 2;
        this.effectGfx.fillStyle(0xff3333, 0.1 + Math.random() * 0.1);
        this.effectGfx.fillRect(0, gy, GAME_WIDTH, 2);
      }
    }

    if (progress > 0.5) {
      this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, "SIGNAL LOST", "#ff3333", 28, "center");

      const blink = Math.sin(this.animTimer / 400) > 0;
      if (blink) {
        this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "GAME OVER", ACCENT_COLOR, 36, "center");
      }

      // Final stats
      if (progress > 0.8) {
        this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35, `SCORE: ${this.state.score}`, TEXT_COLOR, 16, "center");
        this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 58, `LINES: ${this.state.lines}`, TEXT_COLOR, 16, "center");
        this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 81, `LEVEL: ${this.state.level}`, TEXT_COLOR, 16, "center");

        if (this.gameOverTimer > 1500) {
          const blink2 = Math.sin(this.animTimer / 500) > 0;
          if (blink2) {
            this.addText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, "PRESS SPACE TO CONTINUE", TEXT_COLOR_DIM, 12, "center");
          }
        }
      }
    }
  }
}
