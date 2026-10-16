/**
 * Starter combat effects (per D11).
 *
 * - Burn: player-side effect, damageOverTime, duration 4s, tickInterval 1s, damagePerTick 3, stacking refresh.
 * - Stun: boss effect, duration 1.5s, stacking refresh.
 */
import type { EffectDef } from '../schemas.js';

export const starterEffects: EffectDef[] = [
  {
    id: 'burn',
    name: 'Burn',
    kind: 'damageOverTime',
    duration: 4,
    tickInterval: 1,
    damagePerTick: 3,
    stacking: 'refresh',
    maxStacks: 3,
  },
  {
    id: 'stun',
    name: 'Stun',
    kind: 'stun',
    duration: 1.5,
    stacking: 'refresh',
    maxStacks: 3,
  },
];
