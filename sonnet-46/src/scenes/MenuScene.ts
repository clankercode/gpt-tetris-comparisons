import Phaser from 'phaser';
import { BOARD_COLS, BOARD_ROWS } from '../game/Board';
import { GameLogic, PIECE_COLORS } from '../game/GameLogic';
import { musicEngine } from '../audio/MusicEngine';

const CELL = 28; // smaller cell for background sim
const SIM_COLS = BOARD_COLS;
const SIM_ROWS = BOARD_ROWS;

export class MenuScene extends Phaser.Scene {
  private simLogic!: GameLogic;
  private simGraphics!: Phaser.GameObjects.Graphics;
  private scanlines!: Phaser.GameObjects.Graphics;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private simTimer = 0;
  private simInterval = 350; // ms per sim step
  private glowTime = 0;
  private titleGlow!: Phaser.GameObjects.Text;
  private titleShadow!: Phaser.GameObjects.Text;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private pendingLineClear = false;
  private pendingClearRows: number[] = [];

  // Stored settings passed between scenes
  static startLevel = 1;
  static musicVolume = 0.1;
  static sfxEnabled = true;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Start music
    musicEngine.volume = MenuScene.musicVolume;
    musicEngine.start();

    // Background simulation
    this.setupSim();

    // Scanline overlay
    this.scanlines = this.add.graphics();
    this.drawScanlines(W, H);

