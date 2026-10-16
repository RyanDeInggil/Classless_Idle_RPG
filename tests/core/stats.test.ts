import { describe, it, expect, vi } from 'vitest';
import { deriveStats, deriveStatsForLevel } from '../../src/core/stats.js';
import { createInitialState } from '../../src/core/engine.js';
import { characterStats, STARTING_LEVEL } from '../../src/data/character.js';
import type { GameState } from '../../src/core/types.js';

/** Expected value from the documented growth model: base * growth^(level - 1). */
function expected(base: number, growth: number, level: number): number {
  return base * growth ** (level - 1);
}

describe('deriveStatsForLevel', () => {
  it('returns the data base stats at level 1', () => {
    const stats = deriveStatsForLevel(1);
    expect(stats.maxHp).toBe(characterStats.base.maxHp);
    expect(stats.attack).toBe(characterStats.base.attack);
    expect(stats.attackRate).toBe(characterStats.base.attackRate);
    expect(stats.critChance).toBe(characterStats.base.critChance);
    expect(stats.critDamage).toBe(characterStats.base.critDamage);
  });

  it('applies each configured growth factor once per level gained', () => {
    for (const level of [2, 5, 10]) {
      const stats = deriveStatsForLevel(level);
      const { base, growthPerLevel } = characterStats;
      expect(stats.maxHp).toBeCloseTo(expected(base.maxHp, growthPerLevel.maxHp, level), 10);
      expect(stats.attack).toBeCloseTo(expected(base.attack, growthPerLevel.attack, level), 10);
      expect(stats.attackRate).toBeCloseTo(
        expected(base.attackRate, growthPerLevel.attackRate, level),
        10,
      );
      expect(stats.critDamage).toBeCloseTo(
        expected(base.critDamage, growthPerLevel.critDamage, level),
        10,
      );
    }
  });

  it('is deterministic — same level gives the same statistics', () => {
    expect(deriveStatsForLevel(7)).toEqual(deriveStatsForLevel(7));
  });

  it('grows every statistic monotonically with level', () => {
    const levels = [1, 2, 3, 10, 25, 60];
    for (let i = 1; i < levels.length; i += 1) {
      const previous = deriveStatsForLevel(levels[i - 1]);
      const current = deriveStatsForLevel(levels[i]);
      for (const key of ['maxHp', 'attack', 'attackRate', 'critChance', 'critDamage'] as const) {
        expect(current[key]).toBeGreaterThan(previous[key]);
      }
    }
  });

  it('saturates crit chance at certainty instead of exceeding 1', () => {
    for (const level of [40, 200, 5000]) {
      const stats = deriveStatsForLevel(level);
      expect(stats.critChance).toBeLessThanOrEqual(1);
      expect(stats.critChance).toBeGreaterThan(0);
    }
    // Far enough along, the multiplicative growth necessarily hits the cap.
    expect(deriveStatsForLevel(5000).critChance).toBe(1);
  });

  it('keeps crit damage at or above 1x', () => {
    for (const level of [1, 10, 5000]) {
      expect(deriveStatsForLevel(level).critDamage).toBeGreaterThanOrEqual(1);
    }
  });

  it('treats levels below 1 as level 1 and floors fractions', () => {
    expect(deriveStatsForLevel(0)).toEqual(deriveStatsForLevel(1));
    expect(deriveStatsForLevel(-25)).toEqual(deriveStatsForLevel(1));
    expect(deriveStatsForLevel(2.9)).toEqual(deriveStatsForLevel(2));
  });

  it('rejects a non-finite level', () => {
    expect(() => deriveStatsForLevel(Number.NaN)).toThrow(RangeError);
    expect(() => deriveStatsForLevel(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('deriveStats', () => {
  it('reads the level off the state', () => {
    const state = createInitialState(1);
    expect(deriveStats(state)).toEqual(deriveStatsForLevel(state.character.level));

    const leveled: GameState = {
      ...state,
      character: { ...state.character, level: 12 },
    };
    expect(deriveStats(leveled)).toEqual(deriveStatsForLevel(12));
    expect(deriveStats(leveled).attack).toBeGreaterThan(deriveStats(state).attack);
  });

  it('recalculates from level alone — nothing is read from stored stat fields', () => {
    const state = createInitialState(3);
    // Same state, different level: only level can be driving the result.
    const atTwenty = deriveStats({
      ...state,
      character: { ...state.character, level: 20 },
    });
    expect(atTwenty.maxHp).toBeCloseTo(expected(characterStats.base.maxHp, characterStats.growthPerLevel.maxHp, 20), 10);
  });

  it('does not mutate the state it is given', () => {
    const state = createInitialState(5);
    const snapshot = JSON.stringify(state);
    deriveStats(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('does not call Math.random or Date.now', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('core must not call Math.random');
    });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('core must not call Date.now');
    });
    try {
      expect(deriveStats(createInitialState(11)).maxHp).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });

  it('keeps derived statistics out of the saved state', () => {
    const serialized = JSON.stringify(createInitialState(1));
    const state = createInitialState(1);
    // Not stored: only currentHp belongs in the save (hard rule 5, D14).
    for (const key of ['maxHp', 'attack', 'attackRate', 'critChance', 'critDamage']) {
      expect(serialized).not.toContain(`"${key}"`);
      expect(Object.keys(state.character)).not.toContain(key);
    }
    expect(Object.keys(state.character).sort()).toEqual([
      'currentHp',
      'level',
      'skillPoints',
      'xp',
    ]);
  });

  it('starts a new character at full health', () => {
    const state = createInitialState(1);
    expect(state.character.level).toBe(STARTING_LEVEL);
    expect(state.character.currentHp).toBe(deriveStats(state).maxHp);
  });
});
