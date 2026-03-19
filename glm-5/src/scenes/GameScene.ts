import Phaser from 'phaser';
import { 
  BOARD_WIDTH, BOARD_HEIGHT, TILE_SIZE, BOARD_X, BOARD_Y, 
  COLORS, loadSettings, type GameSettings, type TetrominoType 
} from '../config';
import { Board } from '../game/Board';
import { Tetromino } from '../game/Tetromino';
import { Spawner } from '../game/Spawner';
import { Score } from '../game/Score';
import { AudioManager } from '../audio/AudioManager';
import { CRTOverlay } from '../effects/CRTOverlay';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private spawner!: Spawner;
  private score!: Score;
  private currentPiece: Tetromino | null = null;
  private holdPiece: TetrominoType | null = null;
  private canHold = true;
  private settings!: GameSettings;
  private audioManager!: AudioManager;
  private crtOverlay!: CRTOverlay;
  
  private boardContainer!: Phaser.GameObjects.Container;
  private pieceContainer!: Phaser.GameObjects.Container;
  private ghostContainer!: Phaser.GameObjects.Container;
  private nextText!: Phaser.GameObjects.Text;
  private holdText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  
  private dropTimer!: number;
  private lockDelay = 0;
  private lockDelayMax = 500;
  private softDropping = false;
  private isPaused = false;
  private isGameOver = false;
  private prevLines = 0;
  private prevLevel = 0;
  
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.settings = loadSettings();
    this.board = new Board();
    this.spawner = new Spawner(3);
    this.score = new Score(this.settings.startLevel);
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.dropTimer = 0;
    this.lockDelay = 0;
    this.softDropping = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.prevLines = 0;
    this.prevLevel = this.settings.startLevel;
  }

  create() {
    this.audioManager = new AudioManager(this);
    this.audioManager.init();
    this.audioManager.setMusicVolume(this.settings.musicVolume);
    this.audioManager.setSfxVolume(this.settings.sfxVolume);
    
    this.createBackground();
    this.createBoard();
    this.createUI();
    this.createParticles();
    this.setupInput();
    
    this.boardContainer = this.add.container(0, 0);
    this.pieceContainer = this.add.container(0, 0);
    this.ghostContainer = this.add.container(0, 0);
    
    this.audioManager.startGameMusic();
    
    this.spawnPiece();
    
    this.time.addEvent({
      delay: 16,
      callback: this.updateGame,
      callbackScope: this,
      loop: true,
    });
    
    this.crtOverlay = new CRTOverlay(this);
  }

  createBackground() {
    this.add.rectangle(0, 0, 480, 640, COLORS.background).setOrigin(0, 0);
    
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, COLORS.gridLine, 0.3);
    for (let i = 0; i <= BOARD_WIDTH; i++) {
      gridGraphics.lineBetween(BOARD_X + i * TILE_SIZE, BOARD_Y, BOARD_X + i * TILE_SIZE, BOARD_Y + BOARD_HEIGHT * TILE_SIZE);
    }
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
      gridGraphics.lineBetween(BOARD_X, BOARD_Y + i * TILE_SIZE, BOARD_X + BOARD_WIDTH * TILE_SIZE, BOARD_Y + i * TILE_SIZE);
    }
  }

  createBoard() {
    const bg = this.add.rectangle(
      BOARD_X, BOARD_Y, 
      BOARD_WIDTH * TILE_SIZE, BOARD_HEIGHT * TILE_SIZE, 
      COLORS.boardBg
    ).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x2a2a4e);
  }

  createUI() {
    const rightX = BOARD_X + BOARD_WIDTH * TILE_SIZE + 20;
    const style = { fontFamily: 'monospace', fontSize: '14px', color: '#e0e0e0' };
    const titleStyle = { fontFamily: 'monospace', fontSize: '12px', color: '#808080' };
    
    this.add.text(rightX, BOARD_Y, 'NEXT', titleStyle);
    this.nextText = this.add.text(rightX, BOARD_Y + 16, '', style);
    
    this.add.text(rightX, BOARD_Y + 90, 'HOLD', titleStyle);
    this.holdText = this.add.text(rightX, BOARD_Y + 106, '', style);
    
    this.add.text(rightX, BOARD_Y + 180, 'SCORE', titleStyle);
    this.scoreText = this.add.text(rightX, BOARD_Y + 196, '0', { fontFamily: 'monospace', fontSize: '16px', color: '#f08000' });
    
    this.add.text(rightX, BOARD_Y + 230, 'LEVEL', titleStyle);
    this.levelText = this.add.text(rightX, BOARD_Y + 246, '0', style);
    
    this.add.text(rightX, BOARD_Y + 280, 'LINES', titleStyle);
    this.linesText = this.add.text(rightX, BOARD_Y + 296, '0', style);
    
    this.add.text(BOARD_X, BOARD_Y + BOARD_HEIGHT * TILE_SIZE + 20, 
      '← → MOVE  ↑/Z ROTATE  ↓ SOFT  SPACE HARD  C HOLD  ESC PAUSE',
      { fontFamily: 'monospace', fontSize: '10px', color: '#606060' }
    );
  }

  createParticles() {
    this.particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      gravityY: 200,
      emitting: false,
    });
  }

  setupInput() {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.isGameOver) {
        if (event.code === 'Space' || event.code === 'Enter') {
          this.scene.restart();
        }
        return;
      }
      
      if (event.code === this.settings.keyPause) {
        this.togglePause();
        return;
      }
      
      if (this.isPaused) return;
      
      switch (event.code) {
        case this.settings.keyLeft:
          if (this.movePiece(-1, 0)) this.audioManager.playMove();
          break;
        case this.settings.keyRight:
          if (this.movePiece(1, 0)) this.audioManager.playMove();
          break;
        case this.settings.keyRotateCW:
          if (this.rotatePiece(1)) this.audioManager.playRotate();
          break;
        case this.settings.keyRotateCCW:
          if (this.rotatePiece(-1)) this.audioManager.playRotate();
          break;
        case this.settings.keySoftDrop:
          this.softDropping = true;
          break;
        case this.settings.keyHardDrop:
          this.audioManager.playHardDrop();
          this.hardDrop();
          break;
        case this.settings.keyHold:
          this.doHold();
          break;
      }
    });

    this.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
      if (event.code === this.settings.keySoftDrop) {
        this.softDropping = false;
      }
    });
  }

  spawnPiece() {
    this.currentPiece = this.spawner.spawn();
    this.canHold = true;
    
    if (!this.board.isValidPosition(this.currentPiece)) {
      this.gameOver();
      return;
    }
    
    this.updateNextDisplay();
    this.updateHoldDisplay();
  }

  movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;
    if (this.board.isValidPosition(this.currentPiece, dx, dy)) {
      this.currentPiece.x += dx;
      this.currentPiece.y += dy;
      if (dy > 0) this.lockDelay = 0;
      return true;
    }
    return false;
  }

  rotatePiece(dir: number): boolean {
    if (!this.currentPiece) return false;
    const oldRotation = this.currentPiece.rotation;
    this.currentPiece.rotate(dir);
    
    const kicks = this.currentPiece.getWallKicks(dir, oldRotation);
    for (const kick of kicks) {
      const kx = kick![0]!;
      const ky = kick![1]!;
      if (this.board.isValidPosition(this.currentPiece, kx, ky)) {
        this.currentPiece.x += kx;
        this.currentPiece.y += ky;
        this.lockDelay = 0;
        return true;
      }
    }
    
    this.currentPiece.rotation = oldRotation;
    return false;
  }

  hardDrop() {
    if (!this.currentPiece) return;
    const startY = this.currentPiece.y;
    while (this.movePiece(0, 1)) {}
    this.score.score += (this.currentPiece.y - startY) * 2;
    this.lockPiece();
  }

  doHold() {
    if (!this.canHold || !this.currentPiece) return;
    
    const currentType = this.currentPiece.type;
    if (this.holdPiece) {
      this.currentPiece = new Tetromino(this.holdPiece);
    } else {
      this.spawnPiece();
    }
    this.holdPiece = currentType;
    this.canHold = false;
    this.updateHoldDisplay();
  }

  lockPiece() {
    if (!this.currentPiece) return;
    this.board.lockPiece(this.currentPiece);
    const clearedLines = this.board.clearLines();
    
    if (clearedLines.length > 0) {
      this.score.addLines(clearedLines.length);
      this.audioManager.playLineClear(clearedLines.length);
      this.playLineClearEffect(clearedLines);
    }
    
    if (this.score.level > this.prevLevel) {
      this.audioManager.playLevelUp();
      this.prevLevel = this.score.level;
    }
    
    this.spawnPiece();
  }

  playLineClearEffect(lines: number[]) {
    for (const y of lines) {
      const screenY = BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2;
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const screenX = BOARD_X + x * TILE_SIZE + TILE_SIZE / 2;
        this.particles.emitParticleAt(screenX, screenY, 3);
      }
    }
    
    if (lines.length === 4) {
      this.cameras.main.shake(200, 0.02);
    }
  }

  updateGame(_time: number, delta: number) {
    if (this.isPaused || this.isGameOver || !this.currentPiece) return;
    
    this.dropTimer += delta;
    const dropSpeed = this.softDropping ? 50 : this.score.getSpeed();
    
    if (this.dropTimer >= dropSpeed) {
      this.dropTimer = 0;
      if (!this.movePiece(0, 1)) {
        this.lockDelay += dropSpeed;
        if (this.lockDelay >= this.lockDelayMax) {
          this.lockPiece();
        }
      } else if (this.softDropping) {
        this.score.score += 1;
      }
    }
    
    this.render();
    this.updateUITexts();
  }

  render() {
    this.boardContainer.removeAll(true);
    this.pieceContainer.removeAll(true);
    this.ghostContainer.removeAll(true);
    
    const grid = this.board.getGrid();
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = grid[y]![x];
        if (cell) {
          this.drawBlock(this.boardContainer, x, y, cell);
        }
      }
    }
    
    if (this.currentPiece) {
      if (this.settings.ghostPiece) {
        const ghostY = this.board.getDropPosition(this.currentPiece);
        const shape = this.currentPiece.getShape();
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row]!.length; col++) {
            if (shape[row]![col]) {
              this.drawBlock(this.ghostContainer, 
                this.currentPiece.x + col, ghostY + row, 'ghost');
            }
          }
        }
      }
      
      const shape = this.currentPiece.getShape();
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row]!.length; col++) {
          if (shape[row]![col]) {
            this.drawBlock(this.pieceContainer,
              this.currentPiece.x + col, this.currentPiece.y + row, 
              this.currentPiece.type);
          }
        }
      }
    }
  }

  drawBlock(container: Phaser.GameObjects.Container, x: number, y: number, type: TetrominoType | 'ghost') {
    const px = BOARD_X + x * TILE_SIZE;
    const py = BOARD_Y + y * TILE_SIZE;
    
    const block = this.add.image(px, py, `block_${type}`).setOrigin(0, 0);
    container.add(block);
  }

  updateNextDisplay() {
    const next = this.spawner.getNext();
    this.nextText.setText(next.join('\n'));
  }

  updateHoldDisplay() {
    this.holdText.setText(this.holdPiece || '-');
  }

  updateUITexts() {
    this.scoreText.setText(this.score.score.toString());
    this.levelText.setText(this.score.level.toString());
    this.linesText.setText(this.score.lines.toString());
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      const centerX = 480 / 2;
      const centerY = 640 / 2;
      
      this.add.rectangle(centerX, centerY, 300, 150, 0x000000, 0.8)
        .setOrigin(0.5)
        .setName('pauseOverlay');
      this.add.text(centerX, centerY - 30, 'PAUSED', { fontFamily: 'monospace', fontSize: '24px', color: '#f08000' })
        .setOrigin(0.5)
        .setName('pauseText');
      this.add.text(centerX, centerY + 10, 'Press ESC to resume', { fontFamily: 'monospace', fontSize: '14px', color: '#808080' })
        .setOrigin(0.5)
        .setName('pauseHint');
    } else {
      this.children.getByName('pauseOverlay')?.destroy();
      this.children.getByName('pauseText')?.destroy();
      this.children.getByName('pauseHint')?.destroy();
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.audioManager.stopMusic();
    this.audioManager.playGameOver();
    
    const centerX = 480 / 2;
    const centerY = 640 / 2;
    
    this.add.rectangle(centerX, centerY, 300, 200, 0x000000, 0.9).setOrigin(0.5);
    this.add.text(centerX, centerY - 50, 'GAME OVER', { fontFamily: 'monospace', fontSize: '28px', color: '#f00000' }).setOrigin(0.5);
    this.add.text(centerX, centerY, `Score: ${this.score.score}`, { fontFamily: 'monospace', fontSize: '18px', color: '#f08000' }).setOrigin(0.5);
    this.add.text(centerX, centerY + 40, `Level: ${this.score.level}  Lines: ${this.score.lines}`, { fontFamily: 'monospace', fontSize: '14px', color: '#e0e0e0' }).setOrigin(0.5);
    this.add.text(centerX, centerY + 80, 'Press SPACE to play again', { fontFamily: 'monospace', fontSize: '14px', color: '#808080' }).setOrigin(0.5);
  }
}
