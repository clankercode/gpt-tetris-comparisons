import Phaser from 'phaser';
import { audioSynth } from './synth';
import { type Grid, ROWS, COLS, createGrid, Bag, Piece, checkCollision, mergePiece, COLORS } from './tetris';

const BLOCK_SIZE = 24;

class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        // Generate block texture
        const graphics = this.make.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        graphics.lineStyle(2, 0x000000, 0.5);
        graphics.strokeRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        
        graphics.lineStyle(2, 0xffffff, 0.8);
        graphics.beginPath();
        graphics.moveTo(0, BLOCK_SIZE); graphics.lineTo(0, 0); graphics.lineTo(BLOCK_SIZE, 0);
        graphics.strokePath();
        
        graphics.generateTexture('block', BLOCK_SIZE, BLOCK_SIZE);
    }
    create() {
        this.scene.start('MainMenu');
    }
}

class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }
    create() {
        const { width, height } = this.cameras.main;

        this.add.text(width / 2, height * 0.2, 'RETRO TETRIS', {
            fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#00ff00',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const options = ['New Game', 'Settings', 'About'];
        let selected = 0;

        const menuTexts = options.map((opt, i) => {
            return this.add.text(width / 2, height * 0.4 + i * 40, opt, {
                fontFamily: '"Press Start 2P"', fontSize: '16px', color: i === 0 ? '#ffff00' : '#ffffff'
            }).setOrigin(0.5);
        });

        this.add.text(width / 2, height * 0.8, 
            'CONTROLS:\nArrows: Move/Drop\nUp: Rotate\nSpace: Hard Drop\nC: Hold', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#888888', align: 'center'
        }).setOrigin(0.5);

        this.input.keyboard!.on('keydown-UP', () => {
            audioSynth.playMove();
            menuTexts[selected].setColor('#ffffff');
            selected = (selected - 1 + options.length) % options.length;
            menuTexts[selected].setColor('#ffff00');
        });

        this.input.keyboard!.on('keydown-DOWN', () => {
            audioSynth.playMove();
            menuTexts[selected].setColor('#ffffff');
            selected = (selected + 1) % options.length;
            menuTexts[selected].setColor('#ffff00');
        });

        this.input.keyboard!.on('keydown-ENTER', () => {
            audioSynth.playClear();
            if (selected === 0) this.scene.start('Game');
            else if (selected === 1) this.scene.start('Settings');
            else if (selected === 2) this.scene.start('About');
        });
        
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.2);
        for (let i = 0; i < height; i += 4) {
            graphics.fillRect(0, i, width, 2);
        }
    }
}

class Settings extends Phaser.Scene {
    constructor() { super('Settings'); }
    create() {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2, 'Volume: Use system\nPress ENTER to return', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', align: 'center'
        }).setOrigin(0.5);
        this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('MainMenu'));
    }
}

class About extends Phaser.Scene {
    constructor() { super('About'); }
    create() {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2, 'Built with Bun,\nVite, TS & Phaser\nPress ENTER to return', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', align: 'center'
        }).setOrigin(0.5);
        this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('MainMenu'));
    }
}

class GameScene extends Phaser.Scene {
    grid!: Grid; bag!: Bag; currentPiece!: Piece; nextPieces!: number[];
    holdPieceType: number | null = null; canHold: boolean = true;
    score: number = 0; level: number = 1; lines: number = 0;
    boardOffsetX = 100; boardOffsetY = 20;

    dropTimer!: Phaser.Time.TimerEvent;
    
    scoreText!: Phaser.GameObjects.Text; levelText!: Phaser.GameObjects.Text; linesText!: Phaser.GameObjects.Text;
    gameOverText!: Phaser.GameObjects.Text;
    blocksGroup!: Phaser.GameObjects.Group;
    activeKeys: Set<string> = new Set();
    repeatTimers: Map<string, Phaser.Time.TimerEvent> = new Map();

    constructor() { super('Game'); }

