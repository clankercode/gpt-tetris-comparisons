// Tetris logic and models
export type Grid = number[][];
export const ROWS = 22; // 2 hidden
export const COLS = 10;

export const SHAPES = [
    [], // 0 = empty
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I (1)
    [[2,0,0],[2,2,2],[0,0,0]], // J (2)
    [[0,0,3],[3,3,3],[0,0,0]], // L (3)
    [[4,4],[4,4]], // O (4)
    [[0,5,5],[5,5,0],[0,0,0]], // S (5)
    [[0,6,0],[6,6,6],[0,0,0]], // T (6)
    [[7,7,0],[0,7,7],[0,0,0]]  // Z (7)
];

export const COLORS = [
    0x000000, 
    0x00ffff, // I Cyan
    0x0000ff, // J Blue
    0xffa500, // L Orange
    0xffff00, // O Yellow
    0x00ff00, // S Green
    0x800080, // T Purple
    0xff0000  // Z Red
];

// Helper to create empty grid
export function createGrid(rows: number, cols: number): Grid {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}

// 7-bag randomizer
export class Bag {
    private pieces: number[] = [];

    constructor() {
        this.fill();
    }

    fill() {
        this.pieces = [1, 2, 3, 4, 5, 6, 7];
        for (let i = this.pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
        }
    }

    next(): number {
        if (this.pieces.length === 0) this.fill();
        return this.pieces.pop()!;
    }
}

export class Piece {
    shape: number[][];
    color: number;
    type: number;
    x: number;
    y: number;

    constructor(type: number) {
        this.type = type;
        this.shape = SHAPES[type].map(row => [...row]);
        this.color = COLORS[type];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0; // Starts in hidden rows
    }

    rotate(dir: 1 | -1) {
        // Rotate 90 deg clockwise (1) or counter (-1)
        const N = this.shape.length;
        const newShape = createGrid(N, N);
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (dir === 1) {
                    newShape[c][N - 1 - r] = this.shape[r][c];
                } else {
                    newShape[N - 1 - c][r] = this.shape[r][c];
                }
            }
        }
        this.shape = newShape;
    }
}

export function checkCollision(grid: Grid, piece: Piece, xOffset = 0, yOffset = 0): boolean {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                const newX = piece.x + c + xOffset;
                const newY = piece.y + r + yOffset;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true; // Wall or floor collision
                }
                if (newY >= 0 && grid[newY][newX] !== 0) {
                    return true; // Block collision
                }
            }
        }
    }
    return false;
}

export function mergePiece(grid: Grid, piece: Piece) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                const y = piece.y + r;
                if (y >= 0) {
                    grid[y][piece.x + c] = piece.type;
                }
            }
        }
    }
}
