import { describe, it, expect } from 'vitest';
import { awardCharacterXp, awardXp, xpToNextLevel } from '../../src/core/level.js';
import { createInitialState } from '../../src/core/engine.js';
import type { CharacterState, GameState } from '../../src/core/types.js';
import { defaultConfig } from '../helpers/config.js';

describe('xpToNextLevel', () => {
  it('calculates XP threshold for starting levels per D12', () => {
    // D12: xpToNext(level) = round(50 * 1.35^(level-1))
    // level 1: round(50 * 1.35^0) = 50
    expect(xpToNextLevel(1, defaultConfig.levelCurve)).toBe(50);
    // level 2: round(50 * 1.35^1) = round(67.5) = 68
    expect(xpToNextLevel(2, defaultConfig.levelCurve)).toBe(68);
    // level 3: round(50 * 1.35^2) = round(91.125) = 91
    expect(xpToNextLevel(3, defaultConfig.levelCurve)).toBe(91);
    // level 4: round(50 * 1.35^3) = round(123.01875) = 123
    expect(xpToNextLevel(4, defaultConfig.levelCurve)).toBe(123);
  });

  it('normalizes levels below 1 to level 1', () => {
    expect(xpToNextLevel(0, defaultConfig.levelCurve)).toBe(50);
    expect(xpToNextLevel(-5, defaultConfig.levelCurve)).toBe(50);
  });

  it('normalizes fractional levels by flooring', () => {
    expect(xpToNextLevel(2.8, defaultConfig.levelCurve)).toBe(68);
  });

  it('throws on non-finite level', () => {
    expect(() => xpToNextLevel(Number.NaN, defaultConfig.levelCurve)).toThrow(RangeError);
    expect(() => xpToNextLevel(Number.POSITIVE_INFINITY, defaultConfig.levelCurve)).toThrow(RangeError);
  });

  it('respects custom level curve configuration', () => {
    const customConfig = {
      baseXp: 100,
      growthFactor: 2.0,
      skillPointsPerLevel: 2,
    };
    expect(xpToNextLevel(1, customConfig)).toBe(100);
    expect(xpToNextLevel(2, customConfig)).toBe(200);
    expect(xpToNextLevel(3, customConfig)).toBe(400);
  });

  it('returns infinity when at or above maxLevel', () => {
    const customConfig = {
      baseXp: 50,
      growthFactor: 1.35,
      skillPointsPerLevel: 1,
      maxLevel: 3,
    };
    expect(xpToNextLevel(1, customConfig)).toBe(50);
    expect(xpToNextLevel(2, customConfig)).toBe(68);
    expect(xpToNextLevel(3, customConfig)).toBe(Number.POSITIVE_INFINITY);
    expect(xpToNextLevel(4, customConfig)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('awardCharacterXp and awardXp', () => {
  const baseCharacter: CharacterState = {
    level: 1,
    xp: 0,
    skillPoints: 0,
    currentHp: 100,
  };

  it('returns unchanged character if awarded 0 XP', () => {
    const result = awardCharacterXp(baseCharacter, 0, defaultConfig.levelCurve);
    expect(result).toBe(baseCharacter);
  });

  it('throws on negative or non-finite XP', () => {
    expect(() => awardCharacterXp(baseCharacter, -1, defaultConfig.levelCurve)).toThrow(RangeError);
    expect(() => awardCharacterXp(baseCharacter, Number.NaN, defaultConfig.levelCurve)).toThrow(RangeError);
    expect(() => awardCharacterXp(baseCharacter, Number.POSITIVE_INFINITY, defaultConfig.levelCurve)).toThrow(RangeError);
  });

  it('accumulates XP without leveling up when below threshold', () => {
    const result = awardCharacterXp(baseCharacter, 30, defaultConfig.levelCurve);
    expect(result.level).toBe(1);
    expect(result.xp).toBe(30);
    expect(result.skillPoints).toBe(0);
    expect(result.currentHp).toBe(100);
  });

  it('levels up exactly once when meeting the threshold', () => {
    // Level 1 threshold is 50 XP
    const result = awardCharacterXp(baseCharacter, 50, defaultConfig.levelCurve);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(0);
    expect(result.skillPoints).toBe(1);
  });

  it('levels up and carries surplus XP to the next level', () => {
    // 65 XP: 50 consumed for level 2, 15 carried over (threshold to level 3 is 68)
    const result = awardCharacterXp(baseCharacter, 65, defaultConfig.levelCurve);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(15);
    expect(result.skillPoints).toBe(1);
  });

  it('accounts for existing XP progress towards a level', () => {
    const partialChar: CharacterState = {
      level: 1,
      xp: 40,
      skillPoints: 0,
      currentHp: 100,
    };
    // 40 + 25 = 65 XP -> 50 consumed for level 2, 15 remaining
    const result = awardCharacterXp(partialChar, 25, defaultConfig.levelCurve);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(15);
    expect(result.skillPoints).toBe(1);
  });

  describe('multi-level jumps', () => {
    it('handles exact multi-level jumps (level 1 -> 3)', () => {
      // Level 1 -> 2: 50 XP
      // Level 2 -> 3: 68 XP
      // Total: 118 XP
      const result = awardCharacterXp(baseCharacter, 118, defaultConfig.levelCurve);
      expect(result.level).toBe(3);
      expect(result.xp).toBe(0);
      expect(result.skillPoints).toBe(2);
    });

    it('handles multi-level jumps with remainder (level 1 -> 3 with remainder)', () => {
      // 50 + 68 + 12 = 130 XP
      const result = awardCharacterXp(baseCharacter, 130, defaultConfig.levelCurve);
      expect(result.level).toBe(3);
      expect(result.xp).toBe(12);
      expect(result.skillPoints).toBe(2);
    });

    it('handles 3-level jump (level 1 -> 4)', () => {
      // Level 1 -> 2: 50
      // Level 2 -> 3: 68
      // Level 3 -> 4: 91
      // Total: 209 XP
      const result = awardCharacterXp(baseCharacter, 209, defaultConfig.levelCurve);
      expect(result.level).toBe(4);
      expect(result.xp).toBe(0);
      expect(result.skillPoints).toBe(3);
    });

    it('handles large XP awards across many levels', () => {
      // 1000 XP
      // L1: 50   (rem 950) -> L2, SP 1
      // L2: 68   (rem 882) -> L3, SP 2
      // L3: 91   (rem 791) -> L4, SP 3
      // L4: 123  (rem 668) -> L5, SP 4
      // L5: 166  (rem 502) -> L6, SP 5
      // L6: 224  (rem 278) -> L7, SP 6
      // L7: 303  (rem 278 < 303) -> stops at L7 with 278 XP
      const result = awardCharacterXp(baseCharacter, 1000, defaultConfig.levelCurve);
      expect(result.level).toBe(7);
      expect(result.xp).toBe(278);
      expect(result.skillPoints).toBe(6);
    });
  });

  describe('configuration overrides', () => {
    it('awards custom skill points per level', () => {
      const config = {
        baseXp: 50,
        growthFactor: 1.35,
        skillPointsPerLevel: 3,
      };
      const result = awardCharacterXp(baseCharacter, 118, config);
      expect(result.level).toBe(3);
      expect(result.skillPoints).toBe(6);
    });

    it('stops leveling at maxLevel', () => {
      const config = {
        baseXp: 50,
        growthFactor: 1.35,
        skillPointsPerLevel: 1,
        maxLevel: 2,
      };
      // Awarding 1000 XP only advances to maxLevel (2)
      const result = awardCharacterXp(baseCharacter, 1000, config);
      expect(result.level).toBe(2);
      expect(result.skillPoints).toBe(1);
    });
  });

  describe('immutability and pure function guarantees', () => {
    it('does not mutate input CharacterState', () => {
      const input: CharacterState = {
        level: 1,
        xp: 10,
        skillPoints: 0,
        currentHp: 100,
      };
      const snapshot = JSON.stringify(input);
      awardCharacterXp(input, 150, defaultConfig.levelCurve);
      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('awards XP to GameState and returns a new GameState', () => {
      const state: GameState = createInitialState(123, defaultConfig);
      const snapshot = JSON.stringify(state);

      const nextState = awardXp(state, 120, defaultConfig.levelCurve);

      // Input state is not mutated
      expect(JSON.stringify(state)).toBe(snapshot);

      // Character was updated
      expect(nextState.character.level).toBe(3);
      expect(nextState.character.xp).toBe(2);
      expect(nextState.character.skillPoints).toBe(2);

      // Non-character fields remain preserved
      expect(nextState.rng).toBe(state.rng);
      expect(nextState.combat).toBe(state.combat);
      expect(nextState.activeActivity).toBe(state.activeActivity);
      expect(nextState.unlockedStages).toBe(state.unlockedStages);
      expect(nextState.remainderMs).toBe(state.remainderMs);
      expect(nextState.savedAt).toBe(state.savedAt);
    });

    it('returns same GameState reference if 0 XP awarded', () => {
      const state: GameState = createInitialState(123, defaultConfig);
      const nextState = awardXp(state, 0, defaultConfig.levelCurve);
      expect(nextState).toBe(state);
    });
  });
});
