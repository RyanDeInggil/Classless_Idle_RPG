/**
 * Character combat data.
 *
 * Base statistics at level 1 and a per-level growth factor for each statistic,
 * validated with Zod at load (hard rule 4).
 *
 * Growth model (D14): `stat(level) = base * growthPerLevel^(level - 1)`.
 * Derived statistics are computed from this data by `core/stats.ts` and are
 * never saved (hard rule 5, FR-100). Numbers are starting points — M1-15 tunes
 * them so a new player clears the boss in roughly 10–15 minutes.
 *
 * Note: growth is multiplicative, so a factor of 1 means "this statistic does
 * not grow with level".
 */
import { z } from 'zod';

const baseStatsSchema = z.object({
  /** Maximum health. */
  maxHp: z.number().positive(),
  /** Damage per hit, before criticals. */
  attack: z.number().positive(),
  /** Attacks per second. */
  attackRate: z.number().positive(),
  /** Critical hit probability, 0–1. */
  critChance: z.number().min(0).max(1),
  /** Critical hit damage multiplier, >= 1. */
  critDamage: z.number().min(1),
});

/**
 * Per-level multipliers. Each value is a factor, not a statistic, so the
 * probability and multiplier bounds of `baseStatsSchema` do not apply: a factor
 * of 1 means "unchanged" and a critical-chance factor above 1 is normal. The
 * derived critical chance is clamped to certainty by `core/stats.ts`.
 */
const growthRatesSchema = z.object({
  maxHp: z.number().positive(),
  attack: z.number().positive(),
  attackRate: z.number().positive(),
  critChance: z.number().positive(),
  critDamage: z.number().positive(),
});

export const characterStatsSchema = z.object({
  /** Statistics at level 1. */
  base: baseStatsSchema,
  /** Per-level multipliers applied to `base`. */
  growthPerLevel: growthRatesSchema,
  /** Level at which a new character starts. */
  startingLevel: z.number().int().positive(),
});

export type BaseStats = z.infer<typeof baseStatsSchema>;
export type GrowthRates = z.infer<typeof growthRatesSchema>;
export type CharacterStatsData = z.infer<typeof characterStatsSchema>;

export const characterStats: CharacterStatsData = characterStatsSchema.parse({
  base: {
    maxHp: 100,
    attack: 10,
    attackRate: 1,
    critChance: 0.05,
    critDamage: 1.5,
  },
  growthPerLevel: {
    maxHp: 1.08,
    attack: 1.07,
    attackRate: 1.02,
    critChance: 1.04,
    critDamage: 1.01,
  },
  startingLevel: 1,
});
