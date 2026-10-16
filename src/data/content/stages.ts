/**
 * Starter stages (per D11).
 *
 * - stage-1: Whispering Woods, 3 waves, goblin-chief boss, unlocks stage-2.
 * - stage-2: Placeholder stage with 1 wave so stage-1's unlocksStageId reference resolves.
 */
import type { StageDef } from '../schemas.js';

export const starterStages: StageDef[] = [
  {
    id: 'stage-1',
    name: 'Whispering Woods',
    waves: ['wave-1', 'wave-2', 'wave-3'],
    boss: 'goblin-chief',
    bossXpBonus: 50,
    unlocksStageId: 'stage-2',
  },
  // PLACEHOLDER STAGE: Resolves stage-1's unlocksStageId reference.
  // Reuses wave-1 and goblin-chief until Phase 1 / Phase 2 content expansion.
  {
    id: 'stage-2',
    name: 'Goblin Stronghold (Placeholder)',
    waves: ['wave-1'],
    boss: 'goblin-chief',
    bossXpBonus: 100,
  },
];
