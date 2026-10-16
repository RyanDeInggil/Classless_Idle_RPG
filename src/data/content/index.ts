/**
 * Shipped starter content bundle and pre-validated Content instance.
 */
import type { RawContent, Content } from '../schemas.js';
import { loadContent } from '../schemas.js';
import { starterEffects } from './effects.js';
import { starterEnemies } from './enemies.js';
import { starterWaves } from './waves.js';
import { starterStages } from './stages.js';

export * from './effects.js';
export * from './enemies.js';
export * from './waves.js';
export * from './stages.js';

export const starterContent: RawContent = {
  effects: starterEffects,
  enemies: starterEnemies,
  waves: starterWaves,
  stages: starterStages,
  playerBaseOnHitEffects: ['burn'],
  startingStageId: 'stage-1',
};

/** Authoritative, pre-validated content instance for gameplay and testing. */
export const content: Content = loadContent(starterContent);
