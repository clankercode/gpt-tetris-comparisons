import Phaser from "phaser";
import { COLORS, PIECE_COLORS, shade } from "./theme";
import type { PieceKind } from "./types";

export function drawBoardCell(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  kind: PieceKind,
  alpha = 1,
): void {
  const color = PIECE_COLORS[kind];
  const base = shade(color, 0.38);
  const inner = shade(color, 0.82);

  graphics.fillStyle(base, alpha * 0.9);
  graphics.fillRoundedRect(x + 1, y + 1, size - 2, size - 2, Math.max(3, size * 0.18));
  graphics.fillStyle(inner, alpha);
  graphics.fillRoundedRect(x + 2, y + 2, size - 4, size - 4, Math.max(2, size * 0.14));
  graphics.lineStyle(1, COLORS.text, alpha * 0.12);
  graphics.strokeRoundedRect(x + 0.5, y + 0.5, size - 1, size - 1, Math.max(3, size * 0.18));
}

export function drawPanelGrid(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  cellSize: number,
  columns: number,
  rows: number,
  color: number = COLORS.grid,
  alpha = 0.35,
): void {
  graphics.lineStyle(1, color, alpha);
  for (let column = 0; column <= columns; column += 1) {
    const lineX = x + Math.round(column * cellSize);
    graphics.lineBetween(lineX, y, lineX, y + height);
  }

  for (let row = 0; row <= rows; row += 1) {
    const lineY = y + Math.round(row * cellSize);
    graphics.lineBetween(x, lineY, x + width, lineY);
  }
}

export function drawFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  edge: number = COLORS.panelEdge,
  fill: number = COLORS.panel,
): void {
  graphics.fillStyle(fill, 0.92);
  graphics.fillRoundedRect(x, y, width, height, 18);
  graphics.lineStyle(2, edge, 0.55);
  graphics.strokeRoundedRect(x, y, width, height, 18);
  graphics.lineStyle(1, COLORS.text, 0.12);
  graphics.strokeRoundedRect(x + 6, y + 6, width - 12, height - 12, 14);
}
