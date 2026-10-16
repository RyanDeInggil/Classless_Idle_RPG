/**
 * Character experience, level curve, and level-up loop (M1-05).
 *
 * Requirements:
 * - FR-003, FR-004, FR-005, FR-006.
 * - Decision D12: xpToNext(level) = round(50 * 1.35^(level-1)). Tunable in data.
 *   Skill points are granted but unspent until Phase 2.
 * - Hard rules: pure functions, never mutate inputs, arithmetic through core/num.ts.
 *
 * No Math.random(), Date.now(), localStorage, or DOM access here.
 */
import { levelCurve as defaultLevelCurve, type LevelCurveConfig } from '../data/levelCurve.js';
import { add, mul, pow, round, sub } from './num.js';
import type { CharacterState, GameState } from './types.js';

/** Coerce a level into a finite integer >= 1. */
function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    throw new RangeError(`level: level must be finite, received ${level}`);
  }
  return Math.max(1, Math.floor(level));
}

/**
 * Calculates experience required to advance from `level` to `level + 1`.
 * Formula per D12: round(baseXp * growthFactor^(level - 1))
 */
export function xpToNextLevel(
  level: number,
  config: LevelCurveConfig = defaultLevelCurve,
): number {
  const normLevel = normalizeLevel(level);

  if (config.maxLevel !== undefined && normLevel >= config.maxLevel) {
    return Number.POSITIVE_INFINITY;
  }

  const levelsAboveBase = sub(normLevel, 1);
  const factor = pow(config.growthFactor, levelsAboveBase);
  return round(mul(config.baseXp, factor));
}

/**
 * Award XP directly to a CharacterState and resolve level-ups.
 * Supports multiple levels per award via an iterative loop.
 * Pure function: returns a new CharacterState; never mutates the input.
 */
export function awardCharacterXp(
  character: CharacterState,
  xpAmount: number,
  config: LevelCurveConfig = defaultLevelCurve,
): CharacterState {
  if (!Number.isFinite(xpAmount) || xpAmount < 0) {
    throw new RangeError(`awardXp: XP amount must be a finite non-negative number, received ${xpAmount}`);
  }

  if (xpAmount === 0) {
    return character;
  }

  let currentLevel = normalizeLevel(character.level);
  let currentXp = add(character.xp, xpAmount);
  let currentSkillPoints = character.skillPoints;

  // Level-up loop: handles single or multiple level jumps
  while (true) {
    if (config.maxLevel !== undefined && currentLevel >= config.maxLevel) {
      break;
    }

    const needed = xpToNextLevel(currentLevel, config);
    if (currentXp < needed) {
      break;
    }

    currentXp = sub(currentXp, needed);
    currentLevel = add(currentLevel, 1);
    currentSkillPoints = add(currentSkillPoints, config.skillPointsPerLevel);
  }

  return {
    ...character,
    level: currentLevel,
    xp: currentXp,
    skillPoints: currentSkillPoints,
  };
}

/**
 * Award XP to a GameState or CharacterState, executing the level-up loop.
 * Pure function: returns a new state; never mutates the input.
 */
export function awardXp(
  target: GameState,
  xpAmount: number,
  config?: LevelCurveConfig,
): GameState;
export function awardXp(
  target: CharacterState,
  xpAmount: number,
  config?: LevelCurveConfig,
): CharacterState;
export function awardXp(
  target: GameState | CharacterState,
  xpAmount: number,
  config: LevelCurveConfig = defaultLevelCurve,
): GameState | CharacterState {
  if ('character' in target) {
    const updatedCharacter = awardCharacterXp(target.character, xpAmount, config);
    if (updatedCharacter === target.character) {
      return target;
    }
    return {
      ...target,
      character: updatedCharacter,
    };
  }

  return awardCharacterXp(target, xpAmount, config);
}
