/**
 * Core step runner — M1-03.
 *
 * Public API:
 *   createInitialState(seed) → GameState
 *   advance(state, seconds)  → GameState   (pure, never mutates input)
 *   dispatch(state, action)  → GameState   (pure, never mutates input)
 *
 * Simulation rules (D6):
 *   - Fixed internal step: STEP_MS = 100 ms (0.1 s).
 *   - advance() processes whole steps only; fractional remainder carries forward.
 *   - Max 10 s processed per call regardless of elapsed real time.
 *   - Integer ms arithmetic avoids floating-point drift across split calls.
 *
 * No Math.random(), Date.now(), localStorage, or DOM access here.
 */

import { STARTING_LEVEL } from '../data/character.js';
import { content } from '../data/index.js';
import { deriveStatsForLevel } from './stats.js';
import { startCombat, stepCombat } from './combat/index.js';
import type { GameState, Action } from './types.js';

// ---------------------------------------------------------------------------
// Constants (exported so tests can pin them)
// ---------------------------------------------------------------------------

export const STEP_MS = 100;      // 0.1 s in integer milliseconds
export const MAX_STEPS = 100;    // 10 s cap per advance() call

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(
  seed: number,
  startingStageId: string = content.startingStageId,
): GameState {
  return {
    version: 1,
    rng: { seed: seed >>> 0 },
    character: {
      level: STARTING_LEVEL,
      xp: 0,
      skillPoints: 0,
      // Derived from character data, so a new character always starts at full health.
      currentHp: deriveStatsForLevel(STARTING_LEVEL).maxHp,
    },
    combat: null,
    activeActivity: null,
    unlockedStages: [startingStageId],
    savedAt: null,
    remainderMs: 0,
  } satisfies GameState;
}

// ---------------------------------------------------------------------------
// Internal tick — one fixed step of game logic
// ---------------------------------------------------------------------------

/**
 * Advance game logic by exactly STEP_MS milliseconds.
 */
function tick(state: GameState, stepSeconds: number): GameState {
  if (state.activeActivity === 'combat' && state.combat !== null) {
    return stepCombat(state, stepSeconds);
  }
  return state;
}

// ---------------------------------------------------------------------------
// advance — public entry point
// ---------------------------------------------------------------------------

/**
 * Pure step runner. Converts elapsed seconds to integer ms, processes
 * whole STEP_MS ticks, and carries the remainder into the returned state.
 *
 * Invariants:
 *   advance(s, 10) ≡ advance100Times(s, 0.1)   (split-test)
 *   advance(s, n)  does not mutate s
 *   advance(s, n) ≡ advance(s, n)               (deterministic)
 */
export function advance(state: GameState, seconds: number): GameState {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(
      `advance() requires a non-negative finite number of seconds, received ${seconds}`,
    );
  }

  // Convert to integer ms, then cap at MAX_STEPS worth.
  const clampedMs = Math.min(
    Math.round(seconds * 1000),
    MAX_STEPS * STEP_MS,
  );

  const totalMs = state.remainderMs + clampedMs;
  const steps = Math.floor(totalMs / STEP_MS);
  const newRemainderMs = totalMs % STEP_MS;

  let s: GameState = { ...state, remainderMs: newRemainderMs };
  for (let i = 0; i < steps; i++) {
    s = tick(s, STEP_MS / 1000);
  }
  return s;
}

// ---------------------------------------------------------------------------
// dispatch — action handler
// ---------------------------------------------------------------------------

/**
 * Pure action dispatcher. Returns updated state; never mutates input.
 * Exhaustive switch ensures TypeScript catches unhandled action types.
 */
export function dispatch(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'startCombat': {
      if (state.activeActivity !== null) return state;
      if (!state.unlockedStages.includes(action.stageId)) return state;
      return startCombat(state, action.stageId);
    }

    case 'stopCombat': {
      if (state.activeActivity !== 'combat') return state;
      return { ...state, activeActivity: null, combat: null };
    }

    default: {
      // Exhaustiveness guard — TS will error if a new Action variant is added
      // without a matching case.
      void (action satisfies never);
      return state;
    }
  }
}
