import { SCORE_TABLE, LEVEL_SPEEDS } from '../config';

export class Score {
  score: number;
  level: number;
  lines: number;

  constructor(startLevel = 0) {
    this.score = 0;
    this.level = startLevel;
    this.lines = 0;
  }

  addLines(count: number): void {
    if (count === 0) return;
    this.lines += count;
    this.score += SCORE_TABLE[count]! * (this.level + 1);
    const newLevel = Math.floor(this.lines / 10) + (this.level > 0 ? 0 : Math.floor(this.lines / 10));
    this.level = Math.min(newLevel, LEVEL_SPEEDS.length - 1);
  }

  getSpeed(): number {
    return LEVEL_SPEEDS[Math.min(this.level, LEVEL_SPEEDS.length - 1)]!;
  }

  reset(startLevel = 0): void {
    this.score = 0;
    this.level = startLevel;
    this.lines = 0;
  }
}
