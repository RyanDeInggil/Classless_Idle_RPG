import { describe, it, expect } from 'vitest';
import { levelCurve, levelCurveConfigSchema } from '../../src/data/levelCurve.js';

describe('levelCurve data and schema', () => {
  it('loads valid default level curve per D12', () => {
    expect(levelCurve.baseXp).toBe(50);
    expect(levelCurve.growthFactor).toBe(1.35);
    expect(levelCurve.skillPointsPerLevel).toBe(1);
    expect(levelCurve.maxLevel).toBeUndefined();
  });

  it('validates custom config with Zod', () => {
    const valid = {
      baseXp: 100,
      growthFactor: 1.5,
      skillPointsPerLevel: 2,
      maxLevel: 50,
    };
    expect(levelCurveConfigSchema.parse(valid)).toEqual(valid);
  });

  it('rejects negative or zero baseXp', () => {
    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: 0,
        growthFactor: 1.35,
        skillPointsPerLevel: 1,
      }),
    ).toThrow();

    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: -50,
        growthFactor: 1.35,
        skillPointsPerLevel: 1,
      }),
    ).toThrow();
  });

  it('rejects growthFactor below 1', () => {
    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: 50,
        growthFactor: 0.9,
        skillPointsPerLevel: 1,
      }),
    ).toThrow();
  });

  it('rejects negative skillPointsPerLevel', () => {
    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: 50,
        growthFactor: 1.35,
        skillPointsPerLevel: -1,
      }),
    ).toThrow();
  });

  it('rejects fractional skillPointsPerLevel', () => {
    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: 50,
        growthFactor: 1.35,
        skillPointsPerLevel: 1.5,
      }),
    ).toThrow();
  });

  it('rejects non-positive maxLevel', () => {
    expect(() =>
      levelCurveConfigSchema.parse({
        baseXp: 50,
        growthFactor: 1.35,
        skillPointsPerLevel: 1,
        maxLevel: 0,
      }),
    ).toThrow();
  });
});
