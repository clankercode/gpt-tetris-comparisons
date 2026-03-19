export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  showGhost: boolean;
}

export const defaultGameSettings: GameSettings = {
  musicVolume: 0.45,
  sfxVolume: 0.65,
  showGhost: true
};
