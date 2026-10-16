import { describe, it, expect } from 'vitest';
import { createInitialState, advance, dispatch, STEP_MS, MAX_STEPS } from '../../src/core/engine.js';
import { deriveStats } from '../../src/core/stats.js';

describe('createInitialState', () => {
  it('returns a valid starting GameState', () => {
    const s = createInitialState(42);
    expect(s.version).toBe(1);
    expect(s.character.level).toBe(1);
    expect(s.character.xp).toBe(0);
    expect(s.character.level).toBe(1);
    expect(s.character.currentHp).toBe(deriveStats(s).maxHp);
    expect(s.combat).toBeNull();
    expect(s.activeActivity).toBeNull();
    expect(s.remainderMs).toBe(0);
    expect(s.unlockedStages).toContain('stage-1');
  });

  it('bakes seed into rng state', () => {
    const a = createInitialState(1);
    const b = createInitialState(2);
    expect(a.rng.seed).not.toBe(b.rng.seed);
  });

  it('allows overriding startingStageId', () => {
    const s = createInitialState(1, 'custom-stage');
    expect(s.unlockedStages).toEqual(['custom-stage']);
  });
});

describe('advance', () => {
  it('is deterministic — same input produces same output', () => {
    const state = createInitialState(42);
    const a = advance(state, 5);
    const b = advance(state, 5);
    expect(a).toEqual(b);
  });

  it('does not mutate the input state', () => {
    const state = createInitialState(42);
    const snapshot = JSON.stringify(state);
    advance(state, 5);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('split test: advance(s, 10) equals 100× advance(s, 0.1)', () => {
    const state = createInitialState(99);

    const single = advance(state, 10);

    let split = state;
    for (let i = 0; i < 100; i++) {
      split = advance(split, 0.1);
    }

    expect(single).toEqual(split);
  });

  it('caps at 10 s — advance(s, 30) equals advance(s, 10)', () => {
    const state = createInitialState(7);
    expect(advance(state, 30)).toEqual(advance(state, 10));
  });

  it('carries sub-step remainder across calls', () => {
    const state = createInitialState(1);
    // 0.05 s each call — two calls should equal one 0.1 s call
    const twoHalves = advance(advance(state, 0.05), 0.05);
    const oneStep = advance(state, 0.1);
    expect(twoHalves).toEqual(oneStep);
  });

  it('produces no steps for sub-threshold elapsed time', () => {
    const state = createInitialState(1);
    const sliver = advance(state, 0.05); // 50 ms < STEP_MS (100 ms)
    expect(sliver.remainderMs).toBe(50);
    // State should be unchanged except for the remainder counter
    expect(sliver.rng).toEqual(state.rng);
    expect(sliver.character).toEqual(state.character);
  });

  it('processes the correct number of steps for a whole-second input', () => {
    // Validate the constant relationship: STEP_MS=100, so 1 s = 10 steps
    expect(MAX_STEPS * STEP_MS).toBe(10_000); // 10 s cap
    const state = createInitialState(1);
    const after = advance(state, 1);
    // tick() is a stub so state contents are unchanged; only remainderMs proves steps ran
    expect(after.remainderMs).toBe(0); // 1000 ms / 100 ms = 10 steps, no remainder
  });

  it('throws RangeError on negative seconds (-0.05)', () => {
    const state = createInitialState(1);
    expect(() => advance(state, -0.05)).toThrow(RangeError);
  });

  it('throws RangeError on NaN', () => {
    const state = createInitialState(1);
    expect(() => advance(state, Number.NaN)).toThrow(RangeError);
  });

  it('throws RangeError on Infinity and -Infinity', () => {
    const state = createInitialState(1);
    expect(() => advance(state, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => advance(state, Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('ensures remainderMs stays within 0..99 across multiple fractional advances', () => {
    let state = createInitialState(1);
    const deltas = [0.013, 0.047, 0.089, 0.155, 0.001, 0.099, 1.234];
    for (const dt of deltas) {
      state = advance(state, dt);
      expect(state.remainderMs).toBeGreaterThanOrEqual(0);
      expect(state.remainderMs).toBeLessThan(100);
      expect(Number.isInteger(state.remainderMs)).toBe(true);
    }
  });
});

describe('dispatch', () => {
  it('startCombat sets activeActivity for an unlocked stage', () => {
    const state = createInitialState(1);
    const next = dispatch(state, { type: 'startCombat', stageId: 'stage-1' });
    expect(next.activeActivity).toBe('combat');
  });

  it('startCombat ignores locked stages', () => {
    const state = createInitialState(1);
    const next = dispatch(state, { type: 'startCombat', stageId: 'stage-99' });
    expect(next.activeActivity).toBeNull();
  });

  it('startCombat is a no-op if already in an activity', () => {
    const state = createInitialState(1);
    const started = dispatch(state, { type: 'startCombat', stageId: 'stage-1' });
    const again = dispatch(started, { type: 'startCombat', stageId: 'stage-1' });
    expect(again).toEqual(started);
  });

  it('stopCombat clears activeActivity and combat state', () => {
    const state = createInitialState(1);
    const started = dispatch(state, { type: 'startCombat', stageId: 'stage-1' });
    const stopped = dispatch(started, { type: 'stopCombat' });
    expect(stopped.activeActivity).toBeNull();
    expect(stopped.combat).toBeNull();
  });

  it('stopCombat is a no-op when not in combat', () => {
    const state = createInitialState(1);
    expect(dispatch(state, { type: 'stopCombat' })).toEqual(state);
  });

  it('does not mutate the input state', () => {
    const state = createInitialState(1);
    const snapshot = JSON.stringify(state);
    dispatch(state, { type: 'startCombat', stageId: 'stage-1' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
