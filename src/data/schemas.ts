/**
 * Content Zod schemas, validation, and loader (M1-06).
 *
 * Requirements:
 * - Content is data. Adding content must not require core logic changes.
 * - Schemas and loader live in src/data/. Types inferred via z.infer.
 * - Strict schema validation + comprehensive cross-reference validation.
 * - Collects ALL cross-reference errors into a single ContentValidationError.
 *
 * No Math.random(), Date.now(), or DOM access here.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. Effect Definition Schemas
// ---------------------------------------------------------------------------

const baseEffectDef = {
  id: z.string().min(1),
  name: z.string().min(1),
  duration: z.number().positive(),
  stacking: z.enum(['refresh', 'stack', 'ignore']).default('refresh'),
  maxStacks: z.number().int().positive().default(3),
};

export const damageOverTimeEffectDefSchema = z
  .object({
    ...baseEffectDef,
    kind: z.literal('damageOverTime'),
    tickInterval: z.number().positive(),
    damagePerTick: z.number().nonnegative(),
  })
  .strict();

export const stunEffectDefSchema = z
  .object({
    ...baseEffectDef,
    kind: z.literal('stun'),
  })
  .strict();

export const effectDefSchema = z.discriminatedUnion('kind', [
  damageOverTimeEffectDefSchema,
  stunEffectDefSchema,
]);

// ---------------------------------------------------------------------------
// 2. Enemy Definition Schema
// ---------------------------------------------------------------------------

export const enemyDefSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    maxHp: z.number().positive(),
    damage: z.number().nonnegative(),
    attackInterval: z.number().positive(),
    xpReward: z.number().nonnegative(),
    isBoss: z.boolean().default(false),
    onHitEffects: z.array(z.string().min(1)).default([]),
  })
  .strict();

// ---------------------------------------------------------------------------
// 3. Wave Definition Schema
// ---------------------------------------------------------------------------

export const waveEnemySchema = z
  .object({
    enemyId: z.string().min(1),
    count: z.number().int().positive(),
  })
  .strict();

export const waveDefSchema = z
  .object({
    id: z.string().min(1),
    enemies: z.array(waveEnemySchema).min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// 4. Stage Definition Schema
// ---------------------------------------------------------------------------

export const stageDefSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    waves: z.array(z.string().min(1)).min(1),
    boss: z.string().min(1),
    bossXpBonus: z.number().nonnegative(),
    unlocksStageId: z.string().min(1).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// 5. Raw Content Schema & Inferred Types
// ---------------------------------------------------------------------------

export const rawContentSchema = z
  .object({
    effects: z.array(effectDefSchema),
    enemies: z.array(enemyDefSchema),
    waves: z.array(waveDefSchema),
    stages: z.array(stageDefSchema),
    playerBaseOnHitEffects: z.array(z.string().min(1)).default(['burn']),
    startingStageId: z.string().min(1).default('stage-1'),
  })
  .strict();

export const contentSchema = rawContentSchema;

export type DamageOverTimeEffectDef = z.infer<typeof damageOverTimeEffectDefSchema>;
export type StunEffectDef = z.infer<typeof stunEffectDefSchema>;
export type EffectDef = z.infer<typeof effectDefSchema>;
export type EnemyDef = z.infer<typeof enemyDefSchema>;
export type WaveEnemy = z.infer<typeof waveEnemySchema>;
export type WaveDef = z.infer<typeof waveDefSchema>;
export type StageDef = z.infer<typeof stageDefSchema>;
export type RawContent = z.infer<typeof rawContentSchema>;

// ---------------------------------------------------------------------------
// 6. Validated Content Container
// ---------------------------------------------------------------------------

export interface Content {
  readonly effects: ReadonlyMap<string, EffectDef>;
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  readonly waves: ReadonlyMap<string, WaveDef>;
  readonly stages: ReadonlyMap<string, StageDef>;
  readonly playerBaseOnHitEffects: readonly string[];
  readonly startingStageId: string;
  readonly raw: RawContent;
}

// ---------------------------------------------------------------------------
// 7. Validation Error & Loader
// ---------------------------------------------------------------------------

export class ContentValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(
      `Content validation failed with ${errors.length} error(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
    this.name = 'ContentValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ContentValidationError.prototype);
  }
}

function collectDuplicates<T extends { id: string }>(
  items: readonly T[],
  collectionName: string,
  errors: string[],
): Map<string, T> {
  const map = new Map<string, T>();
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`Duplicate ${collectionName} id: '${item.id}'`);
    } else {
      seen.add(item.id);
      map.set(item.id, item);
    }
  }
  return map;
}

/**
 * Validates raw content against Zod schemas and performs comprehensive
 * cross-reference validation across all entities.
 *
 * Throws ContentValidationError listing all issues if validation fails.
 */
