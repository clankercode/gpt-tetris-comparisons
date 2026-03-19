import Phaser from "phaser";
import type { Settings, GameMode } from "../state/Settings";
import type { Chiptune } from "../audio/Chiptune";
import { TetrisGame } from "../tetris/game";
import { BOARD_W, VISIBLE_H, VISIBLE_Y } from "../tetris/board";
import type { TetrominoType } from "../tetris/types";
import { COLORS } from "../tetris/colors";

type Key = Phaser.Input.Keyboard.Key;

export class GameScene extends Phaser.Scene {
  static KEY = "game";
  private chip!: Chiptune;
  private gameModel = new TetrisGame();

  private mode: GameMode = "marathon";
  private paused = false;

  // Input
  private kLeft!: Key;
  private kRight!: Key;
  private kDown!: Key;
  private kUp!: Key;
  private kZ!: Key;
  private kX!: Key;
  private kC!: Key;
  private kShift!: Key;
  private kSpace!: Key;
  private kEsc!: Key;
  private kR!: Key;

  private dasDir: -1 | 1 | 0 = 0;
  private dasMs = 0;
  private arrMs = 0;
  private dasDelay = 150;
  private arrDelay = 40;

  // View
  private boardSprites: Phaser.GameObjects.Image[][] = [];
  private activeSprites: Phaser.GameObjects.Image[] = [];
  private ghostSprites: Phaser.GameObjects.Image[] = [];
  private holdSprites: Phaser.GameObjects.Image[] = [];
  private nextSprites: Phaser.GameObjects.Image[] = [];

  private hudScore!: Phaser.GameObjects.Text;
  private hudLines!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private overlayText!: Phaser.GameObjects.Text;
  private crtOverlay?: Phaser.GameObjects.TileSprite;
  private vignette?: Phaser.GameObjects.Graphics;

