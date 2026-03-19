export const SceneKeys = {
  Boot: "boot",
  MainMenu: "main-menu",
  NewGameOptions: "new-game-options",
  Settings: "settings",
  About: "about",
  Game: "game",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

