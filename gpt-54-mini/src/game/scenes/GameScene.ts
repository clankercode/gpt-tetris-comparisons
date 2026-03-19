import Phaser from "phaser";
import { audio } from "../audio";
import { createRetroBackdrop } from "../backdrop";
import { computeGameLayout } from "../layout";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LINE_CLEAR_MS,
  TetrisGame,
  getPieceCells,
} from "../engine";
import type { GameEvent } from "../engine";
import { SceneKeys } from "../sceneKeys";
import type { AppProfile } from "../storage";
import { saveProfile } from "../storage";
import { COLORS, FONT, shade } from "../theme";
import { createRetroButton, createRetroText } from "../ui";
import { drawBoardCell, drawFrame, drawPanelGrid } from "../render";

type OverlayMode = "pause" | "game-over" | null;

export class GameScene extends Phaser.Scene {
  private backdrop?: ReturnType<typeof createRetroBackdrop>;
  private profile!: AppProfile;
  private engine!: TetrisGame;
  private layout = computeGameLayout(1280, 720);
  private lastWidth = 0;
  private lastHeight = 0;
  private lastAudioLevel = -1;

  private boardFrame!: Phaser.GameObjects.Graphics;
  private sidebarFrame!: Phaser.GameObjects.Graphics;
  private boardGrid!: Phaser.GameObjects.Graphics;
  private lockedCells!: Phaser.GameObjects.Graphics;
  private activeCells!: Phaser.GameObjects.Graphics;
  private clearOverlay!: Phaser.GameObjects.Graphics;
  private overlayScrim!: Phaser.GameObjects.Graphics;
  private overlayPanel!: Phaser.GameObjects.Graphics;
  private previewGraphics!: Phaser.GameObjects.Graphics;

  private scoreText!: Phaser.GameObjects.Text;
  private sceneTitle!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private nextLabelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private clearBannerText!: Phaser.GameObjects.Text;
  private clearBonusText!: Phaser.GameObjects.Text;

  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseHint!: Phaser.GameObjects.Text;
  private gameOverTitle!: Phaser.GameObjects.Text;
  private gameOverSubtitle!: Phaser.GameObjects.Text;
  private gameOverStats!: Phaser.GameObjects.Text;

  private retryButton!: ReturnType<typeof createRetroButton>;
  private menuButton!: ReturnType<typeof createRetroButton>;

