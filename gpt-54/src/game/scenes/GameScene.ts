import Phaser from "phaser";
import { BOARD_HEIGHT, BOARD_WIDTH, PALETTES, PIECE_COLORS, VISIBLE_NEXT } from "../config";
import {
  addHardDropScore,
  addSoftDropScore,
  canPlace,
  cellsFor,
  createInitialState,
  ghostPiece,
  gravityIntervalMs,
  hardDropDistance,
  holdPiece,
  lockActivePiece,
  movePiece,
  rotatePiece,
} from "../logic";
import type { GameOptions, PieceType, SettingsState, TetrisState } from "../types";

const CELL = 28;
const BOARD_X = 390;
const BOARD_Y = 110;
const LOCK_DELAY = 500;

export class GameScene extends Phaser.Scene {
  private state!: TetrisState;
  private options!: GameOptions;
  private settings!: SettingsState;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private gravityTimer = 0;
  private lockTimer = 0;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameOver = false;

  constructor() {
    super("game");
  }

  init(data: { options: GameOptions; settings: SettingsState }): void {
    this.options = data.options;
    this.settings = data.settings;
  }

  create(): void {
    this.state = createInitialState(this.options.startLevel);
    this.cameras.main.setBackgroundColor("#05030a");
    this.buildStage();
    this.boardGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();
    this.createHud();
    this.registerInput();
    window.__neonMatrixAudio?.startMusic(this.options.musicTheme);
    this.renderScene();
  }

  update(_: number, delta: number): void {
    if (this.paused || this.gameOver) {
      return;
    }

    this.gravityTimer += delta;

    if (this.gravityTimer >= gravityIntervalMs(this.state.level)) {
      this.gravityTimer = 0;
      if (!movePiece(this.state, 0, 1)) {
        this.lockTimer += delta;
      } else {
        this.lockTimer = 0;
      }
    }

    if (!canPlace(this.state.board, { ...this.state.active, y: this.state.active.y + 1 })) {
      this.lockTimer += delta;
      if (this.lockTimer >= LOCK_DELAY) {
        this.commitLock();
      }
    } else {
      this.lockTimer = 0;
    }

    this.renderScene();
  }

  private buildStage(): void {
    const palette = PALETTES[this.options.palette];
    const bg = this.add.graphics();
    bg.fillGradientStyle(palette.backgroundTop, palette.backgroundTop, palette.backgroundBottom, palette.backgroundBottom, 1);
    bg.fillRect(0, 0, 1280, 800);

    for (let i = 0; i < 24; i += 1) {
      const alpha = 0.03 + this.settings.crtIntensity * 0.015;
      bg.lineStyle(1, i % 2 === 0 ? palette.accent : palette.boardGlow, alpha);
      bg.strokeRect(40 + i * 8, 40 + i * 4, 1200 - i * 16, 720 - i * 8);
    }

    const boardFrame = this.add.rectangle(BOARD_X + CELL * BOARD_WIDTH / 2, BOARD_Y + CELL * BOARD_HEIGHT / 2, 344, 624, palette.panel, 0.88);
    boardFrame.setStrokeStyle(4, palette.boardGlow, 0.45);
  }

