/**
 * Derived character statistics (M1-04).
 *
 * FR-007: final statistics are calculated from base attributes and progression
 * bonuses. In Phase 1 the only progression bonus is level growth (D14); skill
 * tree and equipment contributions attach here later.
 *
 * Hard rule 5: derived statistics are never stored in GameState. Recalculate on
 * read (the UI does this every frame) — `CharacterState` keeps only progress
 * plus currentHp.
 *
 * No Math.random(), Date.now(), localStorage, or DOM access here.
 */
import type { CharacterStatsData } from '../data/character.js';
import { clamp, mul, pow, sub } from './num.js';
import type { GameConfig, GameState } from './types.js';

export interface DerivedStats {
  readonly maxHp: number;
  readonly attack: number;
  readonly attackRate: number;
  readonly critChance: number;
  readonly critDamage: number;
}

/** A critical hit is never weaker than a normal one. */
const MIN_CRIT_DAMAGE = 1;
/** Critical chance saturates rather than exceeding certainty. */
const MAX_CRIT_CHANCE = 1;

/** Coerce a level into a whole number >= 1 (structural, not game arithmetic). */
function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    throw new RangeError(`stats: level must be finite, received ${level}`);
  }
  return Math.max(1, Math.floor(level));
}

/**
 * Derived statistics for a given character level: `base * growth^(level - 1)`.
 *
 * Levels below 1 are treated as level 1. Critical chance is clamped to
 * certainty and critical damage to at least 1× so long play cannot produce
 * degenerate values.
 */
export function deriveStatsForLevel(
  level: number,
  characterStatsData: CharacterStatsData,
): DerivedStats {
  const levelsGained = sub(normalizeLevel(level), 1);
  const { base, growthPerLevel } = characterStatsData;

  return {
    maxHp: mul(base.maxHp, pow(growthPerLevel.maxHp, levelsGained)),
    attack: mul(base.attack, pow(growthPerLevel.attack, levelsGained)),
    attackRate: mul(base.attackRate, pow(growthPerLevel.attackRate, levelsGained)),
    critChance: clamp(
      mul(base.critChance, pow(growthPerLevel.critChance, levelsGained)),
      0,
      MAX_CRIT_CHANCE,
    ),
    critDamage: clamp(
      mul(base.critDamage, pow(growthPerLevel.critDamage, levelsGained)),
      MIN_CRIT_DAMAGE,
      Number.POSITIVE_INFINITY,
    ),
  };
}

/** Derived statistics for a state's character. Recalculated, never saved. */
export function deriveStats(state: GameState, config: GameConfig): DerivedStats {
  return deriveStatsForLevel(state.character.level, config.character);
}
