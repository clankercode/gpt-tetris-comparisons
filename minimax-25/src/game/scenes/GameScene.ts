import Phaser from 'phaser';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  TETROMINO_COLORS,
  createEmptyBoard,
  createTetromino,
  getNextPiece,
  isValidPosition,
  lockPiece,
  clearLines,
  calculateScore,
  calculateLevel,
  calculateDropInterval,
  getGhostPosition,
  TetrominoData,
} from '../utils/TetrisLogic';
import { GameSettings } from '../types';

const BOARD_X = 240;
const BOARD_Y = 20;

export class GameScene extends Phaser.Scene {
  private settings!: GameSettings;
  private board!: (string | null)[][];
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pieceGraphics!: Phaser.GameObjects.Graphics;
  private ghostGraphics!: Phaser.GameObjects.Graphics;
  private currentPiece: TetrominoData | null = null;
  private nextPieceType: string = 'I';
  private bag: string[] = [];
  private score = 0;
  private level = 1;
  private lines = 0;
  private isGameOver = false;
  private isPaused = false;
  private dropTimer = 0;
  private dropInterval = 1000;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Graphics;

  private effectsContainer!: Phaser.GameObjects.Container;
  private lineClearEffects: { y: number; timer: number }[] = [];
  private screenFlash!: Phaser.GameObjects.Rectangle;

