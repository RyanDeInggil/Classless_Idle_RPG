/**
 * Level progression curve and rewards data (M1-05).
 *
 * Configurable parameters for character experience thresholds and
 * skill points granted per level-up. Validated with Zod at load (hard rule 4).
 *
 * Formula (D12):
 *   xpToNext(level) = round(baseXp * growthFactor^(level - 1))
 *
 * Tunable in data; M1-15 balance pass will tune progression.
 */
import { z } from 'zod';

export const levelCurveConfigSchema = z.object({
  /** Base XP required to advance from level 1 to level 2. */
  baseXp: z.number().positive(),
  /** Multiplicative growth factor applied per level beyond level 1. */
  growthFactor: z.number().min(1),
  /** Skill points granted per level-up. Granted and stored, unspent until Phase 2 (D12). */
  skillPointsPerLevel: z.number().int().nonnegative(),
  /** Optional maximum level cap. Unbounded if omitted. */
  maxLevel: z.number().int().positive().optional(),
});

export type LevelCurveConfig = z.infer<typeof levelCurveConfigSchema>;

export const levelCurve: LevelCurveConfig = levelCurveConfigSchema.parse({
  baseXp: 50,
  growthFactor: 1.35,
  skillPointsPerLevel: 1,
});
