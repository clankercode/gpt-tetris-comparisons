import { describe, expect, test } from "bun:test";
import { TetrisGame, gravityForLevel, PIECE_KINDS } from "../src/game/engine";
import { createMulberry32, shuffle } from "../src/game/random";

function makeFilledRow(fill = "Z") {
  return Array.from({ length: 10 }, () => fill);
}

describe("engine helpers", () => {
  test("7-bag shuffle preserves the seven piece kinds", () => {
    const rng = createMulberry32(123456);
    const bag = shuffle(PIECE_KINDS, rng);

    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
    expect([...bag].sort()).toEqual([...PIECE_KINDS].sort());
  });

  test("gravity speeds up as the level rises", () => {
    expect(gravityForLevel(0)).toBeGreaterThan(gravityForLevel(8));
    expect(gravityForLevel(8)).toBeGreaterThan(gravityForLevel(15));
  });
});

describe("TetrisGame", () => {
  test("clears a line and awards classic scoring", () => {
    const game = new TetrisGame({ startLevel: 0, seed: 7 });
    game.state.board[19] = makeFilledRow("Z");
    for (let column = 6; column < 10; column += 1) {
      game.state.board[19][column] = null;
    }
    game.state.activePiece = {
      kind: "I",
      rotation: 0,
      x: 6,
      y: 18,
    };

    const lock = game.softDrop();
    expect(lock.events.some((event) => event.type === "clear-start")).toBe(true);

    const finish = game.tick(190);
    expect(finish.events.some((event) => event.type === "clear-end")).toBe(true);
    expect(game.state.lines).toBe(1);
    expect(game.state.score).toBe(40);
    expect(game.state.board[19].every((cell) => cell === null)).toBe(true);
  });

  test("locks above the top and triggers game over", () => {
    const game = new TetrisGame({ startLevel: 0, seed: 11 });
    game.state.board[0] = makeFilledRow("Z");
    game.state.activePiece = {
      kind: "O",
      rotation: 0,
      x: 3,
      y: -1,
    };

    const result = game.softDrop();
    expect(result.events.some((event) => event.type === "game-over")).toBe(true);
    expect(game.state.gameOver).toBe(true);
  });

  test("rotations fail cleanly when a piece is flush with the wall", () => {
    const game = new TetrisGame({ startLevel: 0, seed: 23 });
    game.state.activePiece = {
      kind: "I",
      rotation: 1,
      x: 7,
      y: 0,
    };

    const result = game.rotate(-1);
    expect(result.changed).toBe(false);
    expect(game.state.activePiece?.rotation).toBe(1);
  });
});