  private music: Phaser.Sound.BaseSound | null = null;
  private lineSound: Phaser.Sound.BaseSound | null = null;
  private tetrisSound: Phaser.Sound.BaseSound | null = null;
  private dropSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { settings: GameSettings }) {
    this.settings = data.settings;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    this.board = createEmptyBoard();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.dropTimer = 0;
    this.dropInterval = 1000;
    this.lineClearEffects = [];
    this.bag = [];

    this.createBoard();
    this.createHUD();
    this.createEffects();
    this.createSounds();
    this.spawnPiece();
    this.setupInput();
    this.startMusic();

    this.events.on('shutdown', () => {
      this.stopMusic();
    });
  }

  private createBoard() {
    this.boardGraphics = this.add.graphics();
    this.pieceGraphics = this.add.graphics();
    this.ghostGraphics = this.add.graphics();
  }

  private createHUD() {
    const hudX = 540;

    this.add.text(hudX, 30, 'SCORE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#00ff88',
    });

    this.scoreText = this.add.text(hudX, 55, '000000', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
    });

    this.add.text(hudX, 100, 'LEVEL', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#00ff88',
    });

    this.levelText = this.add.text(hudX, 125, '01', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
    });

    this.add.text(hudX, 170, 'LINES', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#00ff88',
    });

    this.linesText = this.add.text(hudX, 195, '000', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
    });

    this.add.text(hudX, 240, 'NEXT', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#00ff88',
    });

    this.nextPreview = this.add.graphics();
    this.drawNextPreview();

    this.screenFlash = this.add.rectangle(400, 300, 800, 600, 0xffffff, 0);
    this.screenFlash.setDepth(100);
  }

  private createEffects() {
    this.effectsContainer = this.add.container(0, 0);
  }

  private createSounds() {
    if (this.settings.sound) {
      this.dropSound = this.sound.add('drop', { volume: 0.3 });
    }
    if (this.settings.music) {
      this.lineSound = this.sound.add('line', { volume: 0.4 });
      this.tetrisSound = this.sound.add('tetris', { volume: 0.5 });
    }
  }

  private async startMusic() {
    if (this.settings.music) {
      try {
        this.music = this.sound.add('music', {
          volume: 0.3,
          loop: true,
        });
        await this.music.play();
      } catch (e) {
        console.warn('Music failed to play');
      }
    }
  }

  private stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  private setupInput() {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.isGameOver) {
        if (event.code === 'Enter' || event.code === 'Space') {
          this.scene.start('MenuScene');
        }
        return;
      }

      if (event.code === 'KeyP' || event.code === 'Escape') {
        this.togglePause();
        return;
      }

      if (this.isPaused) return;

      switch (event.code) {
        case 'ArrowLeft':
          this.movePiece(-1, 0);
          break;
        case 'ArrowRight':
          this.movePiece(1, 0);
          break;
        case 'ArrowDown':
          this.softDrop();
          break;
        case 'ArrowUp':
          this.rotatePiece();
          break;
        case 'Space':
          this.hardDrop();
          break;
      }
    });
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.showPauseOverlay();
    } else {
      this.hidePauseOverlay();
    }
  }

  private pauseOverlay!: Phaser.GameObjects.Container;

  private showPauseOverlay() {
    this.pauseOverlay = this.add.container(0, 0);
    this.pauseOverlay.setDepth(50);

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    const text = this.add.text(400, 280, 'PAUSED', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ff00ff',
    });
    text.setOrigin(0.5);

    const hint = this.add.text(400, 340, 'PRESS P TO RESUME', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#00ff88',
    });
    hint.setOrigin(0.5);

    this.pauseOverlay.add([overlay, text, hint]);
  }

  private hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = undefined!;
    }
  }

  private spawnPiece() {
    const { piece, bag } = getNextPiece(this.bag);
    this.bag = bag;
    this.nextPieceType = piece;

    this.currentPiece = createTetromino(piece);

    if (!isValidPosition(this.board, this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver();
    }

    this.drawNextPreview();
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const newX = this.currentPiece.x + dx;
    const newY = this.currentPiece.y + dy;

    if (isValidPosition(this.board, this.currentPiece.shape, newX, newY)) {
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      return true;
    }
    return false;
  }

  private rotatePiece() {
    if (!this.currentPiece) return;
    if (this.currentPiece.type === 'O') return;

    const shape = this.currentPiece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];

    for (let c = cols - 1; c >= 0; c--) {
      const newRow: number[] = [];
      for (let r = 0; r < rows; r++) {
        newRow.push(shape[r][c]);
      }
      rotated.push(newRow);
    }

    const testShape = rotated;
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ];

    for (const [kx, ky] of kicks) {
      if (isValidPosition(this.board, testShape, this.currentPiece.x + kx, this.currentPiece.y + ky)) {
        this.currentPiece.shape = testShape;
        this.currentPiece.x += kx;
        this.currentPiece.y += ky;
        return;
      }
    }
  }

  private softDrop() {
    if (this.movePiece(0, 1)) {
      this.score += 1;
    }
  }

  private hardDrop() {
    if (!this.currentPiece) return;

    let dropDistance = 0;
    while (this.movePiece(0, 1)) {
      dropDistance++;
    }
    this.score += dropDistance * 2;
    this.lockPiece();
  }

  private lockPiece() {
    if (!this.currentPiece) return;

    this.board = lockPiece(this.board, this.currentPiece);

    if (this.dropSound) {
      this.dropSound.play();
    }

    const { board, linesCleared } = clearLines(this.board);

    if (linesCleared > 0) {
      this.lines += linesCleared;
      this.score += calculateScore(linesCleared, this.level);
      this.level = calculateLevel(this.lines);
      this.dropInterval = calculateDropInterval(this.level);

      this.addLineClearEffect(linesCleared);

      if (linesCleared === 4) {
        if (this.tetrisSound) this.tetrisSound.play();
        this.screenFlash.setFillStyle(0x00ffff, 0.3);
      } else {
        if (this.lineSound) this.lineSound.play();
        this.screenFlash.setFillStyle(0xffffff, 0.2);
      }

      this.tweens.add({
        targets: this.screenFlash,
        alpha: { from: 1, to: 0 },
        duration: 100,
      });
    }

    this.board = board;
    this.updateHUD();
    this.spawnPiece();
  }

  private addLineClearEffect(linesCleared: number) {
    const boardTop = BOARD_Y;
    const lineHeight = CELL_SIZE;

    for (let i = 0; i < linesCleared; i++) {
      const flash = this.add.rectangle(
        BOARD_X + (BOARD_WIDTH * CELL_SIZE) / 2,
        boardTop + 14 + (19 - i) * lineHeight,
        BOARD_WIDTH * CELL_SIZE,
        CELL_SIZE,
        0xffffff
      );
      flash.setDepth(10);

      this.tweens.add({
        targets: flash,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 1.5 },
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.stopMusic();
  }

  private updateHUD() {
    this.scoreText.setText(this.score.toString().padStart(6, '0'));
    this.levelText.setText(this.level.toString().padStart(2, '0'));
    this.linesText.setText(this.lines.toString().padStart(3, '0'));
  }

  private drawNextPreview() {
    this.nextPreview.clear();

    const TETROMINOES: Record<string, number[][]> = {
      I: [[1, 1, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]],
      O: [[1, 1], [1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      T: [[0, 1, 0], [1, 1, 1]],
      Z: [[1, 1, 0], [0, 1, 1]],
    };

    const shape = TETROMINOES[this.nextPieceType];
    const color = TETROMINO_COLORS[this.nextPieceType];
    const previewX = 590;
    const previewY = 340;
    const previewCellSize = 16;

    let offsetX = 0;
    let offsetY = 0;

    if (this.nextPieceType === 'I') {
      offsetY = -8;
    } else if (this.nextPieceType === 'O') {
      offsetX = 8;
    } else {
      offsetX = 8;
      offsetY = 8;
    }

    const bounds = this.getShapeBounds(shape);

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = previewX + (col - bounds.minCol) * previewCellSize + offsetX - (bounds.width * previewCellSize) / 2;
          const y = previewY + (row - bounds.minRow) * previewCellSize + offsetY;

          this.nextPreview.fillStyle(color, 0.9);
          this.nextPreview.fillRect(x - previewCellSize / 2, y - previewCellSize / 2, previewCellSize - 1, previewCellSize - 1);
          this.nextPreview.lineStyle(1, 0x000000, 0.5);
          this.nextPreview.strokeRect(x - previewCellSize / 2, y - previewCellSize / 2, previewCellSize - 1, previewCellSize - 1);
        }
      }
    }
  }

  private getShapeBounds(shape: number[][]) {
    let minRow = shape.length;
    let maxRow = 0;
    let minCol = shape[0].length;
    let maxCol = 0;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }

    return {
      minRow,
      maxRow,
      minCol,
      maxCol,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
    };
  }

  private draw() {
    this.boardGraphics.clear();
    this.pieceGraphics.clear();
    this.ghostGraphics.clear();

    this.boardGraphics.fillStyle(0x1a1a2e, 1);
    this.boardGraphics.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);

    this.boardGraphics.lineStyle(1, 0x2a2a4e, 0.5);
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.boardGraphics.lineBetween(
        BOARD_X + x * CELL_SIZE, BOARD_Y,
        BOARD_X + x * CELL_SIZE, BOARD_Y + BOARD_HEIGHT * CELL_SIZE
      );
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.boardGraphics.lineBetween(
        BOARD_X, BOARD_Y + y * CELL_SIZE,
        BOARD_X + BOARD_WIDTH * CELL_SIZE, BOARD_Y + y * CELL_SIZE
      );
    }

    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (this.board[row][col]) {
          const color = TETROMINO_COLORS[this.board[row][col]!];
          const x = BOARD_X + col * CELL_SIZE;
          const y = BOARD_Y + row * CELL_SIZE;

          this.pieceGraphics.fillStyle(color, 0.9);
          this.pieceGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          this.pieceGraphics.lineStyle(2, 0x000000, 0.3);
          this.pieceGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    if (this.currentPiece && !this.isGameOver) {
      const ghostY = getGhostPosition(this.board, this.currentPiece);
      const color = TETROMINO_COLORS[this.currentPiece.type];

      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece!.shape[row][col]) {
            const x = BOARD_X + (this.currentPiece!.x + col) * CELL_SIZE;
            const y = BOARD_Y + (ghostY + row) * CELL_SIZE;

            this.ghostGraphics.lineStyle(2, color, 0.4);
            this.ghostGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          }
        }
      }

      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece!.shape[row][col]) {
            const x = BOARD_X + (this.currentPiece!.x + col) * CELL_SIZE;
            const y = BOARD_Y + (this.currentPiece!.y + row) * CELL_SIZE;

            this.pieceGraphics.fillStyle(color, 1);
            this.pieceGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            this.pieceGraphics.fillStyle(0xffffff, 0.3);
            this.pieceGraphics.fillRect(x + 2, y + 2, CELL_SIZE - 10, 4);
            this.pieceGraphics.lineStyle(2, 0x000000, 0.4);
            this.pieceGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }
    }

    if (this.isGameOver) {
      this.drawGameOver();
    }
  }

  private gameOverOverlay!: Phaser.GameObjects.Container;

  private drawGameOver() {
    if (this.gameOverOverlay) return;

    this.gameOverOverlay = this.add.container(0, 0);
    this.gameOverOverlay.setDepth(20);

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);

    const gameOverText = this.add.text(400, 250, 'GAME OVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '36px',
      color: '#ff3333',
    });
    gameOverText.setOrigin(0.5);

    const finalScore = this.add.text(400, 320, `FINAL SCORE: ${this.score}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#00ff88',
    });
    finalScore.setOrigin(0.5);

    const restartText = this.add.text(400, 380, 'PRESS ENTER TO CONTINUE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ff00ff',
    });
    restartText.setOrigin(0.5);

    this.gameOverOverlay.add([overlay, gameOverText, finalScore, restartText]);

    this.tweens.add({
      targets: restartText,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver || this.isPaused) return;

    this.dropTimer += delta;

    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;

      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }
    }

    this.draw();
  }
}
