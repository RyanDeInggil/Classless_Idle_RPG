/**
 * Starter enemies (per D11).
 *
 * 3 regular enemies with escalating stats + 1 boss enemy.
 * Tunable starting values; exact balance pass is scheduled for M1-15.
 */
import type { EnemyDef } from '../schemas.js';

export const starterEnemies: EnemyDef[] = [
  {
    id: 'slime',
    name: 'Forest Slime',
    maxHp: 25,
    damage: 3,
    attackInterval: 2.0,
    xpReward: 10,
    isBoss: false,
    onHitEffects: [],
  },
  {
    id: 'goblin',
    name: 'Goblin Scout',
    maxHp: 45,
    damage: 6,
    attackInterval: 1.5,
    xpReward: 18,
    isBoss: false,
    onHitEffects: [],
  },
  {
    id: 'wolf',
    name: 'Dire Wolf',
    maxHp: 75,
    damage: 10,
    attackInterval: 1.2,
    xpReward: 30,
    isBoss: false,
    onHitEffects: [],
  },
  {
    id: 'goblin-chief',
    name: 'Goblin Chief',
    maxHp: 200,
    damage: 15,
    attackInterval: 2.5,
    xpReward: 100,
    isBoss: true,
    onHitEffects: ['stun'],
  },
];
