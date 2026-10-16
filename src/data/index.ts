/**
 * src/data — Content definitions.
 *
 * Stages, enemies, effects, activities, level curve, and other
 * data-driven content lives here. Validated with Zod at load time.
 * Adding content must not require changes to core code.
 */

import type { GameConfig } from '../core/types.js';
import { characterStats } from './character.js';
import { levelCurve } from './levelCurve.js';
import { content } from './content/index.js';

export * from './character.js';
export * from './levelCurve.js';
export * from './schemas.js';
export * from './content/index.js';

/**
 * Default configuration bundle for gameplay.
 * Only data, UI, persistence, and tests may import this.
 * Core functions must receive config as an explicit parameter.
 */
export const defaultConfig: GameConfig = {
  content,
  character: characterStats,
  levelCurve,
};