    create() {
        audioSynth.playBGM();
        this.grid = createGrid(ROWS, COLS);
        this.bag = new Bag();
        this.nextPieces = [this.bag.next(), this.bag.next(), this.bag.next()];
        this.score = 0; this.level = 1; this.lines = 0; this.canHold = true; this.holdPieceType = null;
        
        this.gameOverText = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2, 'GAME OVER\nPress R to Restart', { fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ff0000', align: 'center' }).setOrigin(0.5).setVisible(false).setDepth(100);

        this.add.text(10, 20, 'HOLD', { fontFamily: '"Press Start 2P"', fontSize: '12px' });
        this.add.text(this.boardOffsetX + COLS * BLOCK_SIZE + 20, 20, 'NEXT', { fontFamily: '"Press Start 2P"', fontSize: '12px' });
        this.scoreText = this.add.text(10, 100, 'Score\n0', { fontFamily: '"Press Start 2P"', fontSize: '10px' });
        this.levelText = this.add.text(10, 140, 'Level\n1', { fontFamily: '"Press Start 2P"', fontSize: '10px' });
        this.linesText = this.add.text(10, 180, 'Lines\n0', { fontFamily: '"Press Start 2P"', fontSize: '10px' });

        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffffff);
        graphics.strokeRect(this.boardOffsetX - 1, this.boardOffsetY - 1 + (2 * BLOCK_SIZE), COLS * BLOCK_SIZE + 2, (ROWS - 2) * BLOCK_SIZE + 2);

        this.blocksGroup = this.add.group();

        this.setupInput();
        this.spawnPiece();
        this.setDropTimer();
    }

    setupInput() {
        const bindKey = (key: string, action: () => void, isRepeatable: boolean = false) => {
            this.input.keyboard!.on(`keydown-${key}`, () => {
                if(this.gameOverText.visible) return;
                if (!this.activeKeys.has(key)) {
                    this.activeKeys.add(key);
                    action();
                    if (isRepeatable) {
                        const timer = this.time.addEvent({ delay: 100, callback: action, loop: true, startAt: -150 }); // ARR/DAS logic basic
                        this.repeatTimers.set(key, timer);
                    }
                }
            });
            this.input.keyboard!.on(`keyup-${key}`, () => {
                this.activeKeys.delete(key);
                if (this.repeatTimers.has(key)) {
                    this.repeatTimers.get(key)!.remove();
                    this.repeatTimers.delete(key);
                }
            });
        };

        bindKey('LEFT', () => this.move(-1, 0), true);
        bindKey('RIGHT', () => this.move(1, 0), true);
        bindKey('DOWN', () => this.move(0, 1), true);
        bindKey('UP', () => this.rotate());
        bindKey('SPACE', () => this.hardDrop());
        bindKey('C', () => this.hold());
        
        this.input.keyboard!.on('keydown-R', () => {
            if(this.gameOverText.visible) {
                audioSynth.stopBGM();
                this.scene.restart();
            }
        });
    }

    setDropTimer() {
        if (this.dropTimer) this.dropTimer.remove();
        const speed = Math.max(100, 1000 - (this.level - 1) * 100);
        this.dropTimer = this.time.addEvent({ delay: speed, callback: () => this.move(0, 1, true), loop: true });
    }

    spawnPiece() {
        this.currentPiece = new Piece(this.nextPieces.shift()!);
        this.nextPieces.push(this.bag.next());
        if (checkCollision(this.grid, this.currentPiece)) this.gameOver();
        else this.draw();
    }

    hold() {
        if (!this.canHold) return;
        audioSynth.playMove();
        const temp = this.currentPiece.type;
        if (this.holdPieceType === null) {
            this.holdPieceType = temp;
            this.spawnPiece();
        } else {
            this.currentPiece = new Piece(this.holdPieceType);
            this.holdPieceType = temp;
        }
        this.canHold = false;
        this.draw();
    }

    move(dx: number, dy: number, isAuto = false) {
        if (checkCollision(this.grid, this.currentPiece, dx, dy)) {
            if (dy > 0) this.lockPiece();
        } else {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            if(!isAuto && dx !== 0) audioSynth.playMove();
            this.draw();
        }
    }

