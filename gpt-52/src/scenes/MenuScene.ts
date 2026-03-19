import Phaser from "phaser";
import type { Settings } from "../state/Settings";
import type { GameMode } from "../state/Settings";
import type { Chiptune } from "../audio/Chiptune";

type MenuItem = { label: string; action: () => void };

export class MenuScene extends Phaser.Scene {
  static KEY = "menu";
  private items: MenuItem[] = [];
  private selected = 0;
  private labels: Phaser.GameObjects.Text[] = [];
  private hint!: Phaser.GameObjects.Text;
  private controls!: Phaser.GameObjects.Text;
  private chip!: Chiptune;

  constructor(private settings: Settings) {
    super(MenuScene.KEY);
  }

  create() {
    this.chip = this.registry.get("chip") as Chiptune;

    this.makeBackdrop();

    const title = this.add
      .text(480, 88, "RETRO TETRIS", {
        fontSize: "54px",
        color: "#79ffd7",
        stroke: "#140a2b",
        strokeThickness: 10
      })
      .setOrigin(0.5);
    title.setShadow(0, 6, "#000", 10, true, true);

    this.items = [
      { label: "NEW GAME: MARATHON", action: () => this.startMode("marathon") },
      { label: "NEW GAME: SPRINT 40", action: () => this.startMode("sprint40") },
      { label: "SETTINGS", action: () => this.scene.start("settings") },
      { label: "ABOUT", action: () => this.scene.start("about") }
    ];

    const x = 480;
    const y0 = 190;
    const yStep = 44;
    this.labels = this.items.map((it, i) =>
      this.add
        .text(x, y0 + i * yStep, it.label, {
          fontSize: "22px",
          color: "#d4f7ff",
          stroke: "#0b0715",
          strokeThickness: 6
        })
        .setOrigin(0.5)
    );

    this.hint = this.add
      .text(480, 420, "ARROWS / WASD to move, Z/X to rotate, SPACE hard drop, C hold, ESC pause", {
        fontSize: "14px",
        color: "#ffbf4d"
      })
      .setOrigin(0.5);

    this.controls = this.add
      .text(
        50,
        470,
        [
          "CONTROLS",
          "Left/Right: \u2190 \u2192  (A/D)",
          "Rotate: Z (CCW) / X or \u2191 (CW)",
          "Soft Drop: \u2193 (S)",
          "Hard Drop: SPACE",
          "Hold: C or SHIFT",
          "Pause: ESC",
          "Restart: R"
        ].join("\n"),
        {
          fontSize: "14px",
          color: "#79ffd7",
          lineSpacing: 4
        }
      )
      .setOrigin(0, 1);

    this.add
      .text(910, 520, "PRESS ENTER", { fontSize: "14px", color: "#ff4fd8" })
      .setOrigin(1, 1)
      .setAlpha(0.95);

    this.tweens.add({
      targets: this.controls,
      alpha: { from: 0.75, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.refreshSelection();
    this.bindInput();
  }

  private bindInput() {
    const up = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const down = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const w = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const s = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.input.keyboard?.on("keydown", () => this.chip.playSfx("ui"));

    this.input.keyboard?.on("keydown-UP", () => this.moveSel(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveSel(1));
    w?.on("down", () => this.moveSel(-1));
    s?.on("down", () => this.moveSel(1));

    enter?.on("down", () => {
      this.chip.playSfx("ui");
      this.items[this.selected]?.action();
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.chip.playSfx("ui");
      this.items[this.selected]?.action();
    });
  }

  private moveSel(dir: number) {
    this.selected = (this.selected + dir + this.items.length) % this.items.length;
    this.refreshSelection();
  }

  private refreshSelection() {
    for (let i = 0; i < this.labels.length; i++) {
      const t = this.labels[i]!;
      const is = i === this.selected;
      t.setColor(is ? "#79ffd7" : "#d4f7ff");
      t.setScale(is ? 1.1 : 1.0);
      t.setShadow(0, is ? 10 : 6, "#000", is ? 12 : 10, true, true);
    }
  }

  private startMode(mode: GameMode) {
    this.scene.start("game", { mode });
  }

  private makeBackdrop() {
    // Starfield
    const stars = this.add.particles(0, 0, "px", {
      x: { min: -50, max: 1010 },
      y: { min: -50, max: 590 },
      lifespan: { min: 2400, max: 5400 },
      speedY: { min: 20, max: 60 },
      speedX: { min: -8, max: 8 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      quantity: 2,
      blendMode: "ADD",
      tint: [0x79ffd7, 0xff4fd8, 0xffbf4d, 0xd4f7ff]
    });
    stars.setDepth(-10);

    // Subtle "neon fog" blobs
    const fog = this.add.graphics().setDepth(-9);
    const w = 960;
    const h = 540;
    const drawFog = () => {
      fog.clear();
      fog.fillStyle(0x79ffd7, 0.04);
      fog.fillCircle(w * 0.25 + Math.sin(this.time.now * 0.001) * 40, h * 0.35, 220);
      fog.fillStyle(0xff4fd8, 0.035);
      fog.fillCircle(w * 0.72 + Math.cos(this.time.now * 0.0011) * 50, h * 0.5, 260);
      fog.fillStyle(0xffbf4d, 0.025);
      fog.fillCircle(w * 0.52, h * 0.78 + Math.sin(this.time.now * 0.0008) * 40, 240);
    };
    drawFog();
    this.time.addEvent({ delay: 33, loop: true, callback: drawFog });
  }
}

