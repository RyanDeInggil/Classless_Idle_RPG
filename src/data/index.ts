/**
 * src/data — Content definitions.
 *
 * Stages, enemies, effects, activities, level curve, and other
 * data-driven content lives here. Validated with Zod at load time.
 * Adding content must not require changes to core code.
 */

export * from './character.js';
export * from './levelCurve.js';
export * from './schemas.js';
export * from './content/index.js';