  private createHud(): void {
    this.hudTexts.score = this.add.text(90, 120, "", {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
      fontSize: "28px",
      color: "#f8efc8",
    });
    this.hudTexts.level = this.add.text(90, 190, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "24px",
      color: "#7dffb1",
    });
    this.hudTexts.lines = this.add.text(90, 228, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "24px",
      color: "#ffbe55",
    });
    this.hudTexts.hold = this.add.text(90, 320, "HOLD", {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
      fontSize: "28px",
      color: "#f8efc8",
      stroke: "#57e8ff",
      strokeThickness: 3,
    });
    this.hudTexts.next = this.add.text(980, 120, "QUEUE", {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
      fontSize: "28px",
      color: "#f8efc8",
      stroke: "#ffbe55",
      strokeThickness: 3,
    });
    this.hudTexts.status = this.add.text(930, 620, "ESC pause", {
      fontFamily: '"Courier New", monospace',
      fontSize: "20px",
      color: "#c8c08f",
    });
  }

  private registerInput(): void {
    this.input.keyboard?.on("keydown-LEFT", () => this.tryAction(() => movePiece(this.state, -1, 0), "move"));
    this.input.keyboard?.on("keydown-RIGHT", () => this.tryAction(() => movePiece(this.state, 1, 0), "move"));
    this.input.keyboard?.on("keydown-DOWN", () => {
      if (this.paused || this.gameOver) {
        return;
      }
      const moved = movePiece(this.state, 0, 1);
      if (moved) {
        addSoftDropScore(this.state);
        window.__neonMatrixAudio?.playMove();
        this.renderScene();
      } else {
        this.commitLock();
      }
    });
    this.input.keyboard?.on("keydown-UP", () => this.tryRotate(1));
    this.input.keyboard?.on("keydown-X", () => this.tryRotate(1));
    this.input.keyboard?.on("keydown-Z", () => this.tryRotate(-1));
    this.input.keyboard?.on("keydown-C", () => {
      if (this.paused || this.gameOver) {
        return;
      }
      if (holdPiece(this.state)) {
        window.__neonMatrixAudio?.playHold();
        this.lockTimer = 0;
        this.renderScene();
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.paused || this.gameOver) {
        return;
      }
      const distance = hardDropDistance(this.state);
      movePiece(this.state, 0, distance);
      addHardDropScore(this.state, distance);
      window.__neonMatrixAudio?.playDrop();
      this.commitLock();
    });
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.gameOver) {
        this.scene.start("menu");
        return;
      }
      this.togglePause();
    });
    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.gameOver) {
        this.scene.start("menu");
      }
    });
  }

  private tryAction(action: () => boolean, kind: "move"): void {
    if (this.paused || this.gameOver) {
      return;
    }
    if (action()) {
      this.lockTimer = 0;
      if (kind === "move") {
        window.__neonMatrixAudio?.playMove();
      }
      this.renderScene();
    }
  }

  private tryRotate(direction: 1 | -1): void {
    if (this.paused || this.gameOver) {
      return;
    }
    if (rotatePiece(this.state, direction)) {
      this.lockTimer = 0;
      window.__neonMatrixAudio?.playRotate();
      this.renderScene();
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.container(640, 400, [
        this.add.rectangle(0, 0, 420, 220, 0x0d0915, 0.92).setStrokeStyle(2, 0x57e8ff, 0.4),
        this.add.text(-110, -40, "PAUSED", {
          fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
          fontSize: "40px",
          color: "#f8efc8",
          stroke: "#57e8ff",
          strokeThickness: 4,
        }),
        this.add.text(-130, 28, "ESC resume\nENTER menu when game over", {
          fontFamily: '"Courier New", monospace',
          fontSize: "20px",
          color: "#ffbe55",
          align: "center",
        }),
      ]);
    } else {
      this.pauseOverlay?.destroy(true);
      this.pauseOverlay = undefined;
    }
  }

  private commitLock(): void {
    const result = lockActivePiece(this.state);
    this.lockTimer = 0;
    this.gravityTimer = 0;

    if (result.clearedRows.length > 0) {
      window.__neonMatrixAudio?.playLineClear(result.clearedRows.length);
      if (window.__neonMatrixSettings?.screenShake) {
        this.cameras.main.shake(result.clearedRows.length >= 4 ? 180 : 90, result.clearedRows.length >= 4 ? 0.01 : 0.004);
      }
      this.flashClear(result.clearedRows.length);
    } else {
      window.__neonMatrixAudio?.playDrop();
    }

    if (this.state.gameOver) {
      this.gameOver = true;
      window.__neonMatrixAudio?.playGameOver();
      this.showGameOver();
    }

    this.renderScene();
  }

  private flashClear(count: number): void {
    const flash = this.add.rectangle(640, 400, 1280, 800, count >= 4 ? 0xffe17e : 0x57e8ff, count >= 4 ? 0.18 : 0.09);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: count >= 4 ? 260 : 180,
      onComplete: () => flash.destroy(),
    });

    const particleColors = [0x57e8ff, 0xffbe55, 0x7dffb1];
    for (let i = 0; i < 18 + count * 6; i += 1) {
      const block = this.add.rectangle(
        BOARD_X + Phaser.Math.Between(0, CELL * BOARD_WIDTH),
        BOARD_Y + Phaser.Math.Between(40, CELL * BOARD_HEIGHT - 40),
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(10, 22),
        particleColors[i % particleColors.length],
        0.8,
      );
      this.tweens.add({
        targets: block,
        x: block.x + Phaser.Math.Between(-120, 120),
        y: block.y + Phaser.Math.Between(-140, 140),
        alpha: 0,
        angle: Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(250, 560),
        onComplete: () => block.destroy(),
      });
    }
  }

  private showGameOver(): void {
    const overlay = this.add.container(640, 400, [
      this.add.rectangle(0, 0, 520, 260, 0x120b18, 0.94).setStrokeStyle(3, 0xff6f76, 0.44),
      this.add.text(-165, -58, "SIGNAL LOST", {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: "44px",
        color: "#f8efc8",
        stroke: "#ff6f76",
        strokeThickness: 4,
      }),
      this.add.text(-150, 10, `Final Score ${this.state.score}\nLines ${this.state.lines}\nPress ENTER or ESC for menu`, {
        fontFamily: '"Courier New", monospace',
        fontSize: "24px",
        color: "#ffbe55",
        align: "center",
      }),
    ]);
    overlay.setDepth(100);
  }

  private drawMiniPiece(type: PieceType | null, x: number, y: number, scale = 16): void {
    if (!type) {
      return;
    }
    const cells = cellsFor({ type, rotation: 0, x: 0, y: 0 });
    this.uiGraphics.fillStyle(PIECE_COLORS[type], 1);
    cells.forEach(([cellX, cellY]) => {
      this.uiGraphics.fillRoundedRect(x + cellX * scale, y + cellY * scale, scale - 2, scale - 2, 3);
    });
  }

  private renderScene(): void {
    const palette = PALETTES[this.options.palette];
    this.boardGraphics.clear();
    this.uiGraphics.clear();

    this.boardGraphics.lineStyle(1, palette.grid, 0.45);
    for (let col = 0; col <= BOARD_WIDTH; col += 1) {
      this.boardGraphics.lineBetween(BOARD_X + col * CELL, BOARD_Y, BOARD_X + col * CELL, BOARD_Y + BOARD_HEIGHT * CELL);
    }
    for (let row = 0; row <= BOARD_HEIGHT; row += 1) {
      this.boardGraphics.lineBetween(BOARD_X, BOARD_Y + row * CELL, BOARD_X + BOARD_WIDTH * CELL, BOARD_Y + row * CELL);
    }

    this.state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) {
          return;
        }
        this.drawCell(x, y, PIECE_COLORS[cell], 1);
      });
    });

    const ghost = ghostPiece(this.state);
    cellsFor(ghost).forEach(([x, y]) => {
      if (y >= 0) {
        this.drawCell(x, y, palette.boardGlow, 0.18);
      }
    });

    cellsFor(this.state.active).forEach(([x, y]) => {
      if (y >= 0) {
        this.drawCell(x, y, PIECE_COLORS[this.state.active.type], 1);
      }
    });

    this.uiGraphics.lineStyle(2, palette.boardGlow, 0.32);
    this.uiGraphics.strokeRoundedRect(80, 350, 220, 150, 12);
    this.uiGraphics.strokeRoundedRect(960, 160, 220, 340, 12);

    this.drawMiniPiece(this.state.hold, 120, 390, 22);
    this.state.queue.slice(0, VISIBLE_NEXT).forEach((type, index) => {
      this.drawMiniPiece(type, 1000, 205 + index * 60, 16);
    });

    this.hudTexts.score.setText(`SCORE\n${this.state.score}`);
    this.hudTexts.level.setText(`LEVEL ${this.state.level}`);
    this.hudTexts.lines.setText(`LINES ${this.state.lines}`);
    const clearLabel = this.state.lockResult.clearType !== "none"
      ? this.state.lockResult.clearType.toUpperCase()
      : "STACK CLEAN";
    this.hudTexts.status.setText(`${clearLabel}\nESC pause`);
  }

  private drawCell(x: number, y: number, color: number, alpha: number): void {
    const px = BOARD_X + x * CELL;
    const py = BOARD_Y + y * CELL;
    this.boardGraphics.fillStyle(color, alpha);
    this.boardGraphics.fillRoundedRect(px + 2, py + 2, CELL - 4, CELL - 4, 5);
    this.boardGraphics.fillStyle(0xffffff, alpha * 0.2);
    this.boardGraphics.fillRoundedRect(px + 4, py + 4, CELL - 14, 6, 3);
  }
}
