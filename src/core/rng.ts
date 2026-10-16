/**
 * Seeded PRNG (mulberry32) with serializable state.
 *
 * Hard rules:
 * - Never call Math.random() anywhere in src/core.
 * - All functions are pure — they return [value, newState] tuples.
 * - RngState must be storable in GameState and round-trippable through save/load.
 */

export interface RngState {
  readonly seed: number; // 32-bit unsigned integer
}

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0 }; // ensure unsigned 32-bit
}

/**
 * Advance the PRNG by one step.
 * Returns [float in [0, 1), nextRngState].
 * Based on mulberry32 by Tommy Ettinger.
 */
export function nextFloat(rng: RngState): readonly [number, RngState] {
  const a = (rng.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, { seed: a >>> 0 }] as const;
}

/**
 * Random integer in [min, max] inclusive.
 */
export function nextInt(
  rng: RngState,
  min: number,
  max: number,
): readonly [number, RngState] {
  const [f, next] = nextFloat(rng);
  return [Math.floor(f * (max - min + 1)) + min, next] as const;
}

/**
 * Random boolean with given probability (0–1).
 */
export function nextBool(
  rng: RngState,
  probability: number,
): readonly [boolean, RngState] {
  const [f, next] = nextFloat(rng);
  return [f < probability, next] as const;
}
