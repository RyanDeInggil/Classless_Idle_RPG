import { describe, it, expect } from 'vitest';
import { defaultConfig } from '../helpers/config.js';
import {
  advance,
  applyEffect,
  createInitialState,
  dispatch,
  isStunned,
  startCombat,
  stepCombat,
  tickEffects,
} from '../../src/core/index.js';
import type {
  Content,
  DamageOverTimeEffectDef,
  EffectDef,
  EnemyDef,
  StageDef,
  StunEffectDef,
  WaveDef,
} from '../../src/data/index.js';
import type { GameConfig } from '../../src/core/types.js';
import { content as defaultContent } from '../../src/data/index.js';

function makeCustomContent(overrides: {
  effects?: EffectDef[];
  enemies?: EnemyDef[];
  waves?: WaveDef[];
  stages?: StageDef[];
}): Content {
  const effects = new Map(defaultContent.effects);
  const enemies = new Map(defaultContent.enemies);
  const waves = new Map(defaultContent.waves);
  const stages = new Map(defaultContent.stages);

  if (overrides.effects) {
    for (const eff of overrides.effects) effects.set(eff.id, eff);
  }
  if (overrides.enemies) {
    for (const e of overrides.enemies) enemies.set(e.id, e);
  }
  if (overrides.waves) {
    for (const w of overrides.waves) waves.set(w.id, w);
  }
  if (overrides.stages) {
    for (const s of overrides.stages) stages.set(s.id, s);
  }

  return {
    effects,
    enemies,
    waves,
    stages,
    playerBaseOnHitEffects: defaultContent.playerBaseOnHitEffects,
    startingStageId: defaultContent.startingStageId,
    raw: defaultContent.raw,
  };
}

