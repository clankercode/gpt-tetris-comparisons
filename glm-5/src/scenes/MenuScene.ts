import Phaser from 'phaser';
import { 
  GAME_WIDTH, GAME_HEIGHT, BOARD_WIDTH, BOARD_HEIGHT, 
  TILE_SIZE, BOARD_X, BOARD_Y, COLORS, loadSettings
} from '../config';
import { Board } from '../game/Board';
import { Tetromino } from '../game/Tetromino';
import { Spawner } from '../game/Spawner';
import { AudioManager } from '../audio/AudioManager';
import { CRTOverlay } from '../effects/CRTOverlay';

interface MenuItem {
  text: string;
  action: () => void;
}

export class MenuScene extends Phaser.Scene {
  private demoBoard!: Board;
  private demoSpawner!: Spawner;
  private demoPiece: Tetromino | null = null;
  private demoDropTimer = 0;
  private selectedIndex = 0;
  private menuItems: MenuItem[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private demoGraphics!: Phaser.GameObjects.Graphics;
  private audioManager!: AudioManager;
  private crtOverlay!: CRTOverlay;
  private static musicStarted = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.demoBoard = new Board();
    this.demoSpawner = new Spawner(3);
    this.selectedIndex = 0;
    
    this.audioManager = new AudioManager(this);
    this.audioManager.init();
    
    const settings = loadSettings();
    this.audioManager.setMusicVolume(settings.musicVolume);
    this.audioManager.setSfxVolume(settings.sfxVolume);
    
    if (!MenuScene.musicStarted) {
      MenuScene.musicStarted = true;
      this.time.delayedCall(100, () => {
        this.audioManager.startMenuMusic();
      });
    }
    
    this.createBackground();
    this.createTitle();
    this.createMenu();
    this.createControls();
    this.setupInput();
    
    this.demoGraphics = this.add.graphics();
    
    this.spawnDemoPiece();
    
    this.time.addEvent({
      delay: 100,
      callback: this.updateDemo,
      callbackScope: this,
      loop: true,
    });
    
    this.crtOverlay = new CRTOverlay(this);
  }

