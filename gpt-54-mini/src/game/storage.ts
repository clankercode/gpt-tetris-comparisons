const STORAGE_KEY = "retro-tetris-cabinet.profile.v1";

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface VisualSettings {
  scanlines: number;
  reducedMotion: boolean;
  screenShake: boolean;
}

export interface GameplaySettings {
  startingLevel: number;
}

export interface AppProfile {
  highScore: number;
  audio: AudioSettings;
  visuals: VisualSettings;
  gameplay: GameplaySettings;
}

export const DEFAULT_PROFILE: AppProfile = {
  highScore: 0,
  audio: {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.7,
    sfxVolume: 0.9,
  },
  visuals: {
    scanlines: 0.22,
    reducedMotion: false,
    screenShake: true,
  },
  gameplay: {
    startingLevel: 0,
  },
};

function cloneProfile(profile: AppProfile): AppProfile {
  return {
    highScore: profile.highScore,
    audio: { ...profile.audio },
    visuals: { ...profile.visuals },
    gameplay: { ...profile.gameplay },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeProfile(profile: Partial<AppProfile> | null | undefined): AppProfile {
  const base = cloneProfile(DEFAULT_PROFILE);

  if (!profile) {
    return base;
  }

  if (typeof profile.highScore === "number" && Number.isFinite(profile.highScore)) {
    base.highScore = Math.max(0, Math.floor(profile.highScore));
  }

  if (profile.audio) {
    base.audio.musicEnabled = Boolean(profile.audio.musicEnabled ?? base.audio.musicEnabled);
    base.audio.sfxEnabled = Boolean(profile.audio.sfxEnabled ?? base.audio.sfxEnabled);
    base.audio.musicVolume = clamp(
      Number(profile.audio.musicVolume ?? base.audio.musicVolume),
      0,
      1,
    );
    base.audio.sfxVolume = clamp(Number(profile.audio.sfxVolume ?? base.audio.sfxVolume), 0, 1);
  }

  if (profile.visuals) {
    base.visuals.scanlines = clamp(Number(profile.visuals.scanlines ?? base.visuals.scanlines), 0, 1);
    base.visuals.reducedMotion = Boolean(profile.visuals.reducedMotion ?? base.visuals.reducedMotion);
    base.visuals.screenShake = Boolean(profile.visuals.screenShake ?? base.visuals.screenShake);
  }

  if (profile.gameplay) {
    base.gameplay.startingLevel = clamp(
      Math.floor(Number(profile.gameplay.startingLevel ?? base.gameplay.startingLevel)),
      0,
      29,
    );
  }

  return base;
}

export function loadProfile(): AppProfile {
  if (typeof localStorage === "undefined") {
    return normalizeProfile(null);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return normalizeProfile(null);
    }

    return normalizeProfile(JSON.parse(raw) as Partial<AppProfile>);
  } catch {
    return normalizeProfile(null);
  }
}

export function saveProfile(profile: AppProfile): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

