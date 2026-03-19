export type GameMode = "marathon" | "sprint40";

export type SettingsData = {
  crt: boolean;
  ghost: boolean;
  hold: boolean;
  musicOn: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
};

const KEY = "retro_tetris_settings_v1";

export class Settings {
  constructor(public data: SettingsData) {}

  static defaults(): Settings {
    return new Settings({
      crt: true,
      ghost: true,
      hold: true,
      musicOn: true,
      musicVolume: 0.55,
      sfxVolume: 0.7
    });
  }

  static load(): Settings {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Settings.defaults();
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      const d = Settings.defaults().data;
      return new Settings({
        crt: typeof parsed.crt === "boolean" ? parsed.crt : d.crt,
        ghost: typeof parsed.ghost === "boolean" ? parsed.ghost : d.ghost,
        hold: typeof parsed.hold === "boolean" ? parsed.hold : d.hold,
        musicOn: typeof parsed.musicOn === "boolean" ? parsed.musicOn : d.musicOn,
        musicVolume: typeof parsed.musicVolume === "number" ? clamp01(parsed.musicVolume) : d.musicVolume,
        sfxVolume: typeof parsed.sfxVolume === "number" ? clamp01(parsed.sfxVolume) : d.sfxVolume
      });
    } catch {
      return Settings.defaults();
    }
  }

  save() {
    localStorage.setItem(KEY, JSON.stringify(this.data));
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

