export interface MenuLayout {
  width: number;
  height: number;
  compact: boolean;
  titleY: number;
  titleSize: number;
  menuX: number;
  menuY: number;
  menuWidth: number;
  menuHeight: number;
  menuButtonWidth: number;
  controlsX: number;
  controlsY: number;
  controlsWidth: number;
  controlsHeight: number;
  panelPadding: number;
}

export interface GameLayout {
  width: number;
  height: number;
  compact: boolean;
  tileSize: number;
  boardWidth: number;
  boardHeight: number;
  boardX: number;
  boardY: number;
  sidebarX: number;
  sidebarY: number;
  sidebarWidth: number;
  sidebarHeight: number;
  previewTileSize: number;
  previewX: number;
  previewY: number;
  hudGap: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeMenuLayout(width: number, height: number): MenuLayout {
  const compact = width < 980 || height < 720;
  const panelPadding = compact ? 16 : 24;
  const titleY = compact ? Math.max(48, height * 0.09) : Math.max(68, height * 0.12);
  const titleSize = compact ? 26 : 34;
  const menuWidth = compact ? Math.min(width - 32, 420) : 420;
  const menuHeight = compact ? 286 : 314;
  const menuButtonWidth = Math.min(menuWidth, compact ? width - 40 : 360);
  const menuX = width / 2 - menuWidth / 2;
  const menuY = compact ? height * 0.34 : height * 0.34;
  const controlsWidth = compact ? Math.min(width - 32, 520) : 360;
  const controlsHeight = compact ? 160 : 240;
  const controlsX = compact ? width / 2 - controlsWidth / 2 : width - controlsWidth - 32;
  const controlsY = compact ? height - controlsHeight - 24 : Math.max(42, height * 0.26);

  return {
    width,
    height,
    compact,
    titleY,
    titleSize,
    menuX,
    menuY,
    menuWidth,
    menuHeight,
    menuButtonWidth,
    controlsX,
    controlsY,
    controlsWidth,
    controlsHeight,
    panelPadding,
  };
}

export function computeGameLayout(width: number, height: number): GameLayout {
  const compact = width < 1024 || height < 760;
  const safeWidth = Math.max(320, width);
  const safeHeight = Math.max(540, height);
  const maxTileWidth = compact ? 28 : 34;
  const tileSize = clamp(
    Math.floor(Math.min((safeWidth * (compact ? 0.46 : 0.36)) / 10, (safeHeight * 0.78) / 20)),
    18,
    maxTileWidth,
  );
  const boardWidth = tileSize * 10;
  const boardHeight = tileSize * 20;
  const boardX = compact ? Math.round((width - boardWidth) / 2) : 48;
  const boardY = compact ? Math.round(Math.max(30, height * 0.08)) : Math.round((height - boardHeight) / 2);
  const sidebarWidth = compact ? Math.min(width - 32, 420) : Math.max(250, width - boardX - boardWidth - 88);
  const sidebarX = compact ? Math.round((width - sidebarWidth) / 2) : boardX + boardWidth + 32;
  const sidebarY = compact ? boardY + boardHeight + 28 : Math.max(40, boardY);
  const sidebarHeight = compact ? Math.max(200, height - sidebarY - 28) : boardHeight;
  const previewTileSize = Math.max(12, Math.floor(tileSize * 0.52));
  const previewX = sidebarX + 22;
  const previewY = sidebarY + 164;
  const hudGap = compact ? 14 : 18;

  return {
    width,
    height,
    compact,
    tileSize,
    boardWidth,
    boardHeight,
    boardX,
    boardY,
    sidebarX,
    sidebarY,
    sidebarWidth,
    sidebarHeight,
    previewTileSize,
    previewX,
    previewY,
    hudGap,
  };
}