    rotate() {
        const oldShape = [...this.currentPiece.shape.map(r => [...r])];
        this.currentPiece.rotate(1);
        if (checkCollision(this.grid, this.currentPiece)) {
            if (!checkCollision(this.grid, this.currentPiece, -1, 0)) this.currentPiece.x -= 1;
            else if (!checkCollision(this.grid, this.currentPiece, 1, 0)) this.currentPiece.x += 1;
            else this.currentPiece.shape = oldShape; // Fail
        } else {
            audioSynth.playRotate();
        }
        this.draw();
    }

    hardDrop() {
        let dy = 0;
        while (!checkCollision(this.grid, this.currentPiece, 0, dy + 1)) dy++;
        this.currentPiece.y += dy;
        audioSynth.playDrop();
        this.cameras.main.shake(100, 0.005);
        this.lockPiece();
    }

    lockPiece() {
        mergePiece(this.grid, this.currentPiece);
        this.clearLines();
        this.canHold = true;
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every(val => val !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                r++;
            }
        }
        if (linesCleared > 0) {
            audioSynth.playClear();
            this.lines += linesCleared;
            this.score += [0, 100, 300, 500, 800][linesCleared] * this.level;
            const nextLevel = Math.floor(this.lines / 10) + 1;
            if (nextLevel > this.level) {
                this.level = nextLevel;
                audioSynth.playLevelUp();
                this.setDropTimer();
            }
            this.scoreText.setText(`Score\n${this.score}`);
            this.levelText.setText(`Level\n${this.level}`);
            this.linesText.setText(`Lines\n${this.lines}`);
        }
    }

    gameOver() {
        this.dropTimer.remove();
        this.repeatTimers.forEach(t => t.remove());
        this.gameOverText.setVisible(true);
        audioSynth.stopBGM();
        audioSynth.playGameOver();
    }

    draw() {
        this.blocksGroup.clear(true, true);

        for (let r = 2; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== 0) this.drawBlock(c, r, COLORS[this.grid[r][c]]);
            }
        }

        let ghostY = this.currentPiece.y;
        while (!checkCollision(this.grid, this.currentPiece, 0, (ghostY - this.currentPiece.y) + 1)) ghostY++;
        for (let r = 0; r < this.currentPiece.shape.length; r++) {
            for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                if (this.currentPiece.shape[r][c] !== 0) {
                    const y = ghostY + r;
                    if (y >= 2) {
                        const block = this.add.image(this.boardOffsetX + (this.currentPiece.x + c) * BLOCK_SIZE, this.boardOffsetY + (y - 2) * BLOCK_SIZE, 'block').setOrigin(0);
                        block.setTint(this.currentPiece.color).setAlpha(0.3);
                        this.blocksGroup.add(block);
                    }
                }
            }
        }

        for (let r = 0; r < this.currentPiece.shape.length; r++) {
            for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
                if (this.currentPiece.shape[r][c] !== 0) {
                    const y = this.currentPiece.y + r;
                    if (y >= 2) this.drawBlock(this.currentPiece.x + c, y, this.currentPiece.color);
                }
            }
        }
        
        if (this.holdPieceType !== null) this.drawMiniPiece(this.holdPieceType, 10, 40);
        for (let i = 0; i < this.nextPieces.length; i++) this.drawMiniPiece(this.nextPieces[i], this.boardOffsetX + COLS * BLOCK_SIZE + 20, 40 + i * 50);
    }

    drawBlock(c: number, r: number, color: number) {
        const block = this.add.image(this.boardOffsetX + c * BLOCK_SIZE, this.boardOffsetY + (r - 2) * BLOCK_SIZE, 'block').setOrigin(0);
        block.setTint(color);
        this.blocksGroup.add(block);
    }
    
    drawMiniPiece(type: number, x: number, y: number) {
        const temp = new Piece(type);
        for(let r=0; r<temp.shape.length; r++) {
            for(let c=0; c<temp.shape[r].length; c++) {
                if(temp.shape[r][c]!==0) {
                    const block = this.add.image(x + c * 12, y + r * 12, 'block').setOrigin(0).setScale(0.5);
                    block.setTint(COLORS[type]);
                    this.blocksGroup.add(block);
                }
            }
        }
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 480,
    height: 520,
    parent: 'game-container',
    pixelArt: true,
    scene: [BootScene, MainMenu, GameScene, Settings, About]
};

new Phaser.Game(config);
