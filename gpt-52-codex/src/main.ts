import Phaser from "phaser";
import "./style.css";

type GameMode = "marathon" | "sprint";

type SettingsState = {
  music: boolean;
  sfx: boolean;
};

type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

type Piece = {
  type: PieceType;
  x: number;
  y: number;
  rot: number;
};

const COLS = 10;
const ROWS = 20;
const BLOCK = 28;

const COLORS: Record<PieceType, number> = {
  I: 0x59f7ff,
  J: 0x4f6bff,
  L: 0xff9a3c,
  O: 0xfff15a,
  S: 0x55ff8f,
  T: 0xd36bff,
  Z: 0xff4c6a
};

const SHAPES: Record<PieceType, Array<Array<[number, number]>>> = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1]
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3]
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3]
    ]
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2]
    ]
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2]
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2]
    ]
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ]
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2]
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2]
    ]
  ]
};

const KICKS_JLSTZ: Record<string, Array<[number, number]>> = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2]
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2]
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2]
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2]
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2]
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2]
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2]
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2]
  ]
};

const KICKS_I: Record<string, Array<[number, number]>> = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2]
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1]
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2]
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1]
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2]
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1]
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2]
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1]
  ]
};

class Chiptune {
  private ctx: AudioContext | null = null;
  private playing = false;
  private tempo = 120;
  private step = 0;
  private timer: number | null = null;
  private patterns = [
    [0, 4, 7, 12, 7, 4, 0, 4],
    [0, 3, 7, 10, 7, 3, 0, 3],
    [0, 5, 9, 12, 9, 5, 0, 5]
  ];

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  getContext() {
    return this.ctx;
  }

  start() {
    this.ensureContext();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    const interval = (60 / this.tempo) * 1000;
    this.timer = window.setInterval(() => this.tick(), interval);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
  }

  private tick() {
    if (!this.ctx) return;
    const base = 220;
    const pattern = this.patterns[this.step % this.patterns.length];
    const note = pattern[this.step % pattern.length];
    const freq = base * Math.pow(2, note / 12);
    this.play(freq, 0.12, "square", 0.08);
    this.play(freq * 2, 0.1, "triangle", 0.04);
    this.step += 1;
  }