  createBackground() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0, 0);
    
    const boardX = BOARD_X - 60;
    const boardY = BOARD_Y + 100;
    
    this.add.rectangle(
      boardX, boardY,
      BOARD_WIDTH * TILE_SIZE * 0.8,
      BOARD_HEIGHT * TILE_SIZE * 0.8,
      COLORS.boardBg, 0.3
    ).setOrigin(0, 0);
  }

  createTitle() {
    const titleStyle = { 
      fontFamily: 'monospace', 
      fontSize: '48px', 
      color: '#f08000',
      fontStyle: 'bold'
    };
    
    this.titleText = this.add.text(GAME_WIDTH / 2, 100, 'TETRIS', titleStyle)
      .setOrigin(0.5);
    
    this.add.text(GAME_WIDTH / 2, 150, 'RETRO EDITION', { 
      fontFamily: 'monospace', 
      fontSize: '16px', 
      color: '#808080' 
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createMenu() {
    this.menuItems = [
      { text: 'NEW GAME', action: () => {
        this.audioManager.stopMusic();
        MenuScene.musicStarted = false;
        this.scene.start('GameScene');
      }},
      { text: 'SETTINGS', action: () => this.scene.start('SettingsScene') },
      { text: 'ABOUT', action: () => this.scene.start('AboutScene') },
    ];

    const startY = 280;
    const spacing = 50;
    
    this.menuItems.forEach((item, index) => {
      const style = { 
        fontFamily: 'monospace', 
        fontSize: '24px', 
        color: index === this.selectedIndex ? '#f08000' : '#e0e0e0' 
      };
      const text = this.add.text(GAME_WIDTH / 2, startY + index * spacing, item.text, style)
        .setOrigin(0.5);
      this.menuTexts.push(text);
    });
  }

  createControls() {
    const controls = [
      '← → : Move',
      '↑ / Z : Rotate',
      '↓ : Soft Drop',
      'SPACE : Hard Drop',
      'C : Hold Piece',
      'ESC : Pause',
    ];
    
    const startY = 450;
    this.add.text(GAME_WIDTH / 2, startY, 'CONTROLS', { 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      color: '#606060' 
    }).setOrigin(0.5);
    
    controls.forEach((ctrl, i) => {
      this.add.text(GAME_WIDTH / 2, startY + 20 + i * 16, ctrl, { 
        fontFamily: 'monospace', 
        fontSize: '11px', 
        color: '#505050' 
      }).setOrigin(0.5);
    });
    
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '↑↓ Select  ENTER Confirm', { 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      color: '#404040' 
    }).setOrigin(0.5);
  }

  setupInput() {
    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.updateMenuSelection();
    });

    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
      this.updateMenuSelection();
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.menuItems[this.selectedIndex]!.action();
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.menuItems[this.selectedIndex]!.action();
    });
  }

  updateMenuSelection() {
    this.menuTexts.forEach((text, index) => {
      text.setColor(index === this.selectedIndex ? '#f08000' : '#e0e0e0');
      text.setScale(index === this.selectedIndex ? 1.1 : 1);
    });
  }

  spawnDemoPiece() {
    this.demoPiece = this.demoSpawner.spawn();
    this.demoPiece.x = Math.floor(Math.random() * (BOARD_WIDTH - 4));
    this.demoPiece.y = -2;
  }

  updateDemo() {
    if (!this.demoPiece) return;
    
    this.demoDropTimer++;
    
    if (this.demoDropTimer >= 3) {
      this.demoDropTimer = 0;
      
      if (Math.random() < 0.3) {
        const dx = Math.random() < 0.5 ? -1 : 1;
        if (this.demoBoard.isValidPosition(this.demoPiece, dx, 0)) {
          this.demoPiece.x += dx;
        }
      }
      
      if (Math.random() < 0.2) {
        this.demoPiece.rotate(Math.random() < 0.5 ? 1 : -1);
        if (!this.demoBoard.isValidPosition(this.demoPiece)) {
          this.demoPiece.rotate(-1);
        }
      }
      
      if (this.demoBoard.isValidPosition(this.demoPiece, 0, 1)) {
        this.demoPiece.y++;
      } else {
        this.demoBoard.lockPiece(this.demoPiece);
        this.demoBoard.clearLines();
        this.spawnDemoPiece();
      }
    }
    
    this.renderDemo();
  }

  renderDemo() {
    this.demoGraphics.clear();
    const scale = 0.8;
    const offsetX = BOARD_X - 60;
    const offsetY = BOARD_Y + 100;
    
    const grid = this.demoBoard.getGrid();
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = grid[y]![x];
        if (cell) {
          const px = offsetX + x * TILE_SIZE * scale;
          const py = offsetY + y * TILE_SIZE * scale;
          this.demoGraphics.fillStyle(COLORS[cell] as number, 0.6);
          this.demoGraphics.fillRect(px, py, TILE_SIZE * scale - 1, TILE_SIZE * scale - 1);
        }
      }
    }
    
    if (this.demoPiece) {
      const shape = this.demoPiece.getShape();
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row]!.length; col++) {
          if (shape[row]![col]) {
            const px = offsetX + (this.demoPiece.x + col) * TILE_SIZE * scale;
            const py = offsetY + (this.demoPiece.y + row) * TILE_SIZE * scale;
            if (this.demoPiece.y + row >= 0) {
              this.demoGraphics.fillStyle(COLORS[this.demoPiece.type] as number, 0.7);
              this.demoGraphics.fillRect(px, py, TILE_SIZE * scale - 1, TILE_SIZE * scale - 1);
            }
          }
        }
      }
    }
  }
}
