import type { MusicThemeKey, PaletteKey, PieceType, SettingsState } from "./types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const VISIBLE_NEXT = 5;

export const DEFAULT_SETTINGS: SettingsState = {
  masterVolume: 0.85,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  crtIntensity: 0.7,
  screenShake: true,
};

export const DEFAULT_OPTIONS = {
  startLevel: 1,
  musicTheme: "type_a" as MusicThemeKey,
  palette: "aurora" as PaletteKey,
};

export const PIECE_COLORS: Record<PieceType, number> = {
  I: 0x6df2ff,
  J: 0x7198ff,
  L: 0xffa54b,
  O: 0xffe16b,
  S: 0x75ff8e,
  T: 0xe984ff,
  Z: 0xff6f76,
};

export const PALETTES: Record<
  PaletteKey,
  {
    label: string;
    boardGlow: number;
    panel: number;
    grid: number;
    accent: number;
    accentAlt: number;
    backgroundTop: number;
    backgroundBottom: number;
  }
> = {
  aurora: {
    label: "Aurora Grid",
    boardGlow: 0x57e8ff,
    panel: 0x130c21,
    grid: 0x214456,
    accent: 0xffb85a,
    accentAlt: 0x7dffb1,
    backgroundTop: 0x140520,
    backgroundBottom: 0x040208,
  },
  sunset: {
    label: "Sunset Tape",
    boardGlow: 0xff7f5a,
    panel: 0x251016,
    grid: 0x5c2f2a,
    accent: 0xffdf65,
    accentAlt: 0xff6f9d,
    backgroundTop: 0x220513,
    backgroundBottom: 0x080306,
  },
  mono: {
    label: "Vector Mono",
    boardGlow: 0xbef7db,
    panel: 0x09140e,
    grid: 0x2d5742,
    accent: 0xe3f9a7,
    accentAlt: 0x76ffc5,
    backgroundTop: 0x09140d,
    backgroundBottom: 0x030705,
  },
};

export const MUSIC_THEMES: Record<
  MusicThemeKey,
  {
    label: string;
    bpm: number;
    lead: number[];
    bass: number[];
  }
> = {
  type_a: {
    label: "Type A",
    bpm: 138,
    lead: [64, 71, 69, 67, 66, 67, 69, 64, 60, 60, 62, 64, 62, 60, 59, 57],
    bass: [40, 40, 45, 45, 47, 47, 45, 45, 40, 40, 36, 36, 35, 35, 33, 33],
  },
  laser: {
    label: "Laser Shift",
    bpm: 154,
    lead: [72, 76, 79, 76, 74, 71, 67, 71, 72, 74, 76, 79, 83, 79, 76, 74],
    bass: [36, 36, 38, 38, 41, 41, 43, 43, 31, 31, 33, 33, 36, 36, 38, 38],
  },
  night_drive: {
    label: "Night Drive",
    bpm: 126,
    lead: [67, 71, 74, 76, 74, 71, 67, 64, 62, 64, 67, 71, 69, 67, 64, 62],
    bass: [31, 31, 34, 34, 38, 38, 34, 34, 29, 29, 33, 33, 36, 36, 33, 33],
  },
};

export const MENU_CONTROLS = [
  "Move: Left / Right",
  "Soft Drop: Down",
  "Rotate: Up or X / Z",
  "Hard Drop: Space",
  "Hold: C",
  "Pause / Back: Esc",
  "Select: Enter",
];