describe('Timed Effects System (M1-08)', () => {
  const testBurnDef: DamageOverTimeEffectDef = {
    id: 'test-burn',
    name: 'Test Burn',
    kind: 'damageOverTime',
    duration: 4.0,
    tickInterval: 1.0,
    damagePerTick: 3,
    stacking: 'refresh',
    maxStacks: 3,
  };

  const testStunDef: StunEffectDef = {
    id: 'test-stun',
    name: 'Test Stun',
    kind: 'stun',
    duration: 1.5,
    stacking: 'refresh',
    maxStacks: 1,
  };

  // -------------------------------------------------------------------------
  // 1. Burn tick count, timing, and expiry
  // -------------------------------------------------------------------------
  it('deals damagePerTick at each interval and expires after duration (exact tick count and timing)', () => {
    const customContent = makeCustomContent({ effects: [testBurnDef] });
    let effects = applyEffect([], testBurnDef);

    expect(effects.length).toBe(1);
    expect(effects[0].remainingMs).toBe(4000);
    expect(effects[0].tickTimerMs).toBe(0);

    let totalDamageDealt = 0;
    const tickHistory: number[] = [];

    // Advance 45 steps (4.5s) in 0.1s steps
    for (let step = 1; step <= 45; step++) {
      const result = tickEffects(effects, 0.1, customContent);
      effects = result.effects;
      totalDamageDealt += result.totalDamage;
      if (result.totalDamage > 0) {
        tickHistory.push(step);
      }
    }

    // Ticks must fire at steps 10 (1.0s), 20 (2.0s), 30 (3.0s), and 40 (4.0s - expiry boundary)
    expect(tickHistory).toEqual([10, 20, 30, 40]);
    // 4 ticks of 3 damage = 12 total damage
    expect(totalDamageDealt).toBe(12);
    // After step 40, effect is expired and removed
    expect(effects.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. Refresh stacking
  // -------------------------------------------------------------------------
  it('refresh: reapplying mid-burn resets duration without adding ticks beyond new duration or duplicating', () => {
    const customContent = makeCustomContent({ effects: [testBurnDef] });
    let effects = applyEffect([], testBurnDef);

    // Run 25 steps (2.5s) -> 2 ticks fired (at step 10 and 20)
    let damageSoFar = 0;
    for (let step = 1; step <= 25; step++) {
      const res = tickEffects(effects, 0.1, customContent);
      effects = res.effects;
      damageSoFar += res.totalDamage;
    }
    expect(damageSoFar).toBe(6);
    expect(effects[0].remainingMs).toBe(1500);
    expect(effects[0].tickTimerMs).toBe(500);

    // Reapply mid-burn
    effects = applyEffect(effects, testBurnDef);
    expect(effects.length).toBe(1); // Not duplicated
    expect(effects[0].remainingMs).toBe(4000); // Reset to full duration
    expect(effects[0].tickTimerMs).toBe(500); // Kept current tickTimer
    expect(effects[0].stacks).toBe(1);

    // Now run until full expiry (40 steps / 4.0s from reapplication)
    let damageAfterRefresh = 0;
    for (let step = 1; step <= 40; step++) {
      const res = tickEffects(effects, 0.1, customContent);
      effects = res.effects;
      damageAfterRefresh += res.totalDamage;
    }

    // From reapply (with tickTimer 0.5):
    // step 5 (0.5s later) -> 3rd tick
    // step 15 (1.5s later) -> 4th tick
    // step 25 (2.5s later) -> 5th tick
    // step 35 (3.5s later) -> 6th tick
    // Total 4 ticks during the 4.0s refresh duration = 12 damage
    expect(damageAfterRefresh).toBe(12);
    expect(effects.length).toBe(0); // Expired cleanly
  });

  // -------------------------------------------------------------------------
  // 3. Stack stacking
  // -------------------------------------------------------------------------
  it('stack: stacks increase damage, cap at maxStacks, and duration refreshes', () => {
    const stackingDef: DamageOverTimeEffectDef = {
      id: 'bleed',
      name: 'Bleed',
      kind: 'damageOverTime',
      duration: 3.0,
      tickInterval: 1.0,
      damagePerTick: 4,
      stacking: 'stack',
      maxStacks: 3,
    };
    const customContent = makeCustomContent({ effects: [stackingDef] });

    let effects = applyEffect([], stackingDef);
    expect(effects[0].stacks).toBe(1);

    // Apply 2nd stack
    effects = applyEffect(effects, stackingDef);
    expect(effects[0].stacks).toBe(2);
    expect(effects[0].remainingMs).toBe(3000);

    // Apply 3rd stack
    effects = applyEffect(effects, stackingDef);
    expect(effects[0].stacks).toBe(3);

    // Apply 4th stack — must cap at maxStacks (3)
    effects = applyEffect(effects, stackingDef);
    expect(effects[0].stacks).toBe(3);

    // Tick for 1.0s (10 steps) -> fires with 3 stacks = 4 * 3 = 12 damage
    let damage = 0;
    for (let i = 0; i < 10; i++) {
      const res = tickEffects(effects, 0.1, customContent);
      effects = res.effects;
      damage += res.totalDamage;
    }
    expect(damage).toBe(12);
  });

  // -------------------------------------------------------------------------
  // 4. Ignore stacking
  // -------------------------------------------------------------------------
  it('ignore: reapplying does not change remaining duration', () => {
    const ignoreDef: StunEffectDef = {
      id: 'ignore-stun',
      name: 'Ignore Stun',
      kind: 'stun',
      duration: 5.0,
      stacking: 'ignore',
      maxStacks: 1,
    };
    const customContent = makeCustomContent({ effects: [ignoreDef] });

    let effects = applyEffect([], ignoreDef);
    expect(effects[0].remainingMs).toBe(5000);

    // Advance 2.0s
    for (let i = 0; i < 20; i++) {
      effects = tickEffects(effects, 0.1, customContent).effects;
    }
    expect(effects[0].remainingMs).toBe(3000);

    // Reapplying must ignore
    effects = applyEffect(effects, ignoreDef);
    expect(effects[0].remainingMs).toBe(3000); // Not reset to 5000
    expect(effects.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 5. Expiry removes effect and stops damage
  // -------------------------------------------------------------------------
  it('expiry removes the effect and no damage occurs after it', () => {
    const customContent = makeCustomContent({ effects: [testBurnDef] });
    let effects = applyEffect([], testBurnDef);

    // Advance 40 steps to expire (4.0s)
    for (let i = 0; i < 40; i++) {
      effects = tickEffects(effects, 0.1, customContent).effects;
    }
    expect(effects.length).toBe(0);

    // Next 10 steps deal 0 damage
    let damage = 0;
    for (let i = 0; i < 10; i++) {
      const res = tickEffects(effects, 0.1, customContent);
      effects = res.effects;
      damage += res.totalDamage;
    }
    expect(damage).toBe(0);
    expect(effects.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 6. DoT kills enemy and awards XP once
  // -------------------------------------------------------------------------
  it('DoT can kill an enemy and awards XP once', () => {
    // Enemy with 5 HP; player attacks with 0 damage so only DoT damages it
    const dotVictim: EnemyDef = {
      id: 'dot-victim',
      name: 'DoT Victim',
      maxHp: 5,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 25,
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = { id: 'dot-wave', enemies: [{ enemyId: 'dot-victim', count: 1 }] };
    const stage: StageDef = {
      id: 'dot-stage',
      name: 'DoT Stage',
      waves: ['dot-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      enemies: [dotVictim],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1, defaultConfig);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'dot-stage'] };
    state = startCombat(state, 'dot-stage', { ...defaultConfig, content: customContent });

    // Apply Burn directly to enemy
    const burnDef = customContent.effects.get('burn')!;
    const enemyWithBurn = {
      ...state.combat!.enemies[0],
      hp: 2, // 2 HP remaining, burn does 3 damage on tick
      effects: applyEffect([], burnDef),
    };
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemies: [enemyWithBurn],
      },
    };

    expect(state.character.xp).toBe(0);

    // Advance 10 steps (1.0s) -> Burn ticks for 3 damage, killing the enemy (2 HP -> 0)
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    }

    // Enemy was killed by DoT!
    expect(state.combat!.enemies.length).toBe(0);
    // XP awarded once (25 XP)
    expect(state.character.xp).toBe(25);
    // Boss pending reached since wave is cleared
    expect(state.combat!.bossPending).toBe(true);

    // Subsequent steps do not award more XP
    state = stepCombat(state, 1.0, { ...defaultConfig, content: customContent });
    expect(state.character.xp).toBe(25);
  });

  // -------------------------------------------------------------------------
  // 7. Stun blocks attacks and pauses attack timer
  // -------------------------------------------------------------------------
  it('stun blocks attacks for its duration, and the attack timer resumes afterwards without free instant attack', () => {
    const dummyEnemy: EnemyDef = {
      id: 'stun-dummy',
      name: 'Stun Dummy',
      maxHp: 1000,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 0,
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = { id: 'stun-wave', enemies: [{ enemyId: 'stun-dummy', count: 1 }] };
    const stage: StageDef = {
      id: 'stun-stage',
      name: 'Stun Stage',
      waves: ['stun-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      effects: [testStunDef],
      enemies: [dummyEnemy],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1, defaultConfig);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'stun-stage'] };
    state = startCombat(state, 'stun-stage', { ...defaultConfig, content: customContent });

    // Advance 4 steps (0.4s) -> playerAttackTimerMs is 400
    for (let i = 0; i < 4; i++) {
      state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    }
    expect(state.combat!.playerAttackTimerMs).toBe(400);

    // Apply Stun to player (duration 1.5s = 15 steps)
    state = {
      ...state,
      combat: {
        ...state.combat!,
        playerEffects: applyEffect(state.combat!.playerEffects, testStunDef),
      },
    };
    expect(isStunned(state.combat!.playerEffects, customContent)).toBe(true);

    // Advance 15 steps (1.5s) while stunned
    for (let i = 0; i < 15; i++) {
      state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
      // Timer must remain frozen at 400 ms
      expect(state.combat!.playerAttackTimerMs).toBe(400);
    }

    // Stun has expired!
    expect(isStunned(state.combat!.playerEffects, customContent)).toBe(false);
    expect(state.combat!.playerEffects.length).toBe(0);

    // Next step (step 1 after stun ends): timer resumes from 400 -> 500 ms
    state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    expect(state.combat!.playerAttackTimerMs).toBe(500);

    // Advance 5 more steps to reach 1000 ms (requires 500 ms more to attack, no free instant attack!)
    for (let i = 0; i < 4; i++) {
      state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    }
    expect(state.combat!.playerAttackTimerMs).toBe(900);

    // Step to 1000 ms -> attack finally fires!
    const hpBefore = state.combat!.enemies[0].hp;
    state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    expect(state.combat!.playerAttackTimerMs).toBe(0);
    expect(state.combat!.enemies[0].hp).toBeLessThan(hpBefore);
  });

  // -------------------------------------------------------------------------
  // 8. Stun on dead enemy is cleaned up
  // -------------------------------------------------------------------------
  it('stun on an enemy that dies is cleaned up', () => {
    const fragileEnemy: EnemyDef = {
      id: 'fragile',
      name: 'Fragile',
      maxHp: 5,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 10,
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = { id: 'fragile-wave', enemies: [{ enemyId: 'fragile', count: 1 }] };
    const stage: StageDef = {
      id: 'fragile-stage',
      name: 'Fragile Stage',
      waves: ['fragile-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      effects: [testStunDef],
      enemies: [fragileEnemy],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1, defaultConfig);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'fragile-stage'] };
    state = startCombat(state, 'fragile-stage', { ...defaultConfig, content: customContent });

    // Apply stun to enemy
    const enemyWithStun = {
      ...state.combat!.enemies[0],
      effects: applyEffect([], testStunDef),
    };
    state = {
      ...state,
      combat: {
        ...state.combat!,
        enemies: [enemyWithStun],
      },
    };
    expect(state.combat!.enemies[0].effects.length).toBe(1);

    // Player attacks at step 10 and kills the fragile enemy (10 damage vs 5 HP)
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, { ...defaultConfig, content: customContent });
    }

    // Enemy is removed, so its stun effect is also gone
    expect(state.combat!.enemies.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 9. Time splitting invariance with effects active
  // -------------------------------------------------------------------------
  it('time splitting invariance with effects active: advance(s, 10, defaultConfig) === 100 x advance(s, 0.1, defaultConfig)', () => {
    // Build start state by hand: player with active stun, enemies with active burn, on a non-final wave
    const weakEnemy: EnemyDef = {
      id: 'time-split-enemy',
      name: 'Time Split Enemy',
      maxHp: 100,
      damage: 2,
      attackInterval: 1.0,
      xpReward: 10,
      isBoss: false,
      onHitEffects: [],
    };
    const wave1: WaveDef = { id: 'ts-w1', enemies: [{ enemyId: 'time-split-enemy', count: 2 }] };
    const wave2: WaveDef = { id: 'ts-w2', enemies: [{ enemyId: 'time-split-enemy', count: 1 }] };
    const stage: StageDef = {
      id: 'time-split-stage',
      name: 'Time Split Stage',
      waves: ['ts-w1', 'ts-w2'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent: Content = {
      effects: defaultConfig.content.effects,
      enemies: new Map([...defaultConfig.content.enemies, [weakEnemy.id, weakEnemy]]),
      waves: new Map([[wave1.id, wave1], [wave2.id, wave2]]),
      stages: new Map([[stage.id, stage]]),
      playerBaseOnHitEffects: defaultConfig.content.playerBaseOnHitEffects,
      startingStageId: defaultConfig.content.startingStageId,
      raw: defaultConfig.content.raw,
    };
    const config: GameConfig = { ...defaultConfig, content: customContent };

    let stateSingle = createInitialState(101, config);
    stateSingle = { ...stateSingle, unlockedStages: [...stateSingle.unlockedStages, 'time-split-stage'] };
    stateSingle = dispatch(stateSingle, { type: 'startCombat', stageId: 'time-split-stage' }, config);

    // Set up player with active stun (remainingMs = 5000, plenty of time) and enemies with active burn
    stateSingle = {
      ...stateSingle,
      combat: {
        ...stateSingle.combat!,
        playerEffects: [
          {
            effectId: 'stun',
            remainingMs: 5000,
            tickTimerMs: 0,
            stacks: 1,
          },
        ],
        enemies: stateSingle.combat!.enemies.map((e) => ({
          ...e,
          effects: [
            {
              effectId: 'burn',
              remainingMs: 15000,
              tickTimerMs: 500,
              stacks: 1,
            },
          ],
        })),
      },
    };

    let stateSplit = JSON.parse(JSON.stringify(stateSingle)); // Deep clone

    // Assert effects really run
    const singleAfter1 = advance(stateSingle, 1.0, config);
    // Burn should have ticked at least once (dealing 3 damage per tick)
    expect(singleAfter1.combat!.enemies[0].hp).toBeLessThan(100);
    // Player should still be stunned (5000ms - 1000ms = 4000ms remaining), so attack timer should be frozen at 0
    expect(singleAfter1.combat!.playerAttackTimerMs).toBe(0);
    expect(singleAfter1.combat!.playerEffects[0].effectId).toBe('stun');
    expect(singleAfter1.combat!.playerEffects[0].remainingMs).toBe(4000);

    // Now compare advance(s, 10) with 100 x advance(s, 0.1)
    const single = advance(stateSingle, 10, config);

    let split = stateSplit;
    for (let i = 0; i < 100; i++) {
      split = advance(split, 0.1, config);
    }

    expect(single).toEqual(split);
  });
});
