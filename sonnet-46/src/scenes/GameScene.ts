import Phaser from 'phaser';
import { BOARD_COLS, BOARD_ROWS } from '../game/Board';
import { GameLogic, PIECE_COLORS, PIECE_GLOW_COLORS } from '../game/GameLogic';
import { TETROMINOES, TetrominoType } from '../game/Tetromino';
import { musicEngine } from '../audio/MusicEngine';
import { MenuScene } from './MenuScene';

const CELL = 30;
const BOARD_PX_W = BOARD_COLS * CELL;
const BOARD_PX_H = BOARD_ROWS * CELL;
const PANEL_W = 140;
const HOLD_PANEL_X_OFFSET = -PANEL_W - 10;

interface GameSceneData {
  startLevel?: number;
}

export class GameScene extends Phaser.Scene {
  private logic!: GameLogic;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private scanlines!: Phaser.GameObjects.Graphics;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private ox = 0; // board origin x
  private oy = 0; // board origin y
  private clearingRows: number[] = [];
  private clearAnimTime = 0;
  private clearAnimDuration = 400;
  private isClearingLines = false;
  private lockFlashTime = 0;
  private lockFlashing = false;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private hiScoreText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private gameOverOverlay!: Phaser.GameObjects.Container;
  private comboText: Phaser.GameObjects.Text | null = null;
  private comboTween: Phaser.Tweens.Tween | null = null;
  private inputAccum: Record<string, number> = {};
  private readonly DAS = 167; // Delayed Auto Shift ms
  private readonly ARR = 33;  // Auto Repeat Rate ms
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftHeld = false;
  private rightHeld = false;
  private downHeld = false;
  private leftDas = 0;
  private rightDas = 0;
  private downTimer = 0;
  private glowTime = 0;
  private startLevel = 1;
  private levelUpFlash = false;
  private levelUpTimer = 0;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: GameSceneData): void {
    this.startLevel = data?.startLevel ?? MenuScene.startLevel;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.ox = (W - BOARD_PX_W) / 2;
    this.oy = (H - BOARD_PX_H) / 2;

    // Background
    this.add.rectangle(0, 0, W, H, 0x050510).setOrigin(0).setDepth(0);

    // Starfield
    this.createStarfield(W, H);

    // Graphics layers
    this.boardGraphics = this.add.graphics().setDepth(5);
    this.uiGraphics = this.add.graphics().setDepth(6);

    // Flash overlay for line clear
    this.flashRect = this.add.rectangle(0, 0, W, H, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(20);

    // Scanlines
    this.scanlines = this.add.graphics().setDepth(99);
    this.drawScanlines(W, H);

    // Game logic
    this.logic = new GameLogic(this.startLevel, this.getHighScore());
    this.setupEvents();

    // UI texts
    this.setupUI(W, H);

    // Pause overlay
    this.setupPauseOverlay(W, H);

    // Game over overlay
    this.setupGameOverOverlay(W, H);

    // Input
    this.setupInput();

    // Fade in
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 400 });
  }

  private createStarfield(W: number, H: number): void {
    const g = this.add.graphics().setDepth(1);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() < 0.8 ? 1 : 1.5;
      const a = 0.1 + Math.random() * 0.4;
      g.fillStyle(0xaaaaff, a);
      g.fillCircle(x, y, r);
    }
  }

  private drawScanlines(W: number, H: number): void {
    const g = this.scanlines;
    g.clear();
    for (let y = 0; y < H; y += 3) {
      g.fillStyle(0x000000, 0.15);
      g.fillRect(0, y, W, 1);
    }
  }

  private setupEvents(): void {
    this.logic.events.onMove = () => {
      if (MenuScene.sfxEnabled) musicEngine.playSfx('move');
    };
    this.logic.events.onRotate = () => {
      if (MenuScene.sfxEnabled) musicEngine.playSfx('rotate');
    };
    this.logic.events.onDrop = () => {
      if (MenuScene.sfxEnabled) musicEngine.playSfx('drop');
      this.lockFlashing = true;
      this.lockFlashTime = 0;
    };
    this.logic.events.onLockPiece = () => {
      this.lockFlashing = true;
      this.lockFlashTime = 0;
    };
    this.logic.events.onLinesCleared = (lines: number, rows: number[]) => {
      this.clearingRows = rows;
      this.clearAnimTime = 0;
      this.isClearingLines = true;
      if (MenuScene.sfxEnabled) {
        musicEngine.playSfx(lines === 4 ? 'tetris' : 'line');
      }
      this.showLineClearEffect(lines, rows);
    };
    this.logic.events.onLevelUp = (level: number) => {
      if (MenuScene.sfxEnabled) musicEngine.playSfx('levelup');
      this.levelUpFlash = true;
      this.levelUpTimer = 0;
      this.showFloatingText('LEVEL UP!', 0xffff00);
    };
    this.logic.events.onGameOver = () => {
      if (MenuScene.sfxEnabled) musicEngine.playSfx('gameover');
      this.saveHighScore(this.logic.state.score);
      this.time.delayedCall(500, () => {
        this.showGameOver();
      });
    };
  }

  private setupUI(W: number, H: number): void {
    const rightX = this.ox + BOARD_PX_W + 15;
    const leftX = this.ox + HOLD_PANEL_X_OFFSET;

    // Score panel (right)
    const panelStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#448888',
    };
    const valueStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: '#00f0f0',
    };

    this.add.text(rightX, this.oy, 'SCORE', panelStyle).setDepth(10);
    this.scoreText = this.add.text(rightX, this.oy + 18, '0', valueStyle).setDepth(10);

    this.add.text(rightX, this.oy + 50, 'HI-SCORE', panelStyle).setDepth(10);
    this.hiScoreText = this.add.text(rightX, this.oy + 68, `${this.getHighScore()}`, valueStyle).setDepth(10);

    this.add.text(rightX, this.oy + 110, 'LEVEL', panelStyle).setDepth(10);
    this.levelText = this.add.text(rightX, this.oy + 128, `${this.startLevel}`, valueStyle).setDepth(10);

    this.add.text(rightX, this.oy + 160, 'LINES', panelStyle).setDepth(10);
    this.linesText = this.add.text(rightX, this.oy + 178, '0', valueStyle).setDepth(10);

    // NEXT label
    this.add.text(rightX, this.oy + 220, 'NEXT', panelStyle).setDepth(10);

    // HOLD label
    this.add.text(leftX, this.oy, 'HOLD', panelStyle).setDepth(10);
  }

  private setupPauseOverlay(W: number, H: number): void {
    this.pauseOverlay = this.add.container(0, 0).setDepth(50).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0);
    const text = this.add.text(W / 2, H / 2 - 30, 'PAUSED', {
      fontFamily: '"Press Start 2P"',
      fontSize: '32px',
      color: '#00f0f0',
      stroke: '#003333',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const hint = this.add.text(W / 2, H / 2 + 20, 'P / ESC to resume', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(0.5);
    const menuHint = this.add.text(W / 2, H / 2 + 50, 'ENTER to quit to menu', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#555555',
    }).setOrigin(0.5);
    this.pauseOverlay.add([bg, text, hint, menuHint]);
  }

  private setupGameOverOverlay(W: number, H: number): void {
    this.gameOverOverlay = this.add.container(0, 0).setDepth(60).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.8).setOrigin(0);
    const text = this.add.text(W / 2, H / 2 - 60, 'GAME OVER', {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#f00000',
      stroke: '#330000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const scoreLabel = this.add.text(W / 2, H / 2 - 10, `SCORE: ${this.logic?.state.score ?? 0}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const menuHint = this.add.text(W / 2, H / 2 + 30, 'ENTER / SPACE  Play Again', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#00f0f0',
    }).setOrigin(0.5);
    const quitHint = this.add.text(W / 2, H / 2 + 58, 'ESC  Main Menu', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(0.5);
    this.gameOverOverlay.add([bg, text, scoreLabel, menuHint, quitHint]);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.downKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    kb.on('keydown-LEFT', () => {
      this.leftHeld = true;
      this.leftDas = 0;
      this.logic.moveHorizontal(-1);
    });
    kb.on('keyup-LEFT', () => {
      this.leftHeld = false;
      this.leftDas = 0;
    });
    kb.on('keydown-RIGHT', () => {
      this.rightHeld = true;
      this.rightDas = 0;
      this.logic.moveHorizontal(1);
    });
    kb.on('keyup-RIGHT', () => {
      this.rightHeld = false;
      this.rightDas = 0;
    });
    kb.on('keydown-DOWN', () => {
      this.downHeld = true;
      this.logic.isSoftDropping = true;
    });
    kb.on('keyup-DOWN', () => {
      this.downHeld = false;
      this.logic.isSoftDropping = false;
    });
    kb.on('keydown-SPACE', () => {
      if (this.logic.isGameOver) { this.restartGame(); return; }
      if (this.logic.isPaused) return;
      this.logic.hardDrop();
    });
    kb.on('keydown-UP', () => this.logic.rotate(1));
    kb.on('keydown-X', () => this.logic.rotate(1));
    kb.on('keydown-Z', () => this.logic.rotate(-1));
    kb.on('keydown-C', () => this.logic.hold());
    kb.on('keydown-SHIFT', () => this.logic.hold());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ESC', () => {
      if (this.logic.isGameOver) {
        this.goToMenu();
        return;
      }
      this.togglePause();
    });
    kb.on('keydown-ENTER', () => {
      if (this.logic.isGameOver) { this.restartGame(); return; }
      if (this.logic.isPaused) {
        // check if we want to quit
        this.goToMenu();
      }
    });
  }

  private togglePause(): void {
    if (this.logic.isGameOver) return;
    this.logic.togglePause();
    this.pauseOverlay.setVisible(this.logic.isPaused);
  }

  private showGameOver(): void {
    // Update score in overlay
    const scoreLabel = this.gameOverOverlay.getAt(2) as Phaser.GameObjects.Text;
    scoreLabel.setText(`SCORE: ${this.logic.state.score}`);
    this.gameOverOverlay.setVisible(true);
    this.gameOverOverlay.setAlpha(0);
    this.tweens.add({ targets: this.gameOverOverlay, alpha: 1, duration: 600 });
  }

  private restartGame(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ startLevel: this.startLevel });
    });
  }

  private goToMenu(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Menu');
    });
  }

  private showLineClearEffect(lines: number, rows: number[]): void {
    const alpha = lines === 4 ? 0.9 : 0.5;
    this.flashRect.setAlpha(alpha);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 350 });

    if (lines === 4) {
      this.showFloatingText('TETRIS!!', 0x00f0f0);
    } else if (lines === 3) {
      this.showFloatingText('TRIPLE!', 0xf0f000);
    } else if (lines === 2) {
      this.showFloatingText('DOUBLE!', 0x00f000);
    }
  }

  private showFloatingText(msg: string, color: number): void {
    if (this.comboTween) this.comboTween.stop();
    if (this.comboText) this.comboText.destroy();

    const W = this.scale.width;
    this.comboText = this.add.text(W / 2, this.oy + BOARD_PX_H / 2, msg, {
      fontFamily: '"Press Start 2P"',
      fontSize: '22px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    this.comboTween = this.tweens.add({
      targets: this.comboText,
      alpha: { from: 0, to: 1 },
      y: { from: this.oy + BOARD_PX_H / 2 + 10, to: this.oy + BOARD_PX_H / 2 - 30 },
      duration: 250,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          alpha: 0,
          delay: 600,
          duration: 300,
        });
      },
    });
  }

  update(_time: number, delta: number): void {
    this.glowTime += delta;

    if (!this.logic) return;

    // DAS/ARR input
    if (!this.logic.isPaused && !this.logic.isGameOver) {
      this.handleDAS(delta);
      this.logic.update(delta);
    }

    // Update UI texts
    this.scoreText.setText(`${this.logic.state.score}`);
    this.levelText.setText(`${this.logic.state.level}`);
    this.linesText.setText(`${this.logic.state.lines}`);
    if (this.logic.state.score > this.logic.state.highScore - 1) {
      this.hiScoreText.setText(`${Math.max(this.logic.state.score, this.logic.state.highScore)}`);
    }

    // Level up flash
    if (this.levelUpFlash) {
      this.levelUpTimer += delta;
      if (this.levelUpTimer > 500) this.levelUpFlash = false;
    }

    // Lock flash
    if (this.lockFlashing) {
      this.lockFlashTime += delta;
      if (this.lockFlashTime > 80) this.lockFlashing = false;
    }

    // Line clear anim
    if (this.isClearingLines) {
      this.clearAnimTime += delta;
      if (this.clearAnimTime >= this.clearAnimDuration) {
        this.isClearingLines = false;
        this.clearingRows = [];
      }
    }

    this.drawBoard();
    this.drawUI();
  }

  private handleDAS(delta: number): void {
    if (this.leftHeld) {
      this.leftDas += delta;
      if (this.leftDas > this.DAS) {
        this.inputAccum['left'] = (this.inputAccum['left'] ?? 0) + delta;
        if (this.inputAccum['left'] >= this.ARR) {
          this.inputAccum['left'] = 0;
          this.logic.moveHorizontal(-1);
        }
      }
    } else {
      this.inputAccum['left'] = 0;
    }
    if (this.rightHeld) {
      this.rightDas += delta;
      if (this.rightDas > this.DAS) {
        this.inputAccum['right'] = (this.inputAccum['right'] ?? 0) + delta;
        if (this.inputAccum['right'] >= this.ARR) {
          this.inputAccum['right'] = 0;
          this.logic.moveHorizontal(1);
        }
      }
    } else {
      this.inputAccum['right'] = 0;
    }
  }

  private drawBoard(): void {
    const g = this.boardGraphics;
    g.clear();

    const ox = this.ox;
    const oy = this.oy;

    // Board background
    g.fillStyle(0x000811, 1);
    g.fillRect(ox - 2, oy - 2, BOARD_PX_W + 4, BOARD_PX_H + 4);

    // Grid lines
    g.lineStyle(1, 0x0a1a2a, 1);
    for (let c = 0; c <= BOARD_COLS; c++) {
      g.strokeLineShape(new Phaser.Geom.Line(ox + c * CELL, oy, ox + c * CELL, oy + BOARD_PX_H));
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      g.strokeLineShape(new Phaser.Geom.Line(ox, oy + r * CELL, ox + BOARD_PX_W, oy + r * CELL));
    }

    // Placed cells
    const vis = this.logic.board.getVisibleGrid();
    const clearProgress = this.isClearingLines
      ? Math.min(1, this.clearAnimTime / this.clearAnimDuration)
      : 1;

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = vis[r][c];
        if (cell === 0) continue;

        const isClearRow = this.clearingRows.includes(r);

        if (isClearRow) {
          // Flash animation: white pulse then fade
          const flashAlpha = clearProgress < 0.5
            ? 1
            : 1 - (clearProgress - 0.5) * 2;
          g.fillStyle(0xffffff, flashAlpha);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
          continue;
        }

        const color = PIECE_COLORS[cell] ?? 0x888888;
        const glowColor = PIECE_GLOW_COLORS[cell] ?? 0xaaaaaa;

        g.fillStyle(color, 0.9);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);

        // Top/left highlight
        g.fillStyle(0xffffff, 0.25);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, 4);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, 4, CELL - 2);

        // Bottom/right shadow
        g.fillStyle(0x000000, 0.3);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + CELL - 5, CELL - 2, 4);
        g.fillRect(ox + c * CELL + CELL - 5, oy + r * CELL + 1, 4, CELL - 2);
      }
    }

    // Ghost piece
    if (this.logic.current && !this.logic.isGameOver) {
      const ghost = this.logic.board.getGhostPiece(this.logic.current);
      const ghostColorIdx = this.pieceColorIdx(this.logic.current.type);
      const ghostColor = PIECE_COLORS[ghostColorIdx] ?? 0x888888;

      for (const [r, c] of ghost.cells) {
        if (r < 0 || r >= BOARD_ROWS) continue;
        g.fillStyle(ghostColor, 0.18);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
        g.lineStyle(1, ghostColor, 0.35);
        g.strokeRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    // Active piece
    if (this.logic.current && !this.logic.isGameOver) {
      const piece = this.logic.current;
      const colorIdx = this.pieceColorIdx(piece.type);
      const color = PIECE_COLORS[colorIdx] ?? 0xffffff;
      const glowColor = PIECE_GLOW_COLORS[colorIdx] ?? 0xffffff;

      // Glow pulse
      const glow = this.lockFlashing ? 0.6 : 0.1 + 0.08 * Math.sin(this.glowTime / 300);

      for (const [r, c] of piece.cells) {
        if (r < 0 || r >= BOARD_ROWS) continue;
        // Glow halo
        g.fillStyle(glowColor, glow);
        g.fillRect(ox + c * CELL - 2, oy + r * CELL - 2, CELL + 4, CELL + 4);
        // Main fill
        g.fillStyle(color, 1);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
        // Highlight
        g.fillStyle(0xffffff, 0.4);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, 4);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, 4, CELL - 2);
        // Shadow
        g.fillStyle(0x000000, 0.35);
        g.fillRect(ox + c * CELL + 1, oy + r * CELL + CELL - 5, CELL - 2, 4);
        g.fillRect(ox + c * CELL + CELL - 5, oy + r * CELL + 1, 4, CELL - 2);
      }
    }

    // Board border
    const glow = 0.4 + 0.3 * Math.sin(this.glowTime / 800);
    g.lineStyle(2, 0x00aaaa, glow);
    g.strokeRect(ox - 1, oy - 1, BOARD_PX_W + 2, BOARD_PX_H + 2);

    // Level up border flash
    if (this.levelUpFlash) {
      const lf = 1 - this.levelUpTimer / 500;
      g.lineStyle(4, 0xffff00, lf);
      g.strokeRect(ox - 3, oy - 3, BOARD_PX_W + 6, BOARD_PX_H + 6);
    }
  }

  private drawUI(): void {
    const g = this.uiGraphics;
    g.clear();

    const rightX = this.ox + BOARD_PX_W + 15;
    const leftX = this.ox + HOLD_PANEL_X_OFFSET;

    // Draw next pieces
    const preview = this.logic.getPreview(3);
    const nextY = this.oy + 240;
    const miniCell = 16;

    preview.forEach((type, idx) => {
      const py = nextY + idx * 70;
      this.drawMiniPiece(g, type, rightX + 20, py, miniCell, idx === 0 ? 1 : 0.6);
    });

    // Draw held piece
    if (this.logic.held) {
      this.drawMiniPiece(
        g,
        this.logic.held,
        leftX + 20,
        this.oy + 30,
        16,
        this.logic.canHold ? 1 : 0.4
      );
    }

    // Panel boxes
    g.lineStyle(1, 0x224444, 0.5);
    // Right panel box for NEXT
    g.strokeRect(rightX - 5, this.oy + 230, 110, 200);
    // Left panel box for HOLD
    g.strokeRect(leftX - 5, this.oy + 18, 110, 80);
  }

  private drawMiniPiece(
    g: Phaser.GameObjects.Graphics,
    type: TetrominoType,
    x: number,
    y: number,
    cell: number,
    alpha: number
  ): void {
    const def = TETROMINOES[type];
    const cells = def.rotations[0];
    const colorIdx = this.pieceColorIdx(type);
    const color = PIECE_COLORS[colorIdx] ?? 0xffffff;

    // Center the mini piece in a 4x2 bounding box
    const minR = Math.min(...cells.map(([r]) => r));
    const maxR = Math.max(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    const maxC = Math.max(...cells.map(([, c]) => c));
    const offsetR = -minR;
    const offsetC = Math.floor((4 - (maxC - minC + 1)) / 2) - minC;

    for (const [r, c] of cells) {
      const px = x + (c + offsetC) * cell;
      const py = y + (r + offsetR) * cell;
      g.fillStyle(color, alpha);
      g.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      g.fillStyle(0xffffff, 0.25 * alpha);
      g.fillRect(px + 1, py + 1, cell - 2, 3);
    }
  }

  private pieceColorIdx(type: TetrominoType): number {
    const map: Record<string, number> = { I:1, O:2, T:3, S:4, Z:5, J:6, L:7 };
    return map[type] ?? 1;
  }

  private getHighScore(): number {
    return parseInt(localStorage.getItem('tetris-hi') ?? '0', 10);
  }

  private saveHighScore(score: number): void {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem('tetris-hi', `${score}`);
    }
  }
}