    // Flash rect (for line clear effects in sim)
    this.flashRect = this.add.rectangle(0, 0, W, H, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(50);

    // Dim overlay to make sim readable behind menu
    this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(5);

    this.setupTitle(W, H);
    this.setupMenu(W, H);
    this.setupControls(W, H);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.input.keyboard!.on('keydown-UP', () => this.changeSelection(-1));
    this.input.keyboard!.on('keydown-DOWN', () => this.changeSelection(1));
    this.input.keyboard!.on('keydown-ENTER', () => this.selectItem());
    this.input.keyboard!.on('keydown-SPACE', () => this.selectItem());
    this.input.keyboard!.on('keydown-W', () => this.changeSelection(-1));
    this.input.keyboard!.on('keydown-S', () => this.changeSelection(1));

    // Animate in
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 600, ease: 'Linear' });

    this.updateSelection();
  }

  private setupSim(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.simGraphics = this.add.graphics().setDepth(1);

    this.simLogic = new GameLogic(5);
    this.simLogic.events.onLinesCleared = (lines: number, rows: number[]) => {
      this.pendingLineClear = true;
      this.pendingClearRows = rows;
      this.triggerFlash(lines === 4 ? 0.8 : 0.4);
    };

    // For sim, we auto-drop and auto-spawn indefinitely
    // Position the board centered but slightly left
    this.drawSim();
  }

  private getSimOffset(): { x: number; y: number } {
    const W = this.scale.width;
    const H = this.scale.height;
    const boardW = SIM_COLS * CELL;
    const boardH = SIM_ROWS * CELL;
    return {
      x: (W - boardW) / 2,
      y: (H - boardH) / 2,
    };
  }

  private drawSim(): void {
    const g = this.simGraphics;
    g.clear();

    const { x: ox, y: oy } = this.getSimOffset();
    const logic = this.simLogic;

    // Draw ghost
    if (logic.current) {
      const ghost = logic.board.getGhostPiece(logic.current);
      const ghostColor = PIECE_COLORS[this.colorIndex(logic.current.type)] ?? 0x444444;
      for (const [r, c] of ghost.cells) {
        if (r >= 0 && r < SIM_ROWS) {
          g.fillStyle(ghostColor, 0.15);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Draw placed cells
    const vis = logic.board.getVisibleGrid();
    for (let r = 0; r < SIM_ROWS; r++) {
      for (let c = 0; c < SIM_COLS; c++) {
        const cell = vis[r][c];
        if (cell !== 0) {
          const color = PIECE_COLORS[cell] ?? 0x888888;
          g.fillStyle(color, 0.8);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
          // Inner highlight
          g.fillStyle(0xffffff, 0.15);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, 3);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, 3, CELL - 2);
        }
      }
    }

    // Draw active piece
    if (logic.current) {
      const colorIdx = this.colorIndex(logic.current.type);
      const color = PIECE_COLORS[colorIdx] ?? 0xffffff;
      for (const [r, c] of logic.current.cells) {
        if (r >= 0 && r < SIM_ROWS) {
          g.fillStyle(color, 0.9);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, CELL - 2);
          g.fillStyle(0xffffff, 0.3);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, CELL - 2, 3);
          g.fillRect(ox + c * CELL + 1, oy + r * CELL + 1, 3, CELL - 2);
        }
      }
    }

    // Grid lines (very faint)
    g.lineStyle(1, 0x224444, 0.3);
    const boardW = SIM_COLS * CELL;
    const boardH = SIM_ROWS * CELL;
    for (let c = 0; c <= SIM_COLS; c++) {
      g.strokeLineShape(new Phaser.Geom.Line(ox + c * CELL, oy, ox + c * CELL, oy + boardH));
    }
    for (let r = 0; r <= SIM_ROWS; r++) {
      g.strokeLineShape(new Phaser.Geom.Line(ox, oy + r * CELL, ox + boardW, oy + r * CELL));
    }
  }

  private colorIndex(type: string): number {
    const map: Record<string, number> = { I:1, O:2, T:3, S:4, Z:5, J:6, L:7 };
    return map[type] ?? 1;
  }

  private drawScanlines(W: number, H: number): void {
    const g = this.scanlines;
    g.clear();
    g.setDepth(100);
    for (let y = 0; y < H; y += 3) {
      g.fillStyle(0x000000, 0.18);
      g.fillRect(0, y, W, 1);
    }
  }

  private setupTitle(W: number, H: number): void {
    // Shadow
    this.titleShadow = this.add.text(W / 2 + 4, 64, 'TETRIS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '52px',
      color: '#003333',
    }).setOrigin(0.5).setDepth(10);

    // Main title
    this.titleGlow = this.add.text(W / 2, 60, 'TETRIS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '52px',
      color: '#00f0f0',
      stroke: '#004444',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    // Subtitle
    this.add.text(W / 2, 108, 'RETRO EDITION', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#888800',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(11);
  }

  private setupMenu(W: number, H: number): void {
    const entries = ['NEW GAME', 'SETTINGS', 'ABOUT'];
    const startY = H / 2 - 20;
    const spacing = 52;

    this.menuItems = entries.map((label, i) => {
      const item = this.add.text(W / 2, startY + i * spacing, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '18px',
        color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(10);
      return item;
    });
  }

  private setupControls(W: number, H: number): void {
    const controlsText = [
      '\u2190\u2192  MOVE        \u2193  SOFT DROP',
      'SPACE  HARD DROP    \u2191 / X  ROTATE CW',
      'Z  ROTATE CCW      C / SHIFT  HOLD',
      'P / ESC  PAUSE',
    ].join('\n');

    this.add.text(W / 2, H - 70, controlsText, {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#446644',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5).setDepth(10);
  }

  private changeSelection(dir: number): void {
    this.selectedIndex = (this.selectedIndex + dir + this.menuItems.length) % this.menuItems.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    this.menuItems.forEach((item, i) => {
      if (i === this.selectedIndex) {
        item.setColor('#00f0f0');
        item.setStroke('#004444', 2);
        item.setText('> ' + ['NEW GAME', 'SETTINGS', 'ABOUT'][i] + ' <');
      } else {
        item.setColor('#666666');
        item.setStroke('', 0);
        item.setText(['NEW GAME', 'SETTINGS', 'ABOUT'][i]);
      }
    });
  }

  private selectItem(): void {
    switch (this.selectedIndex) {
      case 0: this.startGame(); break;
      case 1: this.goToSettings(); break;
      case 2: this.goToAbout(); break;
    }
  }

  private startGame(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { startLevel: MenuScene.startLevel });
    });
  }

  private goToSettings(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Settings');
    });
  }

  private goToAbout(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('About');
    });
  }

  private triggerFlash(alpha: number): void {
    this.flashRect.setAlpha(alpha);
    this.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
    });
  }

  update(time: number, delta: number): void {
    this.glowTime += delta;

    // Pulse title
    const pulse = 0.85 + 0.15 * Math.sin(this.glowTime / 600);
    this.titleGlow.setAlpha(pulse);

    // Run sim
    this.simTimer += delta;
    if (this.simTimer >= this.simInterval) {
      this.simTimer = 0;
      this.simStep();
    }

    this.drawSim();
  }

  private simStep(): void {
    const logic = this.simLogic;

    if (logic.isGameOver) {
      // Reset the sim
      this.simLogic = new GameLogic(Math.floor(Math.random() * 5) + 3);
      this.simLogic.events.onLinesCleared = (lines: number) => {
        this.triggerFlash(lines === 4 ? 0.8 : 0.4);
      };
      return;
    }

    // Random AI: sometimes move, sometimes rotate, always drop
    if (logic.current) {
      const rand = Math.random();
      if (rand < 0.3) logic.moveHorizontal(-1);
      else if (rand < 0.6) logic.moveHorizontal(1);
      if (Math.random() < 0.2) logic.rotate(1);
    }

    logic.update(this.simInterval);

    // Occasionally hard drop to speed things up
    if (Math.random() < 0.08 && logic.current) {
      logic.hardDrop();
    }
  }
}
