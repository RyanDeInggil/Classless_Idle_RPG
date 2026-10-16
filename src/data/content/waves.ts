/**
 * Starter waves (per D11).
 *
 * 3 waves of increasing size and difficulty using regular enemies.
 */
import type { WaveDef } from '../schemas.js';

export const starterWaves: WaveDef[] = [
  {
    id: 'wave-1',
    enemies: [
      { enemyId: 'slime', count: 2 },
    ],
  },
  {
    id: 'wave-2',
    enemies: [
      { enemyId: 'slime', count: 2 },
      { enemyId: 'goblin', count: 1 },
    ],
  },
  {
    id: 'wave-3',
    enemies: [
      { enemyId: 'goblin', count: 2 },
      { enemyId: 'wolf', count: 1 },
    ],
  },
];