  private overlayMode: OverlayMode = null;
  private overlaySelectedIndex = 0;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    p: Phaser.Input.Keyboard.Key;
    r: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    m: Phaser.Input.Keyboard.Key;
  };

  private horizontalDirection: -1 | 1 | 0 = 0;
  private horizontalRepeatAt = 0;
  private softDropRepeatAt = 0;

  constructor() {
    super(SceneKeys.Game);
  }

  create(): void {
    this.profile = this.registry.get("profile") as AppProfile;
    audio.setSettings(this.profile.audio);
    audio.setMode("game");

    this.backdrop = createRetroBackdrop(this, "game");
    this.engine = new TetrisGame({
      startLevel: this.profile.gameplay.startingLevel,
    });
    audio.setGameLevel(this.engine.state.level);

    this.boardFrame = this.add.graphics().setDepth(-8);
    this.sidebarFrame = this.add.graphics().setDepth(-8);
    this.boardGrid = this.add.graphics().setDepth(2);
    this.lockedCells = this.add.graphics().setDepth(4);
    this.activeCells = this.add.graphics().setDepth(5);
    this.clearOverlay = this.add.graphics().setDepth(6);
    this.previewGraphics = this.add.graphics().setDepth(4);
    this.overlayScrim = this.add.graphics().setDepth(18);
    this.overlayPanel = this.add.graphics().setDepth(19);

    this.scoreText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "18px",
      color: "#edfdf7",
    });
    this.scoreText.setDepth(6);
    this.scoreText.setShadow(0, 0, "#63ffd8", 8, false, true);

    this.sceneTitle = this.add.text(0, 0, "RETRO TETRIS CABINET", {
      fontFamily: FONT.heading,
      fontSize: "16px",
      color: "#edfdf7",
    });
    this.sceneTitle.setDepth(8);
    this.sceneTitle.setShadow(0, 0, "#63ffd8", 12, false, true);

    this.linesText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "16px",
      color: "#edfdf7",
    });
    this.linesText.setDepth(6);
    this.linesText.setShadow(0, 0, "#63ffd8", 6, false, true);

    this.levelText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "16px",
      color: "#edfdf7",
    });
    this.levelText.setDepth(6);
    this.levelText.setShadow(0, 0, "#63ffd8", 6, false, true);

    this.bestText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#9eb8b0",
    });
    this.bestText.setDepth(6);

    this.nextLabelText = this.add.text(0, 0, "NEXT", {
      fontFamily: FONT.body,
      fontSize: "16px",
      color: "#63ffd8",
    });
    this.nextLabelText.setDepth(6);

    this.statusText = createRetroText(this, 0, 0, "NO HOLD / NO GHOST / CLASSIC RULES", 12, "#9eb8b0");
    this.statusText.setDepth(6);

    this.helpText = createRetroText(
      this,
      0,
      0,
      "ARROWS move . Z/X rotate . DOWN soft drops . R restart . ESC/P pause",
      12,
      "#9eb8b0",
    );
    this.helpText.setDepth(6);

    this.clearBannerText = this.add.text(0, 0, "", {
      fontFamily: FONT.heading,
      fontSize: "30px",
      color: "#63ffd8",
      align: "center",
    });
    this.clearBannerText.setOrigin(0.5);
    this.clearBannerText.setDepth(9);
    this.clearBannerText.setAlpha(0);
    this.clearBannerText.setShadow(0, 0, "#63ffd8", 18, false, true);

    this.clearBonusText = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "15px",
      color: "#edfdf7",
      align: "center",
    });
    this.clearBonusText.setOrigin(0.5);
    this.clearBonusText.setDepth(9);
    this.clearBonusText.setAlpha(0);
    this.clearBonusText.setShadow(0, 0, "#63ffd8", 10, false, true);

    this.pauseTitle = this.add.text(0, 0, "PAUSED", {
      fontFamily: FONT.heading,
      fontSize: "28px",
      color: "#edfdf7",
      align: "center",
    });
    this.pauseTitle.setOrigin(0.5);
    this.pauseTitle.setDepth(20);
    this.pauseTitle.setShadow(0, 0, "#63ffd8", 18, false, true);

    this.pauseHint = this.add.text(0, 0, "ESC / P resumes  .  R restarts  .  M returns to menu", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#9eb8b0",
      align: "center",
      wordWrap: { width: 420 },
    });
    this.pauseHint.setOrigin(0.5);
    this.pauseHint.setDepth(20);

    this.gameOverTitle = this.add.text(0, 0, "GAME OVER", {
      fontFamily: FONT.heading,
      fontSize: "28px",
      color: "#edfdf7",
      align: "center",
    });
    this.gameOverTitle.setOrigin(0.5);
    this.gameOverTitle.setDepth(20);
    this.gameOverTitle.setShadow(0, 0, "#ff6688", 18, false, true);

    this.gameOverSubtitle = this.add.text(0, 0, "The stack hit the skyline.", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#9eb8b0",
      align: "center",
    });
    this.gameOverSubtitle.setOrigin(0.5);
    this.gameOverSubtitle.setDepth(20);

    this.gameOverStats = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#edfdf7",
      align: "center",
      lineSpacing: 8,
    });
    this.gameOverStats.setOrigin(0.5);
    this.gameOverStats.setDepth(20);

    this.retryButton = createRetroButton(this, {
      x: 0,
      y: 0,
      width: 280,
      height: 58,
      label: "RETRY",
      sublabel: "run it back",
      onClick: () => this.restartGame(),
    });
    this.retryButton.container.setDepth(20);

    this.menuButton = createRetroButton(this, {
      x: 0,
      y: 0,
      width: 280,
      height: 58,
      label: "MENU",
      sublabel: "back to the cabinet",
      onClick: () => this.returnToMenu(),
    });
    this.menuButton.container.setDepth(20);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      m: Phaser.Input.Keyboard.KeyCodes.M,
    }) as {
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      z: Phaser.Input.Keyboard.Key;
      x: Phaser.Input.Keyboard.Key;
      up: Phaser.Input.Keyboard.Key;
      esc: Phaser.Input.Keyboard.Key;
      p: Phaser.Input.Keyboard.Key;
      r: Phaser.Input.Keyboard.Key;
      enter: Phaser.Input.Keyboard.Key;
      m: Phaser.Input.Keyboard.Key;
    };

    this.reflow(true);
    this.renderHud();
    this.renderBoard();
    this.renderPreview();
    this.updateOverlayVisibility();
  }

  update(time: number, delta: number): void {
    if (this.lastWidth !== this.scale.width || this.lastHeight !== this.scale.height) {
      this.reflow();
    }

    this.backdrop?.update(delta);

    if (this.overlayMode === "pause") {
      this.handlePauseInput();
      this.renderBoard();
      this.renderPreview();
      return;
    }

    if (this.overlayMode === "game-over") {
      this.handleGameOverInput();
      this.renderBoard();
      this.renderPreview();
      return;
    }

    this.handleGameplayInput(time);
    const tickResult = this.engine.tick(delta);
    this.processEvents(tickResult.events);
    this.renderHud();
    this.renderBoard();
    this.renderPreview();
    this.renderClearOverlay();
    this.syncAudioLevel();
  }

  private handleGameplayInput(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.restartGame();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.returnToMenu();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.p)) {
      this.togglePause();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
      const result = this.engine.rotate(-1);
      if (result.changed) {
        audio.playSfx("rotate");
      }
      this.processEvents(result.events);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.x) || Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      const result = this.engine.rotate(1);
      if (result.changed) {
        audio.playSfx("rotate");
      }
      this.processEvents(result.events);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.horizontalDirection = -1;
      this.horizontalRepeatAt = time + 140;
      const result = this.engine.move(-1);
      if (result.changed) {
        audio.playSfx("move");
      }
      this.processEvents(result.events);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.horizontalDirection = 1;
      this.horizontalRepeatAt = time + 140;
      const result = this.engine.move(1);
      if (result.changed) {
        audio.playSfx("move");
      }
      this.processEvents(result.events);
    }

    const activeDirection =
      this.horizontalDirection === -1
        ? this.keys.left.isDown
          ? -1
          : 0
        : this.horizontalDirection === 1
          ? this.keys.right.isDown
            ? 1
            : 0
          : 0;

    if (activeDirection === 0) {
      this.horizontalDirection = 0;
    } else if (time >= this.horizontalRepeatAt) {
      this.horizontalRepeatAt = time + 55;
      const result = this.engine.move(activeDirection);
      if (result.changed) {
        audio.playSfx("move");
      }
      this.processEvents(result.events);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.softDropRepeatAt = time;
      const result = this.engine.softDrop();
      this.handleSoftDropResult(result);
    }

    if (this.keys.down.isDown && time >= this.softDropRepeatAt) {
      this.softDropRepeatAt = time + 42;
      const result = this.engine.softDrop();
      this.handleSoftDropResult(result);
    }
  }

  private handleSoftDropResult(result: { changed: boolean; events: GameEvent[] }): void {
    this.processEvents(result.events);
  }

  private processEvents(events: GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "lock":
          audio.playSfx("lock");
          break;
        case "clear-start":
          audio.playSfx("clear");
          this.showClearBanner(event.count, event.scoreDelta);
          this.profile.highScore = Math.max(this.profile.highScore, this.engine.state.score);
          this.registry.set("profile", this.profile);
          saveProfile(this.profile);
          break;
        case "level-up":
          this.profile.highScore = Math.max(this.profile.highScore, this.engine.state.score);
          this.registry.set("profile", this.profile);
          saveProfile(this.profile);
          audio.setGameLevel(event.level);
          break;
        case "clear-end":
          break;
        case "spawn":
          this.syncAudioLevel();
          break;
        case "game-over":
          this.showGameOverOverlay();
          audio.playSfx("gameover");
          this.profile.highScore = Math.max(this.profile.highScore, this.engine.state.score);
          this.registry.set("profile", this.profile);
          saveProfile(this.profile);
          break;
        default:
          break;
      }
    }
  }

  private syncAudioLevel(): void {
    if (this.lastAudioLevel !== this.engine.state.level) {
      this.lastAudioLevel = this.engine.state.level;
      audio.setGameLevel(this.engine.state.level);
    }
  }

  private renderHud(): void {
    this.scoreText.setText(`SCORE  ${this.engine.state.score.toLocaleString()}`);
    this.linesText.setText(`LINES  ${this.engine.state.lines.toString().padStart(2, "0")}`);
    this.levelText.setText(`LEVEL  ${this.engine.state.level.toString().padStart(2, "0")}`);
    this.bestText.setText(`BEST   ${Math.max(this.profile.highScore, this.engine.state.score).toLocaleString()}`);

    this.scoreText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + 20);
    this.linesText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + 52);
    this.levelText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + 80);
    this.bestText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + 112);

    this.nextLabelText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + 152);
    this.statusText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + this.layout.sidebarHeight - 62);
    this.statusText.setWordWrapWidth(this.layout.sidebarWidth - 40);

    this.helpText.setPosition(this.layout.sidebarX + 20, this.layout.sidebarY + this.layout.sidebarHeight - 36);
    this.helpText.setWordWrapWidth(this.layout.sidebarWidth - 40);
    this.sceneTitle.setPosition(this.layout.boardX, this.layout.boardY - 36);
  }

  private renderBoard(): void {
    this.lockedCells.clear();
    this.activeCells.clear();

    const { boardX, boardY, tileSize } = this.layout;

    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      for (let column = 0; column < BOARD_WIDTH; column += 1) {
        const cell = this.engine.state.board[row][column];
        if (!cell) {
          continue;
        }

        drawBoardCell(
          this.lockedCells,
          boardX + column * tileSize,
          boardY + row * tileSize,
          tileSize,
          cell,
          1,
        );
      }
    }

    if (this.engine.state.activePiece) {
      const activePiece = this.engine.state.activePiece;
      for (const cell of getPieceCells(activePiece)) {
        if (cell.y < 0) {
          continue;
        }

        drawBoardCell(
          this.activeCells,
          boardX + cell.x * tileSize,
          boardY + cell.y * tileSize,
          tileSize,
          activePiece.kind,
          1,
        );
      }
    }
  }

  private renderClearOverlay(): void {
    this.clearOverlay.clear();
    const clearing = this.engine.state.clearing;
    if (!clearing) {
      return;
    }

    const progress = 1 - clearing.remainingMs / LINE_CLEAR_MS;
    const pulse = Math.sin(progress * Math.PI);
    const alpha = 0.2 + pulse * 0.5;
    const { boardX, boardY, tileSize, boardWidth } = this.layout;

    for (const row of clearing.rows) {
      const y = boardY + row * tileSize;
      this.clearOverlay.fillStyle(0xffffff, alpha);
      this.clearOverlay.fillRect(boardX, y, boardWidth, tileSize);
      this.clearOverlay.lineStyle(2, 0x63ffd8, alpha * 0.9);
      this.clearOverlay.strokeRect(boardX + 0.5, y + 0.5, boardWidth - 1, tileSize - 1);
    }
  }

  private renderPreview(): void {
    this.previewGraphics.clear();
    const previewCount = this.layout.compact ? 3 : 5;
    const nextPieces = this.engine.previewQueue.slice(0, previewCount);
    const boxSize = this.layout.previewTileSize * 4 + 10;
    const gap = this.layout.compact ? 12 : 14;
    const startY = this.layout.previewY;

    nextPieces.forEach((kind, index) => {
      const y = startY + index * (boxSize + gap);
      drawFrame(
        this.previewGraphics,
        this.layout.sidebarX + 16,
        y,
        this.layout.sidebarWidth - 32,
        boxSize,
        COLORS.panelEdgeDim,
        shade(COLORS.panel, 0.84),
      );

      const fakePiece = { kind, rotation: 0, x: 0, y: 0 } as const;
      const cells = getPieceCells(fakePiece);
      const minX = Math.min(...cells.map((cell) => cell.x));
      const maxX = Math.max(...cells.map((cell) => cell.x));
      const minY = Math.min(...cells.map((cell) => cell.y));
      const maxY = Math.max(...cells.map((cell) => cell.y));
      const pieceWidth = (maxX - minX + 1) * this.layout.previewTileSize;
      const pieceHeight = (maxY - minY + 1) * this.layout.previewTileSize;
      const offsetX = this.layout.sidebarX + 16 + Math.floor((this.layout.sidebarWidth - 32 - pieceWidth) / 2);
      const offsetY = y + Math.floor((boxSize - pieceHeight) / 2);

      for (const cell of cells) {
        drawBoardCell(
          this.previewGraphics,
          offsetX + (cell.x - minX) * this.layout.previewTileSize,
          offsetY + (cell.y - minY) * this.layout.previewTileSize,
          this.layout.previewTileSize,
          kind,
          1,
        );
      }
    });
  }

  private reflow(initial = false): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.lastWidth = width;
    this.lastHeight = height;
    this.layout = computeGameLayout(width, height);
    this.backdrop?.resize(width, height);

    const boardOuterX = this.layout.boardX - 14;
    const boardOuterY = this.layout.boardY - 14;
    const boardOuterWidth = this.layout.boardWidth + 28;
    const boardOuterHeight = this.layout.boardHeight + 28;
    drawFrame(this.boardFrame, boardOuterX, boardOuterY, boardOuterWidth, boardOuterHeight);
    this.boardGrid.clear();
    drawPanelGrid(
      this.boardGrid,
      this.layout.boardX,
      this.layout.boardY,
      this.layout.boardWidth,
      this.layout.boardHeight,
      this.layout.tileSize,
      BOARD_WIDTH,
      BOARD_HEIGHT,
      COLORS.grid,
      0.28,
    );

    const sidebarY = this.layout.sidebarY;
    const sidebarHeight = this.layout.sidebarHeight;
    drawFrame(
      this.sidebarFrame,
      this.layout.sidebarX - 14,
      sidebarY - 14,
      this.layout.sidebarWidth + 28,
      sidebarHeight + 28,
      COLORS.panelEdge,
      COLORS.panel,
    );

    this.statusText.setWordWrapWidth(this.layout.sidebarWidth - 40);
    this.helpText.setWordWrapWidth(this.layout.sidebarWidth - 40);

    this.retryButton.container.setPosition(width / 2 - 150, this.layout.height * 0.62);
    this.menuButton.container.setPosition(width / 2 + 150, this.layout.height * 0.62);

    this.overlayScrim.clear();
    this.overlayScrim.fillStyle(0x02040a, 0.62);
    this.overlayScrim.fillRect(0, 0, width, height);

    const panelWidth = Math.min(width - 32, 440);
    const panelHeight = 284;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    this.overlayPanel.clear();
    drawFrame(this.overlayPanel, panelX, panelY, panelWidth, panelHeight, COLORS.panelEdge, COLORS.panel);

    this.pauseTitle.setPosition(width / 2, height / 2 - 24);
    this.pauseHint.setPosition(width / 2, height / 2 + 12);

    this.gameOverTitle.setPosition(width / 2, panelY + 38);
    this.gameOverSubtitle.setPosition(width / 2, panelY + 80);
    this.gameOverStats.setPosition(width / 2, panelY + 136);
    this.retryButton.container.setPosition(width / 2, panelY + 198);
    this.menuButton.container.setPosition(width / 2, panelY + 264);

    this.clearBannerText.setPosition(this.layout.boardX + this.layout.boardWidth / 2, this.layout.boardY + this.layout.boardHeight / 2 - 18);
    this.clearBonusText.setPosition(this.layout.boardX + this.layout.boardWidth / 2, this.layout.boardY + this.layout.boardHeight / 2 + 18);

    if (initial) {
      this.pauseTitle.setText("PAUSED");
      this.pauseHint.setText("ESC / P resumes  .  R restarts  .  M returns to menu");
      this.gameOverStats.setText("");
    }

    this.updateOverlayVisibility();
    this.renderHud();
    this.renderBoard();
    this.renderPreview();
    this.renderClearOverlay();
  }

  private showClearBanner(count: number, scoreDelta: number): void {
    const title = ["SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"][count - 1] ?? "CLEAR";
    this.clearBannerText.setText(title);
    this.clearBonusText.setText(`+${scoreDelta.toLocaleString()}`);
    this.clearBannerText.setAlpha(0);
    this.clearBonusText.setAlpha(0);
    this.tweens.killTweensOf([this.clearBannerText, this.clearBonusText]);
    this.tweens.add({
      targets: this.clearBannerText,
      alpha: { from: 0, to: 1 },
      y: this.clearBannerText.y - 8,
      duration: 120,
      hold: 80,
      yoyo: true,
      ease: "Sine.easeOut",
    });
    this.tweens.add({
      targets: this.clearBonusText,
      alpha: { from: 0, to: 1 },
      y: this.clearBonusText.y - 6,
      duration: 120,
      hold: 80,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    if (this.profile.visuals.screenShake && !this.profile.visuals.reducedMotion) {
      this.cameras.main.shake(110, 0.0025 * count);
    }
    if (!this.profile.visuals.reducedMotion) {
      this.cameras.main.flash(100, 99, 255, 240);
    }
  }

  private showGameOverOverlay(): void {
    this.overlayMode = "game-over";
    this.overlaySelectedIndex = 0;
    this.updateOverlayVisibility();
    this.gameOverSubtitle.setText(`Score ${this.engine.state.score.toLocaleString()}  •  Best ${Math.max(this.profile.highScore, this.engine.state.score).toLocaleString()}`);
    this.gameOverStats.setText([
      `LINES   ${this.engine.state.lines.toString().padStart(2, "0")}`,
      `LEVEL   ${this.engine.state.level.toString().padStart(2, "0")}`,
    ].join("\n"));
    this.updateGameOverSelection();
  }

  private togglePause(): void {
    if (this.overlayMode === "pause") {
      this.overlayMode = null;
      this.updateOverlayVisibility();
      audio.playSfx("menu");
      return;
    }

    if (this.overlayMode === "game-over") {
      return;
    }

    this.overlayMode = "pause";
    this.updateOverlayVisibility();
    audio.playSfx("menu");
  }

  private updateOverlayVisibility(): void {
    const paused = this.overlayMode === "pause";
    const gameOver = this.overlayMode === "game-over";
    this.overlayScrim.setVisible(paused || gameOver);
    this.overlayPanel.setVisible(gameOver);
    this.pauseTitle.setVisible(paused);
    this.pauseHint.setVisible(paused);
    this.gameOverTitle.setVisible(gameOver);
    this.gameOverSubtitle.setVisible(gameOver);
    this.gameOverStats.setVisible(gameOver);
    this.retryButton.container.setVisible(gameOver);
    this.menuButton.container.setVisible(gameOver);
    this.updateGameOverSelection();
  }

  private updateGameOverSelection(): void {
    this.retryButton.setSelected(this.overlayMode === "game-over" && this.overlaySelectedIndex === 0);
    this.menuButton.setSelected(this.overlayMode === "game-over" && this.overlaySelectedIndex === 1);
  }

  private handlePauseInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.p)) {
      this.togglePause();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.restartGame();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.returnToMenu();
    }
  }

  private handleGameOverInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.overlaySelectedIndex = Phaser.Math.Wrap(this.overlaySelectedIndex + 1, 0, 2);
      this.updateGameOverSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.overlaySelectedIndex = Phaser.Math.Wrap(this.overlaySelectedIndex + 1, 0, 2);
      this.updateGameOverSelection();
      audio.playSfx("menu");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      if (this.overlaySelectedIndex === 0) {
        this.restartGame();
      } else {
        this.returnToMenu();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.restartGame();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.m) || Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.returnToMenu();
    }
  }

  private restartGame(): void {
    this.overlayMode = null;
    this.overlaySelectedIndex = 0;
    this.engine = new TetrisGame({
      startLevel: this.profile.gameplay.startingLevel,
    });
    audio.setGameLevel(this.engine.state.level);
    this.horizontalDirection = 0;
    this.horizontalRepeatAt = 0;
    this.softDropRepeatAt = 0;
    this.clearBannerText.setAlpha(0);
    this.clearBonusText.setAlpha(0);
    this.tweens.killTweensOf([this.clearBannerText, this.clearBonusText]);
    this.clearOverlay.clear();
    this.updateOverlayVisibility();
    audio.playSfx("confirm");
    this.renderHud();
    this.renderBoard();
    this.renderPreview();
  }

  private returnToMenu(): void {
    audio.playSfx("back");
    this.overlayMode = null;
    audio.setMode("menu");
    this.scene.start(SceneKeys.MainMenu);
  }
}
