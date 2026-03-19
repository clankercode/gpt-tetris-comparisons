export interface RandomSource {
  next(): number;
}

export function createMulberry32(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    next() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function createSeed(): number {
  const bytes = new Uint32Array(1);

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
    return bytes[0] >>> 0;
  }

  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

export function createDefaultRandomSource(): RandomSource {
  return createMulberry32(createSeed());
}

export function shuffle<T>(values: readonly T[], rng: RandomSource): T[] {
  const next = values.slice();

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

