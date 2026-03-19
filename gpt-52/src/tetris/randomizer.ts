import type { TetrominoType } from "./types";

export class Randomizer7Bag {
  private bag: TetrominoType[] = [];

  next(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  private refill() {
    const next: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
    // Fisher-Yates
    for (let i = next.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
    }
    this.bag = next;
  }
}