  // Effects
  private flash?: Phaser.GameObjects.Rectangle;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private settings: Settings) {
    super(GameScene.KEY);
  }

  init(data: { mode?: GameMode }) {
    this.mode = data.mode ?? "marathon";
  }

  create() {
    this.chip = this.registry.get("chip") as Chiptune;
    this.makeBackdrop();
    this.makeFrameAndUI();
    this.makeBoardSprites();
    this.makeHoldAndNext();
    this.makeOverlays();
    this.bindInput();

    this.gameModel.onEvent = (e) => this.onGameEvent(e);
    this.gameModel.start(this.mode, this.time.now);
    this.refreshAll();
  }

  update(_: number, dt: number) {
    if (this.paused) return;

    this.handleDAS(dt);
    this.gameModel.setSoftDrop(this.kDown.isDown);

    this.gameModel.tick(dt);
    this.refreshDynamic();

    if (this.mode === "sprint40") {
      const s = this.gameModel.snapshot();
      this.refreshHud();
      if (s.sprintDone && !s.over) {
        this.showOverlay(`SPRINT COMPLETE\n${formatMs(this.time.now - s.startMs)}\nPRESS ENTER`);
        this.paused = true;
        this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("menu"));
      }
    } else {
      this.refreshHud();
    }

    if (this.gameModel.snapshot().over) {
      this.showOverlay("GAME OVER\nPRESS R TO RESTART\nPRESS ESC FOR MENU");
      this.paused = true;
    }
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    this.kLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.kRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.kDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.kUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.kZ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.kX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.kC = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.kShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.kSpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.kEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.kR = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    kb.on("keydown-LEFT", () => this.onLeftDown());
    kb.on("keydown-RIGHT", () => this.onRightDown());
    kb.on("keyup-LEFT", () => this.onHorUp(-1));
    kb.on("keyup-RIGHT", () => this.onHorUp(1));

    kb.on("keydown-Z", () => this.tryRotate(-1));
    kb.on("keydown-X", () => this.tryRotate(1));
    kb.on("keydown-UP", () => this.tryRotate(1));

    kb.on("keydown-SPACE", () => this.tryHardDrop());
    kb.on("keydown-C", () => this.tryHold());
    kb.on("keydown-SHIFT", () => this.tryHold());

    kb.on("keydown-ESC", () => {
      if (this.gameModel.snapshot().over) {
        this.scene.start("menu");
        return;
      }
      this.togglePause();
    });

    kb.on("keydown-R", () => {
      if (this.gameModel.snapshot().over) {
        this.scene.restart({ mode: this.mode });
        return;
      }
      if (this.paused) this.scene.restart({ mode: this.mode });
    });
  }

  private onLeftDown() {
    this.dasDir = -1;
    this.dasMs = 0;
    this.arrMs = 0;
    if (this.gameModel.tryMove(-1, 0)) this.chip.playSfx("move");
  }

  private onRightDown() {
    this.dasDir = 1;
    this.dasMs = 0;
    this.arrMs = 0;
    if (this.gameModel.tryMove(1, 0)) this.chip.playSfx("move");
  }

  private onHorUp(dir: -1 | 1) {
    if (this.dasDir === dir) this.dasDir = 0;
  }

  private handleDAS(dt: number) {
    if (this.dasDir === 0) return;
    this.dasMs += dt;
    if (this.dasMs < this.dasDelay) return;
    this.arrMs += dt;
    while (this.arrMs >= this.arrDelay) {
      this.arrMs -= this.arrDelay;
      if (this.gameModel.tryMove(this.dasDir, 0)) {
        this.chip.playSfx("move");
      } else {
        break;
      }
    }
  }

  private tryRotate(dir: -1 | 1) {
    if (this.paused) return;
    if (this.gameModel.rotate(dir)) this.chip.playSfx("rotate");
  }

  private tryHardDrop() {
    if (this.paused) return;
    this.gameModel.hardDrop();
    this.chip.playSfx("drop");
  }

  private tryHold() {
    if (this.paused) return;
    if (!this.settings.data.hold) return;
    if (this.gameModel.holdSwap()) this.chip.playSfx("ui");
  }

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.showOverlay("PAUSED\nPRESS ESC TO RESUME\nR TO RESTART\nENTER FOR MENU");
    else this.hideOverlay();

    if (this.paused) {
      this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("menu"));
    }
  }

  private onGameEvent(e: { type: string; [k: string]: unknown }) {
    if (e.type === "lineclear") {
      const cleared = e.cleared as number;
      if (cleared === 4) this.chip.playSfx("tetris");
      else this.chip.playSfx("line");
      this.lineClearFx(cleared);
    } else if (e.type === "level") {
      this.chip.playSfx("level");
    } else if (e.type === "gameover") {
      this.chip.playSfx("gameover");
    } else if (e.type === "lock") {
      this.chip.playSfx("lock");
    }
    this.refreshAll();
  }

  private refreshAll() {
    this.refreshBoard();
    this.refreshDynamic();
    this.refreshHoldNext();
    this.refreshHud();
  }

  private refreshHud() {
    const s = this.gameModel.snapshot();
    this.hudScore.setText(`SCORE\n${s.score.toString().padStart(7, "0")}`);
    this.hudLines.setText(`LINES\n${s.lines.toString().padStart(3, "0")}`);
    this.hudLevel.setText(`LEVEL\n${s.level.toString().padStart(2, "0")}`);
    if (s.mode === "sprint40") {
      const ms = this.time.now - s.startMs;
      this.hudTime.setText(`TIME\n${formatMs(ms)}`);
      this.hudTime.setVisible(true);
    } else {
      this.hudTime.setVisible(false);
    }
  }

  private refreshBoard() {
    const s = this.gameModel.snapshot();
    for (let vy = 0; vy < VISIBLE_H; vy++) {
      const y = vy + VISIBLE_Y;
      for (let x = 0; x < BOARD_W; x++) {
        const spr = this.boardSprites[vy]![x]!;
        const cell = s.board.get(x, y);
        if (!cell) {
          spr.setVisible(false);
          continue;
        }
        spr.setVisible(true);
        spr.setTint(COLORS[cell.type]);
        spr.setAlpha(1);
      }
    }
  }

  private refreshDynamic() {
    const s = this.gameModel.snapshot();
    const cells = this.gameModel.activeCellsAt();
    for (let i = 0; i < this.activeSprites.length; i++) {
      const spr = this.activeSprites[i]!;
      const c = cells[i]!;
      const vy = c.y - VISIBLE_Y;
      if (vy < 0 || vy >= VISIBLE_H) {
        spr.setVisible(false);
        continue;
      }
      spr.setVisible(true);
      spr.setTint(COLORS[s.active.type]);
      spr.setPosition(this.boardToX(c.x), this.boardToY(vy));
      spr.setAlpha(1);
    }

    if (this.settings.data.ghost) {
      const dropY = this.gameModel.getProjectedDropY();
      const ghostCells = this.gameModel.activeCellsAt({ x: s.active.x, y: dropY, rot: s.active.rot });
      for (let i = 0; i < this.ghostSprites.length; i++) {
        const spr = this.ghostSprites[i]!;
        const c = ghostCells[i]!;
        const vy = c.y - VISIBLE_Y;
        if (vy < 0 || vy >= VISIBLE_H) {
          spr.setVisible(false);
          continue;
        }
        spr.setVisible(true);
        spr.setTint(COLORS[s.active.type]);
        spr.setPosition(this.boardToX(c.x), this.boardToY(vy));
        spr.setAlpha(0.18);
      }
    } else {
      for (const spr of this.ghostSprites) spr.setVisible(false);
    }
  }

  private refreshHoldNext() {
    // hold
    const holdType = this.gameModel.hold;
    for (const s of this.holdSprites) s.setVisible(false);
    if (holdType) this.drawMini(this.holdSprites, holdType, 150, 210, 18, 0.9);

    // next
    for (const s of this.nextSprites) s.setVisible(false);
    const next = this.gameModel.nextQueue.slice(0, 3);
    for (let i = 0; i < next.length; i++) {
      this.drawMini(this.nextSprites.slice(i * 4, i * 4 + 4), next[i]!, 810, 190 + i * 70, 16, 0.95);
    }
  }

  private drawMini(sprites: Phaser.GameObjects.Image[], type: TetrominoType, x: number, y: number, cell: number, alpha: number) {
    const blocks = miniBlocks(type);
    for (let i = 0; i < sprites.length; i++) {
      const spr = sprites[i]!;
      const b = blocks[i]!;
      spr.setVisible(true);
      spr.setTint(COLORS[type]);
      spr.setAlpha(alpha);
      spr.setScale(cell / 24);
      spr.setPosition(x + b.x * cell, y + b.y * cell);
    }
  }

  private makeBackdrop() {
    const stars = this.add.particles(0, 0, "px", {
      x: { min: -50, max: 1010 },
      y: { min: -50, max: 590 },
      lifespan: { min: 2600, max: 5600 },
      speedY: { min: 30, max: 90 },
      speedX: { min: -12, max: 12 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      quantity: 2,
      blendMode: "ADD",
      tint: [0x79ffd7, 0xff4fd8, 0xffbf4d, 0xd4f7ff]
    });
    stars.setDepth(-10);

    // a dim "grid" to evoke CRT geometry
    const grid = this.add.graphics().setDepth(-9);
    const draw = () => {
      grid.clear();
      grid.lineStyle(1, 0x79ffd7, 0.06);
      for (let x = 0; x < 960; x += 36) grid.lineBetween(x, 0, x, 540);
      for (let y = 0; y < 540; y += 36) grid.lineBetween(0, y, 960, y);
    };
    draw();
  }

  private makeFrameAndUI() {
    const frame = this.add.graphics();
    frame.fillStyle(0x0b0715, 0.75);
    frame.fillRoundedRect(250, 70, 460, 420, 16);
    frame.lineStyle(2, 0x79ffd7, 0.35);
    frame.strokeRoundedRect(250, 70, 460, 420, 16);

    const side = this.add.graphics();
    side.fillStyle(0x0b0715, 0.6);
    side.fillRoundedRect(60, 120, 160, 330, 16);
    side.fillRoundedRect(740, 120, 160, 330, 16);
    side.lineStyle(2, 0xff4fd8, 0.25);
    side.strokeRoundedRect(60, 120, 160, 330, 16);
    side.strokeRoundedRect(740, 120, 160, 330, 16);

    this.add.text(140, 140, "HOLD", { fontSize: "16px", color: "#79ffd7" }).setOrigin(0.5, 0);
    this.add.text(820, 140, "NEXT", { fontSize: "16px", color: "#79ffd7" }).setOrigin(0.5, 0);

    this.hudScore = this.add.text(140, 320, "SCORE\n0000000", { fontSize: "16px", color: "#d4f7ff", align: "center" }).setOrigin(0.5);
    this.hudLines = this.add.text(140, 390, "LINES\n000", { fontSize: "16px", color: "#d4f7ff", align: "center" }).setOrigin(0.5);
    this.hudLevel = this.add.text(140, 460, "LEVEL\n00", { fontSize: "16px", color: "#d4f7ff", align: "center" }).setOrigin(0.5);
    this.hudTime = this.add.text(820, 420, "TIME\n00:00.00", { fontSize: "16px", color: "#ffbf4d", align: "center" }).setOrigin(0.5);

    this.add.text(480, 34, this.mode === "sprint40" ? "SPRINT 40" : "MARATHON", { fontSize: "18px", color: "#ffbf4d" }).setOrigin(0.5);
  }

  private makeBoardSprites() {
    const originX = 480 - (BOARD_W * 24) / 2;
    const originY = 90;

    for (let vy = 0; vy < VISIBLE_H; vy++) {
      const row: Phaser.GameObjects.Image[] = [];
      for (let x = 0; x < BOARD_W; x++) {
        const spr = this.add.image(originX + x * 24 + 12, originY + vy * 24 + 12, "block").setVisible(false);
        row.push(spr);
      }
      this.boardSprites.push(row);
    }

    for (let i = 0; i < 4; i++) {
      const a = this.add.image(0, 0, "block").setVisible(false);
      const g = this.add.image(0, 0, "block").setVisible(false);
      g.setAlpha(0.18);
      this.activeSprites.push(a);
      this.ghostSprites.push(g);
    }

    this.flash = this.add.rectangle(480, 270, 960, 540, 0xffffff, 0).setDepth(50);

    const emitter = this.add.particles(0, 0, "px", {
      x: 0,
      y: 0,
      speed: { min: 60, max: 240 },
      angle: { min: 210, max: 330 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 1.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 6,
      blendMode: "ADD",
      on: false
    });
    emitter.setDepth(55);
    this.particles = emitter;
  }

  private makeHoldAndNext() {
    for (let i = 0; i < 4; i++) {
      const spr = this.add.image(0, 0, "block").setVisible(false);
      spr.setScale(18 / 24);
      this.holdSprites.push(spr);
    }

    // 3 previews * 4 blocks each
    for (let i = 0; i < 12; i++) {
      const spr = this.add.image(0, 0, "block").setVisible(false);
      spr.setScale(16 / 24);
      this.nextSprites.push(spr);
    }
  }

  private makeOverlays() {
    this.overlayText = this.add
      .text(480, 270, "", {
        fontSize: "28px",
        color: "#79ffd7",
        align: "center",
        stroke: "#0b0715",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(80)
      .setVisible(false);

    if (this.settings.data.crt) {
      this.crtOverlay = this.add.tileSprite(0, 0, 960, 540, "scan").setOrigin(0, 0).setDepth(90);
      this.crtOverlay.setAlpha(0.25);
      this.crtOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.time.addEvent({
        delay: 33,
        loop: true,
        callback: () => {
          if (!this.crtOverlay) return;
          this.crtOverlay.tilePositionY += 0.45;
          this.crtOverlay.setAlpha(0.22 + Math.random() * 0.05);
        }
      });

      this.vignette = this.add.graphics().setDepth(89);
      this.drawVignette();
    }

    this.add
      .text(480, 520, "Z/X rotate, \u2190\u2192 move, \u2193 soft, SPACE hard, C hold, ESC pause", { fontSize: "14px", color: "#ff4fd8" })
      .setOrigin(0.5, 1)
      .setAlpha(0.95);
  }

  private drawVignette() {
    if (!this.vignette) return;
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, 0.35);
    this.vignette.fillRect(0, 0, 960, 60);
    this.vignette.fillRect(0, 480, 960, 60);
    this.vignette.fillRect(0, 0, 70, 540);
    this.vignette.fillRect(890, 0, 70, 540);
  }

  private showOverlay(text: string) {
    this.overlayText.setText(text);
    this.overlayText.setVisible(true);
  }

  private hideOverlay() {
    this.overlayText.setVisible(false);
  }

  private lineClearFx(cleared: number) {
    const cam = this.cameras.main;
    cam.shake(80 + cleared * 25, 0.004 + cleared * 0.001);
    this.flash?.setFillStyle(0xffffff, cleared === 4 ? 0.25 : 0.16);
    this.tweens.add({
      targets: this.flash,
      alpha: { from: 1, to: 0 },
      duration: 180,
      ease: "Quad.out"
    });

    // Burst from the center of the board
    const cx = 480;
    const cy = 270;
    this.particles?.setPosition(cx, cy);
    this.particles?.setTint([0x79ffd7, 0xff4fd8, 0xffbf4d, 0xd4f7ff]);
    this.particles?.explode(40 + cleared * 28, cx, cy);

    if (cleared === 4) {
      const banner = this.add
        .text(480, 118, "TETRIS!", { fontSize: "34px", color: "#ffbf4d", stroke: "#0b0715", strokeThickness: 10 })
        .setOrigin(0.5)
        .setDepth(70);
      banner.setShadow(0, 10, "#000", 14, true, true);
      this.tweens.add({
        targets: banner,
        y: 90,
        alpha: { from: 1, to: 0 },
        duration: 700,
        ease: "Cubic.out",
        onComplete: () => banner.destroy()
      });
    }
  }

  private boardToX(x: number): number {
    const originX = 480 - (BOARD_W * 24) / 2;
    return originX + x * 24 + 12;
  }

  private boardToY(vy: number): number {
    const originY = 90;
    return originY + vy * 24 + 12;
  }
}

function miniBlocks(type: TetrominoType): Array<{ x: number; y: number }> {
  // Simple 2-3 wide minis (not rotated), for hold/next. Keep it compact.
  switch (type) {
    case "I":
      return [
        { x: -1.5, y: 0 },
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 },
        { x: 1.5, y: 0 }
      ];
    case "O":
      return [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: -0.5, y: 0.5 },
        { x: 0.5, y: 0.5 }
      ];
    case "T":
      return [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 }
      ];
    case "S":
      return [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: -1 }
      ];
    case "Z":
      return [
        { x: -1, y: -1 },
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ];
    case "J":
      return [
        { x: -1, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ];
    case "L":
      return [
        { x: 1, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ];
  }
}

function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const m = Math.floor(clamped / 60000);
  const s = Math.floor((clamped % 60000) / 1000);
  const cs = Math.floor((clamped % 1000) / 10);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
