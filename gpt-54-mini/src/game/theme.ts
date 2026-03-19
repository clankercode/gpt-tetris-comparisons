import type { PieceKind } from "./types";

export const FONT = {
  heading: '"Press Start 2P", "IBM Plex Mono", "Courier New", monospace',
  body: '"IBM Plex Mono", "Courier New", monospace',
} as const;

export const COLORS = {
  background: 0x05060a,
  backdrop: 0x0a1020,
  panel: 0x09111f,
  panelAlt: 0x0d1a2c,
  panelEdge: 0x63ffd8,
  panelEdgeDim: 0x2cf0c8,
  text: 0xedfff7,
  muted: 0x93ada7,
  danger: 0xff6688,
  warning: 0xffcb6f,
  grid: 0x12314d,
  shadow: 0x02040a,
  glow: 0x8ef5ff,
} as const;

export const PIECE_COLORS: Record<PieceKind, number> = {
  I: 0x63ffd8,
  J: 0x6d7dff,
  L: 0xffaa56,
  O: 0xffd84d,
  S: 0x70ff9a,
  T: 0xcf7dff,
  Z: 0xff6d7e,
};

export function hexToCssColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export function shade(hex: number, amount: number): number {
  const r = ((hex >> 16) & 0xff) * amount;
  const g = ((hex >> 8) & 0xff) * amount;
  const b = (hex & 0xff) * amount;
  return ((Math.max(0, Math.min(255, Math.round(r))) << 16) |
    (Math.max(0, Math.min(255, Math.round(g))) << 8) |
    Math.max(0, Math.min(255, Math.round(b)))) >>> 0;
}

