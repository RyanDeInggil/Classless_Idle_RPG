/**
 * Timed Combat Effects System (M1-08).
 *
 * Implements duration, tick intervals, and stacking rules for combat effects:
 * - Burn: damage over time, applied by player on-hit effects
 * - Stun: blocks attacks and freezes attack timers, applied by boss hits
 *
 * Stacking rules per D8:
 * - refresh: reset remaining to full duration, keep stacks at 1, keep current tickTimer
 * - stack: increment stacks up to maxStacks (default 3), refresh remaining duration
 * - ignore: do nothing if the effect is already active
 *
 * Expiry rule:
 * Rule: Decrement remaining time. If a tick lands exactly on the expiry boundary
 * (remaining reaches 0), the final tick is processed before the effect is removed.
 *
 * Hard rules:
 * - Pure functions, no input mutation, no Math.random(), Date.now(), or DOM.
 * - Effect definitions come from validated Content object, never hardcoded.
 */
import { content as defaultContent, type Content, type EffectDef } from '../../data/index.js';
import { add, clamp, mul, round, sub } from '../num.js';
import type { EffectInstance, GameState } from '../types.js';

// ---------------------------------------------------------------------------
// Effect Query Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if any active effect on the combatant is a stun.
 */
export function isStunned(
  effects: readonly EffectInstance[],
  contentInstance: Content = defaultContent,
): boolean {
  for (const inst of effects) {
    const def = contentInstance.effects.get(inst.effectId);
    if (def && def.kind === 'stun') {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Apply Effect
// ---------------------------------------------------------------------------

/**
 * Applies an effect definition to a list of active effect instances following
 * the configured stacking rule (refresh, stack, or ignore).
 * Pure function: returns a new array; never mutates the input.
 */
export function applyEffectToInstances(
  effects: readonly EffectInstance[],
  effectDef: EffectDef,
): readonly EffectInstance[] {
  const existingIndex = effects.findIndex((e) => e.effectId === effectDef.id);
  const durationMs = round(mul(effectDef.duration, 1000));

  if (existingIndex === -1) {
    // New effect application
    const newInstance: EffectInstance = {
      effectId: effectDef.id,
      remainingMs: durationMs,
      tickTimerMs: 0,
      stacks: 1,
    };
    return [...effects, newInstance];
  }

  const existing = effects[existingIndex];
  const stacking = effectDef.stacking ?? 'refresh';

  if (stacking === 'ignore') {
    // Ignore: do nothing if effect is already active
    return effects;
  }

  if (stacking === 'refresh') {
    // Refresh: reset remaining to full duration, keep stacks at 1, keep current tickTimer
    const updated: EffectInstance = {
      ...existing,
      remainingMs: durationMs,
      stacks: 1,
    };
    const nextEffects = [...effects];
    nextEffects[existingIndex] = updated;
    return nextEffects;
  }

  if (stacking === 'stack') {
    // Stack: add one stack up to maxStacks (default 3), and refresh duration
    const maxStacks = effectDef.maxStacks ?? 3;
    const newStacks = clamp(add(existing.stacks, 1), 1, maxStacks);
    const updated: EffectInstance = {
      ...existing,
      remainingMs: durationMs,
      stacks: newStacks,
    };
    const nextEffects = [...effects];
    nextEffects[existingIndex] = updated;
    return nextEffects;
  }

  return effects;
}

/**
 * Polymorphic applyEffect accepting either an array of EffectInstance or an
 * object with an effects property (e.g. EnemyState or Combatant).
 */
export function applyEffect(
  target: readonly EffectInstance[],
  effectDef: EffectDef,
): readonly EffectInstance[];
export function applyEffect<T extends { readonly effects: readonly EffectInstance[] }>(
  target: T,
  effectDef: EffectDef,
): T;
export function applyEffect(
  target: readonly EffectInstance[] | { readonly effects: readonly EffectInstance[] },
  effectDef: EffectDef,
): readonly EffectInstance[] | { readonly effects: readonly EffectInstance[] } {
  if (Array.isArray(target)) {
    return applyEffectToInstances(target, effectDef);
  }
  const obj = target as { readonly effects: readonly EffectInstance[] };
  return {
    ...obj,
    effects: applyEffectToInstances(obj.effects, effectDef),
  };
}

// ---------------------------------------------------------------------------
// Tick Effects
// ---------------------------------------------------------------------------

export interface TickEffectsResult {
  readonly effects: readonly EffectInstance[];
  readonly totalDamage: number;
}

/**
 * Advances active effects by time delta dt (seconds).
 *
 * Rule: Decrement remaining time. If a tick lands exactly on the expiry boundary
 * (remaining reaches 0), the final tick is processed before the effect is removed.
 *
 * Returns the surviving effects and total damage-over-time dealt during this step.
 */
export function tickEffectInstances(
  effects: readonly EffectInstance[],
  dt: number,
  contentInstance: Content = defaultContent,
): TickEffectsResult {
  const dtMs = round(mul(dt, 1000));
  const survivingEffects: EffectInstance[] = [];
  let totalDamage = 0;

  for (const inst of effects) {
    const def = contentInstance.effects.get(inst.effectId);
    if (!def) {
      // Missing definition: preserve until duration expires without processing ticks
      const newRemainingMs = sub(inst.remainingMs, dtMs);
      if (newRemainingMs > 0) {
        survivingEffects.push({
          ...inst,
          remainingMs: newRemainingMs,
        });
      }
      continue;
    }

    // Decrement remaining duration
    const newRemainingMs = sub(inst.remainingMs, dtMs);

    let newTickTimerMs = inst.tickTimerMs;
    let ticksFired = 0;

    if (def.kind === 'damageOverTime') {
      const tickIntervalMs = round(mul(def.tickInterval, 1000));
      newTickTimerMs = add(newTickTimerMs, dtMs);
      while (newTickTimerMs >= tickIntervalMs) {
        newTickTimerMs = sub(newTickTimerMs, tickIntervalMs);
        ticksFired = add(ticksFired, 1);
      }

      if (ticksFired > 0) {
        const damageThisEffect = mul(mul(def.damagePerTick, inst.stacks), ticksFired);
        totalDamage = add(totalDamage, damageThisEffect);
      }
    }

    // If remainingMs <= 0, the effect expires and is NOT added to survivingEffects.
    // Notice that any tick that landed on this boundary was already fired above.
    if (newRemainingMs > 0) {
      survivingEffects.push({
        ...inst,
        remainingMs: newRemainingMs,
        tickTimerMs: newTickTimerMs,
      });
    }
  }

  return {
    effects: survivingEffects,
    totalDamage,
  };
}

/**
 * Polymorphic tickEffects accepting either an array of EffectInstance or a
 * combatant object with { hp, effects, maxHp? }.
 */
export function tickEffects(
  target: readonly EffectInstance[],
  dt: number,
  contentInstance?: Content,
): TickEffectsResult;
export function tickEffects<
  T extends { readonly hp: number; readonly effects: readonly EffectInstance[]; readonly maxHp?: number },
>(
  target: T,
  dt: number,
  contentInstance?: Content,
): T;
export function tickEffects(
  target:
    | readonly EffectInstance[]
    | { readonly hp: number; readonly effects: readonly EffectInstance[]; readonly maxHp?: number },
  dt: number,
  contentInstance: Content = defaultContent,
): TickEffectsResult | { readonly hp: number; readonly effects: readonly EffectInstance[]; readonly maxHp?: number } {
  if (Array.isArray(target)) {
    return tickEffectInstances(target, dt, contentInstance);
  }

  const combatant = target as {
    readonly hp: number;
    readonly effects: readonly EffectInstance[];
    readonly maxHp?: number;
  };
  const { effects, totalDamage } = tickEffectInstances(combatant.effects, dt, contentInstance);
  const maxHp = combatant.maxHp ?? Number.POSITIVE_INFINITY;
  const newHp = clamp(sub(combatant.hp, totalDamage), 0, maxHp);

  return {
    ...combatant,
    hp: newHp,
    effects,
  };
}

/**
 * Returns player on-hit effect IDs.
 * In Phase 1, reads from validated Content (playerBaseOnHitEffects).
 * In Phase 2, this will also combine skill tree / discipline bonuses.
 */
export function deriveOnHitEffects(
  _state: GameState,
  contentInstance: Content = defaultContent,
): readonly string[] {
  return contentInstance.playerBaseOnHitEffects;
}

