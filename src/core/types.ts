/**
 * Core GameState and Action types.
 *
 * Design notes:
 * - All fields are readonly — enforce immutability at the type level.
 * - Derived values (e.g. final stats) are NOT stored here; recalculate on read.
 * - remainderMs is an integer (0–99) tracking sub-step carry (D6).
 * - combat: null means no active combat session.
 */

import type { RngState } from './rng.js';

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

export interface CharacterState {
  readonly level: number;
  readonly xp: number;
  readonly skillPoints: number;    // granted but unspendable until Phase 2 (D12)
  readonly currentHp: number;      // 0 <= currentHp <= deriveStats(state).maxHp
}

// Base statistics and per-level growth are content data (src/data/character.ts);
// final statistics come from deriveStats() in core/stats.ts and are never stored
// here (hard rule 5, D14).

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

/** A status effect active on an entity. */
export interface EffectInstance {
  readonly effectId: string;
  readonly remainingMs: number;       // remaining duration in integer milliseconds
  readonly tickTimerMs: number;       // accumulated tick time in integer milliseconds
  readonly stacks: number;            // current stacks (>= 1)
}

export interface EnemyState {
  readonly defId: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly attackTimerMs: number;     // accumulated attack time in integer milliseconds
  readonly effects: readonly EffectInstance[];
}

export type CombatPhase =
  | { readonly type: 'active' }
  | { readonly type: 'bossPending' }
  | { readonly type: 'playerDefeated' }
  | { readonly type: 'recovery'; readonly remainingMs: number } // post-defeat pause (D1)
  | { readonly type: 'complete' };                              // unused in Phase 1

/** Maximum entries kept in the combat log (NFR-009). */
export const MAX_LOG_ENTRIES = 50;

export interface CombatState {
  readonly stageId: string;
  readonly waveIndex: number;               // 0-based
  readonly enemies: readonly EnemyState[];
  readonly playerAttackTimerMs: number;     // accumulated attack time in integer milliseconds
  readonly playerHp: number;
  readonly playerEffects: readonly EffectInstance[]; // Active effects on player
  readonly bossPending: boolean;
  readonly playerDefeated: boolean;
  readonly phase: CombatPhase;
  readonly log: readonly string[];          // newest entries appended, capped at MAX_LOG_ENTRIES
}

// ---------------------------------------------------------------------------
// Top-level state
// ---------------------------------------------------------------------------

export type ActivityType = 'combat';

export interface GameState {
  readonly version: 1;
  readonly rng: RngState;
  readonly character: CharacterState;
  readonly combat: CombatState | null;
  readonly activeActivity: ActivityType | null;
  readonly unlockedStages: readonly string[];
  readonly savedAt: number | null;    // Unix ms timestamp, written by persistence layer
  readonly remainderMs: number;       // integer, 0–99, sub-step carry for advance()
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { readonly type: 'startCombat'; readonly stageId: string }
  | { readonly type: 'stopCombat' };
