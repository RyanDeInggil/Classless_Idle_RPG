import { describe, it, expect } from 'vitest';
import { characterStats, characterStatsSchema, STARTING_LEVEL } from '../../src/data/character.js';

const valid = {
  base: { maxHp: 100, attack: 10, attackRate: 1, critChance: 0.05, critDamage: 1.5 },
  growthPerLevel: { maxHp: 1.08, attack: 1.07, attackRate: 1.02, critChance: 1.04, critDamage: 1.01 },
};

describe('character stats data', () => {
  it('loads the shipped data', () => {
    expect(characterStats.base.maxHp).toBeGreaterThan(0);
    expect(characterStats.base.attack).toBeGreaterThan(0);
    expect(characterStats.base.attackRate).toBeGreaterThan(0);
    expect(characterStats.base.critChance).toBeGreaterThanOrEqual(0);
    expect(characterStats.base.critChance).toBeLessThanOrEqual(1);
    expect(characterStats.base.critDamage).toBeGreaterThanOrEqual(1);
    expect(STARTING_LEVEL).toBe(1);
  });

  it('accepts a growth factor above 1 for crit chance', () => {
    // Critical chance is a probability (capped at 1) but its growth rate is a
    // multiplier, so it is not subject to the probability bound.
    const parsed = characterStatsSchema.parse(valid);
    expect(parsed.growthPerLevel.critChance).toBe(1.04);
  });

  it('rejects base crit chance outside 0–1', () => {
    expect(() =>
      characterStatsSchema.parse({ ...valid, base: { ...valid.base, critChance: 1.5 } }),
    ).toThrow();
    expect(() =>
      characterStatsSchema.parse({ ...valid, base: { ...valid.base, critChance: -0.1 } }),
    ).toThrow();
  });

  it('rejects base crit damage below 1x', () => {
    expect(() =>
      characterStatsSchema.parse({ ...valid, base: { ...valid.base, critDamage: 0.5 } }),
    ).toThrow();
  });

  it('rejects non-positive stats and growth factors', () => {
    expect(() => characterStatsSchema.parse({ ...valid, base: { ...valid.base, maxHp: 0 } })).toThrow();
    expect(() => characterStatsSchema.parse({ ...valid, base: { ...valid.base, attack: -5 } })).toThrow();
    expect(() =>
      characterStatsSchema.parse({
        ...valid,
        growthPerLevel: { ...valid.growthPerLevel, attack: 0 },
      }),
    ).toThrow();
  });

  it('rejects a missing statistic', () => {
    const { attackRate, ...incompleteBase } = valid.base;
    void attackRate;
    expect(() => characterStatsSchema.parse({ ...valid, base: incompleteBase })).toThrow();
  });
});
