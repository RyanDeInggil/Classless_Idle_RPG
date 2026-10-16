/**
 * src/core — Pure game logic.
 *
 * Hard rules (CLAUDE.md):
 * - NO imports from ui/, persistence/, DOM, window, localStorage, or Date.now.
 * - advance(state, seconds) → state  and  dispatch(state, action) → state.
 * - Never mutate input state.
 * - Randomness from seeded PRNG only (no Math.random()).
 */

export * from './num.js';
export * from './rng.js';
export * from './types.js';
export { createInitialState, advance, dispatch, STEP_MS, MAX_STEPS } from './engine.js';
export { deriveStats, deriveStatsForLevel } from './stats.js';
export type { DerivedStats } from './stats.js';
export { awardXp, awardCharacterXp, xpToNextLevel } from './level.js';
export {
  stepCombat,
  startCombat,
  spawnWaveEnemies,
  onPlayerDefeated,
  onBossPending,
  applyEffect,
  tickEffects,
  isStunned,
} from './combat/index.js';