  private play(freq: number, duration: number, type: OscillatorType, gain: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(this.ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  }
}

const audio = new Chiptune();
const settings: SettingsState = {
  music: true,
  sfx: true
};

function playSfx(freq: number, duration = 0.08) {
  if (!settings.sfx) return;
  audio.ensureContext();
  const ctx = audio.getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.value = 0.12;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

class TetrisScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  private board: number[][] = [];
  private current: Piece | null = null;
  private bag: PieceType[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dropAccumulator = 0;
  private lockAccumulator = 0;
  private softDrop = false;
  private paused = true;
  private mode: GameMode = "marathon";
  private score = 0;
  private lines = 0;
  private level = 1;
  private sprintTarget = 40;
  private gameOver = false;

  create() {
    this.graphics = this.add.graphics();
    const pixel = this.add.graphics();
    pixel.fillStyle(0xffffff);
    pixel.fillRect(0, 0, 2, 2);
    pixel.generateTexture("pixel", 2, 2);
    pixel.destroy();

    this.emitter = this.add.particles(0, 0, "pixel", {
      lifespan: 400,
      speed: { min: 80, max: 180 },
      scale: { start: 1.2, end: 0 },
      quantity: 14,
      on: false,
      blendMode: "ADD"
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.tryMove(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.tryMove(1));
    this.input.keyboard?.on("keydown-UP", () => this.tryRotate(1));
    this.input.keyboard?.on("keydown-Z", () => this.tryRotate(-1));
    this.input.keyboard?.on("keydown-X", () => this.tryRotate(1));
    this.input.keyboard?.on("keydown-SPACE", () => this.hardDrop());
    this.input.keyboard?.on("keydown-P", () => this.togglePause());
    this.input.keyboard?.on("keydown-ESC", () => showMenu());
    this.input.keyboard?.on("keydown-DOWN", () => (this.softDrop = true));
    this.input.keyboard?.on("keyup-DOWN", () => (this.softDrop = false));

    this.resetGame("marathon");
  }

  resetGame(mode: GameMode) {
    this.mode = mode;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.current = null;
    this.dropAccumulator = 0;
    this.lockAccumulator = 0;
    this.softDrop = false;
    this.paused = false;
    this.gameOver = false;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.spawnPiece();
    updateHud(this.score, this.lines, this.level, mode);
    hideGameOver();
  }

  update(_: number, delta: number) {
    if (this.paused || this.gameOver) return;
    const dropInterval = this.getDropInterval();
    this.dropAccumulator += delta;

    if (this.softDrop) {
      this.dropAccumulator += delta * 3;
    }

    while (this.dropAccumulator >= dropInterval) {
      this.dropAccumulator -= dropInterval;
      if (!this.tryMove(0, 1)) {
        this.lockAccumulator += dropInterval;
        if (this.lockAccumulator >= 500) {
          this.lockPiece();
        }
      } else {
        this.lockAccumulator = 0;
      }
    }

    this.draw();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  private getDropInterval() {
    return Math.max(60, 1000 * Math.pow(0.8, this.level - 1));
  }

  private refillBag() {
    const pieces: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    this.bag.push(...pieces);
  }

  private spawnPiece() {
    if (this.bag.length < 3) this.refillBag();
    const type = this.bag.shift() as PieceType;
    this.current = { type, x: 3, y: -1, rot: 0 };
    if (!this.canPlace(this.current)) {
      this.gameOver = true;
      showGameOver();
    }
  }

  private tryMove(dx: number, dy = 0) {
    if (!this.current || this.paused) return false;
    const next = { ...this.current, x: this.current.x + dx, y: this.current.y + dy };
    if (this.canPlace(next)) {
      this.current = next;
      playSfx(420);
      return true;
    }
    return false;
  }

  private tryRotate(dir: number) {
    if (!this.current || this.paused) return;
    const nextRot = (this.current.rot + dir + 4) % 4;
    const key = `${this.current.rot}>${nextRot}`;
    const kicks =
      this.current.type === "I"
        ? KICKS_I[key]
        : this.current.type === "O"
          ? [[0, 0]]
          : KICKS_JLSTZ[key];

    for (const [kx, ky] of kicks) {
      const candidate = {
        ...this.current,
        rot: nextRot,
        x: this.current.x + kx,
        y: this.current.y + ky
      };
      if (this.canPlace(candidate)) {
        this.current = candidate;
        playSfx(520);
        return;
      }
    }
  }

  private hardDrop() {
    if (!this.current || this.paused) return;
    let moved = 0;
    while (this.tryMove(0, 1)) moved += 1;
    this.score += moved * 2;
    this.lockPiece();
  }

  private lockPiece() {
    if (!this.current) return;
    for (const [x, y] of SHAPES[this.current.type][this.current.rot]) {
      const px = this.current.x + x;
      const py = this.current.y + y;
      if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
        this.board[py][px] = COLORS[this.current.type];
      }
    }
    const cleared = this.clearLines();
    if (cleared > 0) {
      this.lines += cleared;
      this.score += this.getLineScore(cleared);
      this.level = 1 + Math.floor(this.lines / 10);
      this.runClearEffect();
      if (this.mode === "sprint" && this.lines >= this.sprintTarget) {
        this.gameOver = true;
        showGameOver("Sprint Complete");
        return;
      }
    }
    updateHud(this.score, this.lines, this.level, this.mode);
    this.lockAccumulator = 0;
    this.spawnPiece();
  }

  private getLineScore(lines: number) {
    const base = [0, 100, 300, 500, 800][lines] || 0;
    return base * this.level;
  }

  private clearLines() {
    let cleared = 0;
    this.board = this.board.filter((row) => {
      if (row.every((cell) => cell !== 0)) {
        cleared += 1;
        return false;
      }
      return true;
    });
    while (this.board.length < ROWS) {
      this.board.unshift(Array(COLS).fill(0));
    }
    return cleared;
  }

  private canPlace(piece: Piece) {
    const shape = SHAPES[piece.type][piece.rot];
    for (const [x, y] of shape) {
      const px = piece.x + x;
      const py = piece.y + y;
      if (px < 0 || px >= COLS || py >= ROWS) return false;
      if (py >= 0 && this.board[py][px] !== 0) return false;
    }
    return true;
  }

  private runClearEffect() {
    this.cameras.main.flash(120, 255, 255, 255);
    this.cameras.main.shake(80, 0.006);
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.emitter.explode(18, centerX, centerY);
    playSfx(760, 0.14);
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    const boardWidth = COLS * BLOCK;
    const boardHeight = ROWS * BLOCK;
    const offsetX = (this.scale.width - boardWidth) / 2;
    const offsetY = (this.scale.height - boardHeight) / 2;

    g.fillStyle(0x05070e, 0.9);
    g.fillRect(offsetX - 6, offsetY - 6, boardWidth + 12, boardHeight + 12);
    g.lineStyle(1, 0x22304f, 0.4);
    for (let y = 0; y <= ROWS; y++) {
      g.lineBetween(offsetX, offsetY + y * BLOCK, offsetX + boardWidth, offsetY + y * BLOCK);
    }
    for (let x = 0; x <= COLS; x++) {
      g.lineBetween(offsetX + x * BLOCK, offsetY, offsetX + x * BLOCK, offsetY + boardHeight);
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = this.board[y][x];
        if (color !== 0) {
          this.drawBlock(g, offsetX + x * BLOCK, offsetY + y * BLOCK, color, 1);
        }
      }
    }

    if (this.current) {
      const ghostY = this.getGhostY(this.current);
      for (const [x, y] of SHAPES[this.current.type][this.current.rot]) {
        const gx = this.current.x + x;
        const gy = ghostY + y;
        if (gy >= 0) {
          this.drawBlock(g, offsetX + gx * BLOCK, offsetY + gy * BLOCK, 0xffffff, 0.15);
        }
      }

      for (const [x, y] of SHAPES[this.current.type][this.current.rot]) {
        const px = this.current.x + x;
        const py = this.current.y + y;
        if (py >= 0) {
          this.drawBlock(g, offsetX + px * BLOCK, offsetY + py * BLOCK, COLORS[this.current.type], 1);
        }
      }
    }
  }

  private drawBlock(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    alpha: number
  ) {
    g.fillStyle(color, alpha);
    g.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
    g.lineStyle(1, 0xffffff, alpha * 0.4);
    g.strokeRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
  }

  private getGhostY(piece: Piece) {
    let test = { ...piece };
    while (this.canPlace({ ...test, y: test.y + 1 })) {
      test = { ...test, y: test.y + 1 };
    }
    return test.y;
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) showPause();
    else hidePause();
  }
}

const menu = document.getElementById("menu") as HTMLDivElement;
const pausePanel = document.getElementById("pause") as HTMLDivElement;
const gameOverPanel = document.getElementById("gameover") as HTMLDivElement;
const hudScore = document.getElementById("hud-score") as HTMLDivElement;
const hudLines = document.getElementById("hud-lines") as HTMLDivElement;
const hudLevel = document.getElementById("hud-level") as HTMLDivElement;
const hudMode = document.getElementById("hud-mode") as HTMLDivElement;

const menuButtons = Array.from(document.querySelectorAll(".menu-button[data-panel]"));
const panelNewgame = document.getElementById("panel-newgame") as HTMLDivElement;
const panelSettings = document.getElementById("panel-settings") as HTMLDivElement;
const panelAbout = document.getElementById("panel-about") as HTMLDivElement;

const toggleMusic = document.getElementById("toggle-music") as HTMLInputElement;
const toggleSfx = document.getElementById("toggle-sfx") as HTMLInputElement;

let game: Phaser.Game | null = null;
let sceneRef: TetrisScene | null = null;

function updateHud(score: number, lines: number, level: number, mode: GameMode) {
  hudScore.textContent = `${score}`;
  hudLines.textContent = `${lines}`;
  hudLevel.textContent = `${level}`;
  hudMode.textContent = mode === "marathon" ? "Marathon" : "Sprint";
}

function showMenu() {
  menu.classList.remove("hidden");
  pausePanel.classList.add("hidden");
  gameOverPanel.classList.add("hidden");
  hudMode.textContent = "Menu";
  if (sceneRef) sceneRef.setPaused(true);
}

function hideMenu() {
  menu.classList.add("hidden");
  pausePanel.classList.add("hidden");
  gameOverPanel.classList.add("hidden");
}

function showPause() {
  pausePanel.classList.remove("hidden");
}

function hidePause() {
  pausePanel.classList.add("hidden");
}

function showGameOver(text?: string) {
  gameOverPanel.classList.remove("hidden");
  if (text) {
    const subtitle = gameOverPanel.querySelector(".subtitle");
    if (subtitle) subtitle.textContent = text;
  }
}

function hideGameOver() {
  const subtitle = gameOverPanel.querySelector(".subtitle");
  if (subtitle) subtitle.textContent = "Press Esc for menu";
  gameOverPanel.classList.add("hidden");
}

function switchPanel(panel: "newgame" | "settings" | "about") {
  panelNewgame.classList.toggle("active", panel === "newgame");
  panelSettings.classList.toggle("active", panel === "settings");
  panelAbout.classList.toggle("active", panel === "about");
}

function startGame(mode: GameMode) {
  if (!game) initGame();
  hideMenu();
  if (!sceneRef) return;
  sceneRef.resetGame(mode);
  sceneRef.setPaused(false);
  if (settings.music) {
    audio.start();
  }
}

function initGame() {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#04060d",
    scene: [TetrisScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });
  sceneRef = game.scene.getScene("main") as TetrisScene;
  if (sceneRef) {
    sceneRef.setPaused(true);
  } else {
    game.events.once(Phaser.Core.Events.READY, () => {
      sceneRef = game?.scene.getScene("main") as TetrisScene;
      if (sceneRef) sceneRef.setPaused(true);
    });
  }
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = btn.getAttribute("data-panel");
    if (panel === "newgame" || panel === "settings" || panel === "about") {
      switchPanel(panel);
    }
  });
});

document.querySelectorAll(".menu-button[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode") as GameMode;
    if (mode === "marathon" || mode === "sprint") {
      startGame(mode);
    }
  });
});

toggleMusic.addEventListener("change", () => {
  settings.music = toggleMusic.checked;
  if (!settings.music) audio.stop();
});

toggleSfx.addEventListener("change", () => {
  settings.sfx = toggleSfx.checked;
});

window.addEventListener("pointerdown", () => {
  audio.ensureContext();
  if (settings.music) audio.start();
});

showMenu();
