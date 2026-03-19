import Phaser from 'phaser';
import {
  PieceState,
  TetrominoId,
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
  TetrisEngine
} from '../core/tetris';
import { GameSettings } from '../core/settings';
import { RetroMusicPlayer } from '../audio/retroMusic';

const BOARD_PIXEL = 32;
const BOARD_LEFT = 120;
const BOARD_TOP = 100;
const PANEL_LEFT = 540;
const BOARD_BG = 0x061534;

export default class GameScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'GameScene' });
  }

  private engine!: TetrisEngine;
  private settings!: GameSettings;
  private currentPiece: PieceState | null = null;
  private pendingLines: number[] = [];
  private clearFlash?: Phaser.GameObjects.Graphics;
  private clearAt = 0;
  private dropAccumulator = 0;
  private softDropAccumulator = 0;
  private paused = false;
  private gameOver = false;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private gameStatusText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Rectangle;
  private overlayText?: Phaser.GameObjects.Text;
  private nextPreviewGraphics!: Phaser.GameObjects.Graphics;
  private nextPieceText!: Phaser.GameObjects.Text;
  private nextPieceId: TetrominoId | null = null;
  private music!: RetroMusicPlayer;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyX!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;

  public create(): void {
    this.cameras.main.setBackgroundColor(0x041125);
    this.engine = new TetrisEngine();
    const defaults = this.registry.get('gameSettings') as GameSettings;
    this.settings = { ...defaults };

    this.createVisuals();
    this.bindKeys();
    this.music = new RetroMusicPlayer();
    this.music.setVolume(this.settings.musicVolume);
    this.music.start(this.settings.musicVolume);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music.stop();
      this.music.close();
    });

    this.startGame();
  }

  public update(time: number, delta: number): void {
    if (this.paused || this.gameOver) {
      return;
    }

    if (this.pendingLines.length > 0) {
      if (time >= this.clearAt) {
        this.applyLineClears();
        this.pendingLines = [];
        this.startNextPiece();
      }
      return;
    }

    this.dropAccumulator += delta;
    const interval = this.engine.dropInterval * (this.keyDown.isDown ? 0.25 : 1);
    if (this.dropAccumulator >= interval) {
      this.dropAccumulator -= interval;
      this.tryMove(0, 1);
    }

    if (this.keyDown.isDown) {
      this.softDropAccumulator += delta;
      if (this.softDropAccumulator >= 60) {
        this.softDropAccumulator = 0;
        this.tryMove(0, 1);
      }
    } else {
      this.softDropAccumulator = 0;
    }

    this.render();
  }

  private createVisuals(): void {
    this.add.text(BOARD_LEFT, 36, 'NEON BLOCK CASCADE', {
      fontSize: '42px',
      color: '#59f4ff',
      fontFamily: 'VT323, "Courier New", monospace'
    }).setShadow(0, 0, '#3df6ff', 8, false, true);

    this.boardGraphics = this.add.graphics();
    this.nextPreviewGraphics = this.add.graphics();

    this.scoreText = this.add.text(PANEL_LEFT, 110, 'SCORE: 000000', {
      fontSize: '24px',
      color: '#9dffff',
      fontFamily: 'VT323, "Courier New", monospace'
    });
    this.lineText = this.add.text(PANEL_LEFT, 160, 'LINES: 000', {
      fontSize: '24px',
      color: '#9dffff',
      fontFamily: 'VT323, "Courier New", monospace'
    });
    this.levelText = this.add.text(PANEL_LEFT, 210, 'LEVEL: 01', {
      fontSize: '24px',
      color: '#9dffff',
      fontFamily: 'VT323, "Courier New", monospace'
    });
    this.nextText = this.add.text(PANEL_LEFT + 2, 300, '', {
      fontSize: '22px',
      color: '#e2f9ff',
      fontFamily: 'VT323, "Courier New", monospace'
    });
    this.nextPieceText = this.add.text(PANEL_LEFT - 10, 300, 'PREVIEW', {
      fontSize: '20px',
      color: '#8ff9ff',
      fontFamily: 'VT323, "Courier New", monospace'
    });

    this.controlsText = this.add.text(PANEL_LEFT - 30, this.scale.height - 190, [
      'Controls',
      '← → move, ↓ soft drop',
      'Z / X rotate, Space hard drop',
      'P pause, Esc menu, R restart'
    ].join('\n'), {
      fontSize: '18px',
      color: '#9ee0ff',
      lineSpacing: 6,
      fontFamily: 'VT323, "Courier New", monospace'
    });

    this.gameStatusText = this.add.text(BOARD_LEFT + 28, 720, '', {
      fontSize: '22px',
      color: '#ffde4b',
      fontFamily: 'VT323, "Courier New", monospace'
    });
    this.gameStatusText.setVisible(false);

    this.overlay = this.add.rectangle(BOARD_LEFT + BOARD_PIXEL * 5, BOARD_TOP + BOARD_PIXEL * 10, BOARD_PIXEL * 10 + 6, BOARD_PIXEL * 20 + 6, 0x000000, 0.2);
    this.overlay.setStrokeStyle(3, 0x2ce9ff, 0.4);
    this.overlay.setDepth(-1);

    const scanline = this.add.graphics();
    for (let row = 0; row < this.engine.rows; row += 1) {
      const y = BOARD_TOP + row * BOARD_PIXEL + 6;
      scanline.fillStyle(0x9de9ff, row % 2 === 0 ? 0.03 : 0);
      scanline.fillRect(BOARD_LEFT, y, this.engine.cols * BOARD_PIXEL, 2);
    }
    scanline.setDepth(-0.5);

    const border = this.add.graphics();
    border.lineStyle(3, 0x2cdfff, 0.7);
    border.strokeRect(BOARD_LEFT - 2, BOARD_TOP - 2, this.engine.cols * BOARD_PIXEL + 4, this.engine.rows * BOARD_PIXEL + 4);
  }

  private bindKeys(): void {
    this.keyLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyDown = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyP = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.keyLeft.on('down', () => this.tryMove(-1, 0));
    this.keyRight.on('down', () => this.tryMove(1, 0));
    this.keyDown.on('down', () => this.tryMove(0, 1));
    this.keySpace.on('down', () => this.hardDrop());
    this.keyZ.on('down', () => this.rotate(-1));
    this.keyX.on('down', () => this.rotate(1));

    this.keyP.on('down', () => {
      this.togglePause();
    });
    this.keyEsc.on('down', () => {
      this.scene.start('MenuScene');
    });
    this.keyR.on('down', () => {
      if (this.gameOver) {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    this.engine.reset();
    this.currentPiece = null;
    this.pendingLines = [];
    this.clearFlash?.destroy();
    this.clearFlash = undefined;
    this.paused = false;
    this.gameOver = false;
    this.dropAccumulator = 0;
    this.softDropAccumulator = 0;
    if (this.overlayText) {
      this.overlayText.setVisible(false);
      this.overlayText.setText('');
    }
    this.gameStatusText.setVisible(false);
    this.nextPieceId = this.engine.getNextQueue(1)[0] ?? null;
    this.startNextPiece();
  }

  private startNextPiece(): void {
    if (this.gameOver) {
      return;
    }
    this.currentPiece = this.engine.spawnPiece();
    if (this.engine.hasCollisionAtSpawn(this.currentPiece)) {
      this.setGameOver();
      return;
    }
    this.nextPieceId = this.engine.getNextQueue(1)[0] ?? null;
    this.render();
    this.updateHud();
  }

  private setGameOver(): void {
    this.gameOver = true;
    this.music.stop();
    if (!this.overlayText) {
      this.overlayText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
        fontSize: '56px',
        color: '#ffef6e',
        fontStyle: 'bold',
        fontFamily: 'VT323, "Courier New", monospace'
      }).setOrigin(0.5);
    }
    this.overlayText.setText('GAME OVER\nPress R to restart or Esc for menu');
    this.overlayText.setAlign('center');
    this.overlayText.setDepth(10);
  }

  private applyLineClears(): void {
    const count = this.engine.clearLines(this.pendingLines);
    if (count > 0) {
      this.cameras.main.shake(130, 0.004);
      const points = [40, 100, 300, 1200][count - 1] || 0;
      const score = points * this.engine.level;
      this.gameStatusText.setText(`CLEAR! +${score.toLocaleString()}`);
      this.gameStatusText.setVisible(true);
      this.time.delayedCall(500, () => {
        if (this.gameStatusText) {
          this.gameStatusText.setText('');
        }
      });
    }
    this.updateHud();
    this.render();
  }

  private rotate(direction: -1 | 1): void {
    if (!this.currentPiece || this.paused || this.gameOver || this.pendingLines.length > 0) {
      return;
    }
    const rotated = this.engine.rotatePiece(this.currentPiece, direction);
    if (rotated) {
      this.currentPiece = rotated;
      this.render();
    }
  }

  private hardDrop(): void {
    if (!this.currentPiece || this.paused || this.gameOver || this.pendingLines.length > 0) {
      return;
    }
    const ghostY = this.ghostY(this.currentPiece);
    const distance = Math.max(0, ghostY - this.currentPiece.y);
    this.currentPiece.y = ghostY;
    this.engine.placePiece(this.currentPiece);
    this.engine.addScore(distance * 2);
    this.lockPiece();
  }

  private tryMove(dx: number, dy: number): void {
    if (!this.currentPiece || this.paused || this.gameOver || this.pendingLines.length > 0) {
      return;
    }
    const target = {
      ...this.currentPiece,
      x: this.currentPiece.x + dx,
      y: this.currentPiece.y + dy
    };
    if (this.engine.canPlace(target)) {
      this.currentPiece = target;
      this.render();
      return;
    }
    if (dy === 1) {
      this.lockPiece();
    }
  }

  private lockPiece(): void {
    if (!this.currentPiece) {
      return;
    }
    const rows = this.engine.placePiece(this.currentPiece);
    this.currentPiece = null;
    if (rows.length > 0) {
      this.pendingLines = rows;
      this.clearAt = this.time.now + 220;
      this.drawLineClear(rows);
      return;
    }
    this.startNextPiece();
  }

  private drawLineClear(rows: number[]): void {
    if (this.clearFlash) {
      this.clearFlash.destroy();
    }
    const flash = this.add.graphics();
    flash.setDepth(8);
    for (const row of rows) {
      flash.fillStyle(0xffffff, 0.55);
      flash.fillRect(
        BOARD_LEFT,
        BOARD_TOP + row * BOARD_PIXEL,
        this.engine.cols * BOARD_PIXEL,
        BOARD_PIXEL
      );
    }
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeOut',
      onComplete: () => {
        flash.destroy();
      }
    });
    this.clearFlash = flash;
  }

  private togglePause(): void {
    if (this.gameOver) {
      return;
    }
    this.paused = !this.paused;
    if (this.paused) {
      this.music.stop();
      this.gameStatusText.setText('PAUSED  ·  Press P to resume');
      this.gameStatusText.setVisible(true);
    } else {
      this.music.start();
      this.gameStatusText.setVisible(false);
    }
  }

  private ghostY(piece: PieceState): number {
    return this.engine.ghostDropY(piece);
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE: ${this.engine.score.toLocaleString().padStart(6, '0')}`);
    this.lineText.setText(`LINES: ${this.engine.lines.toString().padStart(3, '0')}`);
    this.levelText.setText(`LEVEL: ${this.engine.level.toString().padStart(2, '0')}`);
    this.nextText.setText(this.nextPieceId ? this.nextPieceId : '-');
  }

  private render(): void {
    if (!this.engine.board) {
      return;
    }
    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(BOARD_BG, 1);
    this.boardGraphics.fillRect(BOARD_LEFT, BOARD_TOP, this.engine.cols * BOARD_PIXEL, this.engine.rows * BOARD_PIXEL);

    for (let y = 0; y < this.engine.rows; y += 1) {
      for (let x = 0; x < this.engine.cols; x += 1) {
        const value = this.engine.board[y][x];
        const px = BOARD_LEFT + x * BOARD_PIXEL;
        const py = BOARD_TOP + y * BOARD_PIXEL;
        this.boardGraphics.lineStyle(1, 0x204a7f, 0.25);
        if (value === 0) {
          this.boardGraphics.fillStyle(0x07162f, 1);
          this.boardGraphics.fillRect(px + 1, py + 1, BOARD_PIXEL - 2, BOARD_PIXEL - 2);
        } else {
          const shade = this.colorByValue(value);
          this.boardGraphics.fillStyle(shade, 1);
          this.boardGraphics.fillRect(px + 1, py + 1, BOARD_PIXEL - 2, BOARD_PIXEL - 2);
          this.boardGraphics.fillStyle(0xffffff, 0.15);
          this.boardGraphics.fillRect(px + 1, py + 1, BOARD_PIXEL - 2, 8);
        }
      }
    }

    if (this.currentPiece) {
      if (this.settings.showGhost) {
        const ghostY = this.ghostY(this.currentPiece);
        for (const [px, py] of this.pieceCells(this.currentPiece, this.currentPiece.rotation, ghostY)) {
          if (py < 0) {
            continue;
          }
          const x = BOARD_LEFT + px * BOARD_PIXEL;
          const y = BOARD_TOP + py * BOARD_PIXEL;
          this.boardGraphics.fillStyle(this.colorById(this.currentPiece.id), 0.2);
          this.boardGraphics.fillRect(x + 2, y + 2, BOARD_PIXEL - 4, BOARD_PIXEL - 4);
        }
      }
      for (const [px, py] of TETROMINO_SHAPES[this.currentPiece.id][this.currentPiece.rotation].map(([x, y]) => [this.currentPiece!.x + x, this.currentPiece!.y + y])) {
        if (py < 0) {
          continue;
        }
        const x = BOARD_LEFT + px * BOARD_PIXEL;
        const y = BOARD_TOP + py * BOARD_PIXEL;
        const color = this.colorById(this.currentPiece.id);
        this.boardGraphics.fillStyle(color, 1);
        this.boardGraphics.fillRect(x + 1, y + 1, BOARD_PIXEL - 2, BOARD_PIXEL - 2);
        this.boardGraphics.fillStyle(0xffffff, 0.24);
        this.boardGraphics.fillRect(x + 1, y + 1, BOARD_PIXEL - 2, 7);
      }
    }
    this.drawNextPreview();
  }

  private drawNextPreview(): void {
    this.nextPreviewGraphics.clear();
    const text = this.nextPieceId ? `Next: ${this.nextPieceId}` : '';
    this.nextPieceText.setText(text);
    if (!this.nextPieceId) {
      return;
    }
    const shape = TETROMINO_SHAPES[this.nextPieceId][0];
    const baseX = PANEL_LEFT + 12;
    const baseY = 330;
    const size = 18;
    for (const [x, y] of shape) {
      this.nextPreviewGraphics.fillStyle(this.colorById(this.nextPieceId), 1);
      this.nextPreviewGraphics.fillRect(baseX + x * size, baseY + y * size, size - 1, size - 1);
      this.nextPreviewGraphics.fillStyle(0xffffff, 0.22);
      this.nextPreviewGraphics.fillRect(baseX + x * size, baseY + y * size, size - 1, 3);
    }
  }

  private pieceCells(piece: PieceState, rotation: number, yOverride = piece.y): [number, number][] {
    return TETROMINO_SHAPES[piece.id][rotation as 0 | 1 | 2 | 3].map(([x, y]) => [piece.x + x, yOverride + y]);
  }

  private colorById(id: TetrominoId): number {
    return TETROMINO_SHAPES[id] ? TETROMINO_COLORS[id] : 0xffffff;
  }

  private colorByValue(value: number): number {
    const ids = Object.values(TETROMINO_COLORS) as number[];
    return ids[value - 1] ?? 0xffffff;
  }
}