export function loadContent(raw: unknown): Content {
  const parsed = rawContentSchema.parse(raw);
  const errors: string[] = [];

  // 1. Check duplicate ids within each collection
  const effects = collectDuplicates(parsed.effects, 'effect', errors);
  const enemies = collectDuplicates(parsed.enemies, 'enemy', errors);
  const waves = collectDuplicates(parsed.waves, 'wave', errors);
  const stages = collectDuplicates(parsed.stages, 'stage', errors);

  // 2. Enemy onHitEffects referencing a missing effect
  for (const enemy of parsed.enemies) {
    for (const effectId of enemy.onHitEffects) {
      if (!effects.has(effectId)) {
        errors.push(`Enemy '${enemy.id}' onHitEffects references nonexistent effect '${effectId}'`);
      }
    }
  }

  // 2b. Player base onHitEffects referencing a missing effect
  for (const effectId of parsed.playerBaseOnHitEffects) {
    if (!effects.has(effectId)) {
      errors.push(`playerBaseOnHitEffects references nonexistent effect '${effectId}'`);
    }
  }

  // 3. Wave enemies referencing a missing enemy
  // 4. Boss enemy (isBoss: true) appearing inside a regular wave
  for (const wave of parsed.waves) {
    for (const enemyRef of wave.enemies) {
      const enemy = enemies.get(enemyRef.enemyId);
      if (!enemy) {
        errors.push(`Wave '${wave.id}' references nonexistent enemy '${enemyRef.enemyId}'`);
      } else if (enemy.isBoss) {
        errors.push(
          `Wave '${wave.id}' contains boss enemy '${enemyRef.enemyId}' (bosses cannot appear in regular waves)`,
        );
      }
    }
  }

  // 5. Stage waves referencing a missing wave
  // 6. Stage boss referencing a missing enemy or non-boss enemy
  // 7. Stage unlocksStageId referencing a missing stage
  for (const stage of parsed.stages) {
    for (const waveId of stage.waves) {
      if (!waves.has(waveId)) {
        errors.push(`Stage '${stage.id}' waves references nonexistent wave '${waveId}'`);
      }
    }

    const bossEnemy = enemies.get(stage.boss);
    if (!bossEnemy) {
      errors.push(`Stage '${stage.id}' boss references nonexistent enemy '${stage.boss}'`);
    } else if (!bossEnemy.isBoss) {
      errors.push(`Stage '${stage.id}' boss references non-boss enemy '${stage.boss}' (isBoss must be true)`);
    }

    if (stage.unlocksStageId !== undefined && !stages.has(stage.unlocksStageId)) {
      errors.push(`Stage '${stage.id}' unlocksStageId points to nonexistent stage '${stage.unlocksStageId}'`);
    }
  }

  // 8. Validate startingStageId exists in stages
  if (!stages.has(parsed.startingStageId)) {
    errors.push(`startingStageId points to nonexistent stage '${parsed.startingStageId}'`);
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }

  return {
    effects,
    enemies,
    waves,
    stages,
    playerBaseOnHitEffects: parsed.playerBaseOnHitEffects,
    startingStageId: parsed.startingStageId,
    raw: parsed,
  };
}
