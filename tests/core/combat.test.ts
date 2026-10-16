import { describe, it, expect, vi } from 'vitest';
import {
  advance,
  createInitialState,
  dispatch,
  startCombat,
  stepCombat,
} from '../../src/core/index.js';
import * as statsModule from '../../src/core/stats.js';
import type { EnemyState, GameState } from '../../src/core/types.js';
import type { Content, StageDef, WaveDef, EnemyDef } from '../../src/data/index.js';
import { content as defaultContent } from '../../src/data/index.js';

/**
 * Helper to build custom Content fixtures for targeted combat tests.
 */
function makeCustomContent(overrides: {
  enemies?: EnemyDef[];
  waves?: WaveDef[];
  stages?: StageDef[];
}): Content {
  const enemies = new Map(defaultContent.enemies);
  const waves = new Map(defaultContent.waves);
  const stages = new Map(defaultContent.stages);

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
    effects: defaultContent.effects,
    enemies,
    waves,
    stages,
    playerBaseOnHitEffects: defaultContent.playerBaseOnHitEffects,
    startingStageId: defaultContent.startingStageId,
    raw: defaultContent.raw,
  };
}

describe('Combat Engine (M1-07)', () => {
  // -------------------------------------------------------------------------
  // 1. Attack timers and remainder carry
  // -------------------------------------------------------------------------
  it('fires attack at the right time and carries remainder (interval 1.0 over 25 steps)', () => {
    // Enemy with huge HP and 0 damage so it survives and doesn't damage the player
    const dummyEnemy: EnemyDef = {
      id: 'dummy',
      name: 'Dummy',
      maxHp: 1000,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 0,
      isBoss: false,
      onHitEffects: [],
    };
    const dummyWave: WaveDef = { id: 'dummy-wave', enemies: [{ enemyId: 'dummy', count: 1 }] };
    const dummyStage: StageDef = {
      id: 'dummy-stage',
      name: 'Dummy Stage',
      waves: ['dummy-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      enemies: [dummyEnemy],
      waves: [dummyWave],
      stages: [dummyStage],
    });

    let state = createInitialState(1);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'dummy-stage'] };
    state = startCombat(state, 'dummy-stage', customContent);

    // Player attack rate at level 1 is 1.0 (interval 1.0 s)
    // Over 9 steps (0.9 s): no attack yet
    for (let i = 0; i < 9; i++) {
      state = stepCombat(state, 0.1, customContent);
    }
    expect(state.combat!.playerAttackTimerMs).toBe(900);
    expect(state.combat!.enemies[0].hp).toBe(1000);

    // Step 10 (1.0 s): attack fires! Remainder is 0
    state = stepCombat(state, 0.1, customContent);
    expect(state.combat!.playerAttackTimerMs).toBe(0);
    // Base attack is 10 (or 15 on crit)
    expect(state.combat!.enemies[0].hp).toBeLessThan(1000);

    // Run 15 more steps (total 25 steps = 2.5 s)
    for (let i = 0; i < 15; i++) {
      state = stepCombat(state, 0.1, customContent);
    }
    // Exactly 2 attacks have fired, timer carries remainder 500 ms
    expect(state.combat!.playerAttackTimerMs).toBe(500);
  });

  // -------------------------------------------------------------------------
  // 2. Damage and Crits
  // -------------------------------------------------------------------------
  describe('damage and crit calculation', () => {
    // Note: These tests are fully deterministic because critChance is forced to 0.0 and 1.0 respectively.
    it('applies exact non-crit damage when crit chance is 0 (deterministic)', () => {
      const deriveStatsSpy = vi.spyOn(statsModule, 'deriveStats').mockReturnValue({
        maxHp: 100,
        attack: 10,
        attackRate: 1.0,
        critChance: 0.0,
        critDamage: 1.5,
      });

      try {
        const dummyEnemy: EnemyDef = {
          id: 'sandbag',
          name: 'Sandbag',
          maxHp: 100,
          damage: 0,
          attackInterval: 10.0,
          xpReward: 0,
          isBoss: false,
          onHitEffects: [],
        };
        const dummyWave: WaveDef = { id: 'sb-wave', enemies: [{ enemyId: 'sandbag', count: 1 }] };
        const dummyStage: StageDef = {
          id: 'sb-stage',
          name: 'SB Stage',
          waves: ['sb-wave'],
          boss: 'goblin-chief',
          bossXpBonus: 0,
        };
        const customContent = makeCustomContent({
          enemies: [dummyEnemy],
          waves: [dummyWave],
          stages: [dummyStage],
        });

        let state = createInitialState(42);
        state = { ...state, unlockedStages: [...state.unlockedStages, 'sb-stage'] };
        state = startCombat(state, 'sb-stage', customContent);

        // Force 10 steps (1.0 s) to trigger attack
        for (let i = 0; i < 10; i++) {
          state = stepCombat(state, 0.1, customContent);
        }

        // Exact non-crit damage: 10. Initial enemy HP 100 -> exactly 90.
        const enemy = state.combat!.enemies[0];
        expect(enemy.hp).toBe(90);
      } finally {
        deriveStatsSpy.mockRestore();
      }
    });

    it('applies exact crit damage (attack * critDamage) when crit chance is 1.0 (deterministic)', () => {
      const deriveStatsSpy = vi.spyOn(statsModule, 'deriveStats').mockReturnValue({
        maxHp: 100,
        attack: 10,
        attackRate: 1.0,
        critChance: 1.0,
        critDamage: 1.5,
      });

      try {
        const dummyEnemy: EnemyDef = {
          id: 'sandbag-crit',
          name: 'Sandbag',
          maxHp: 100,
          damage: 0,
          attackInterval: 10.0,
          xpReward: 0,
          isBoss: false,
          onHitEffects: [],
        };
        const dummyWave: WaveDef = { id: 'sbc-wave', enemies: [{ enemyId: 'sandbag-crit', count: 1 }] };
        const dummyStage: StageDef = {
          id: 'sbc-stage',
          name: 'SBC Stage',
          waves: ['sbc-wave'],
          boss: 'goblin-chief',
          bossXpBonus: 0,
        };
        const customContent = makeCustomContent({
          enemies: [dummyEnemy],
          waves: [dummyWave],
          stages: [dummyStage],
        });

        let state = createInitialState(123);
        state = { ...state, unlockedStages: [...state.unlockedStages, 'sbc-stage'] };
        state = startCombat(state, 'sbc-stage', customContent);

        for (let i = 0; i < 10; i++) {
          state = stepCombat(state, 0.1, customContent);
        }

        // Exact crit damage: 10 * 1.5 = 15. Initial enemy HP 100 -> exactly 85.
        const enemy = state.combat!.enemies[0];
        expect(enemy.hp).toBe(85);
      } finally {
        deriveStatsSpy.mockRestore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. Determinism with seeded RNG
  // -------------------------------------------------------------------------
  it('gives identical combat results with same seed, differs with different seeds', () => {
    let stateA = createInitialState(999);
    stateA = dispatch(stateA, { type: 'startCombat', stageId: 'stage-1' });

    let stateB = createInitialState(999);
    stateB = dispatch(stateB, { type: 'startCombat', stageId: 'stage-1' });

    for (let i = 0; i < 50; i++) {
      stateA = advance(stateA, 0.1);
      stateB = advance(stateB, 0.1);
    }

    expect(stateA).toEqual(stateB);
  });

  // -------------------------------------------------------------------------
  // 4. HP flooring and enemy removal
  // -------------------------------------------------------------------------
  it('floors HP at 0 and removes dead enemies', () => {
    const weakEnemy: EnemyDef = {
      id: 'weakling',
      name: 'Weakling',
      maxHp: 5, // Player does 10 damage, which overkills
      damage: 0,
      attackInterval: 10.0,
      xpReward: 10,
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = {
      id: 'weak-wave',
      enemies: [{ enemyId: 'weakling', count: 2 }],
    };
    const stage: StageDef = {
      id: 'weak-stage',
      name: 'Weak Stage',
      waves: ['weak-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      enemies: [weakEnemy],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'weak-stage'] };
    state = startCombat(state, 'weak-stage', customContent);

    expect(state.combat!.enemies.length).toBe(2);

    // 10 steps (1.0 s): player kills first enemy
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, customContent);
    }

    // First enemy is dead and removed; second enemy is now the first living target
    expect(state.combat!.enemies.length).toBe(1);
    expect(state.combat!.enemies[0].hp).toBe(5);
  });

  // -------------------------------------------------------------------------
  // 5. Wave advance and bossPending
  // -------------------------------------------------------------------------
  it('spawns next wave when current is cleared, and sets bossPending after final wave', () => {
    const weakEnemy: EnemyDef = {
      id: 'one-shot',
      name: 'One Shot',
      maxHp: 5,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 5,
      isBoss: false,
      onHitEffects: [],
    };
    const wave1: WaveDef = { id: 'w1', enemies: [{ enemyId: 'one-shot', count: 1 }] };
    const wave2: WaveDef = { id: 'w2', enemies: [{ enemyId: 'one-shot', count: 1 }] };
    const stage: StageDef = {
      id: 'multi-wave-stage',
      name: 'Multi Wave Stage',
      waves: ['w1', 'w2'],
      boss: 'goblin-chief',
      bossXpBonus: 20,
    };
    const customContent = makeCustomContent({
      enemies: [weakEnemy],
      waves: [wave1, wave2],
      stages: [stage],
    });

    let state = createInitialState(1);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'multi-wave-stage'] };
    state = startCombat(state, 'multi-wave-stage', customContent);

    expect(state.combat!.waveIndex).toBe(0);
    expect(state.combat!.enemies.length).toBe(1);

    // Kill wave 1 enemy (step 10)
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, customContent);
    }

    // Wave advances to index 1!
    expect(state.combat!.waveIndex).toBe(1);
    expect(state.combat!.enemies.length).toBe(1);
    expect(state.combat!.bossPending).toBe(false);

    // Kill wave 2 enemy (step 20)
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, customContent);
    }

    // All regular waves cleared -> bossPending is true!
    expect(state.combat!.bossPending).toBe(true);
    expect(state.combat!.phase.type).toBe('bossPending');
    expect(state.combat!.enemies.length).toBe(0);

    // Further steps do not process combat
    const frozenState = stepCombat(state, 1.0, customContent);
    expect(frozenState).toEqual(state);
  });

  // -------------------------------------------------------------------------
  // 6. Player Defeat
  // -------------------------------------------------------------------------
  it('sets playerDefeated when HP reaches 0 and stops further combat', () => {
    // Enemy that deals fatal damage in 1 attack
    const lethalEnemy: EnemyDef = {
      id: 'reaper',
      name: 'Reaper',
      maxHp: 10000,
      damage: 150, // Player max HP is 100 at level 1
      attackInterval: 0.5,
      xpReward: 0,
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = { id: 'lethal-wave', enemies: [{ enemyId: 'reaper', count: 1 }] };
    const stage: StageDef = {
      id: 'lethal-stage',
      name: 'Lethal Stage',
      waves: ['lethal-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      enemies: [lethalEnemy],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'lethal-stage'] };
    state = startCombat(state, 'lethal-stage', customContent);

    expect(state.combat!.playerHp).toBe(100);
    expect(state.combat!.playerDefeated).toBe(false);

    // 5 steps (0.5 s): reaper attacks and deals 150 damage
    for (let i = 0; i < 5; i++) {
      state = stepCombat(state, 0.1, customContent);
    }

    expect(state.combat!.playerHp).toBe(0);
    expect(state.character.currentHp).toBe(0);
    expect(state.combat!.playerDefeated).toBe(true);
    expect(state.combat!.phase.type).toBe('playerDefeated');

    // Subsequent combat steps are halted
    const after = stepCombat(state, 0.5, customContent);
    expect(after).toEqual(state);
  });

  // -------------------------------------------------------------------------
  // 7. XP award and level-up on kill
  // -------------------------------------------------------------------------
  it('awards XP on kill and triggers level-up', () => {
    const xpEnemy: EnemyDef = {
      id: 'xp-blob',
      name: 'XP Blob',
      maxHp: 5,
      damage: 0,
      attackInterval: 10.0,
      xpReward: 50, // Exactly enough for level 1 -> 2
      isBoss: false,
      onHitEffects: [],
    };
    const wave: WaveDef = { id: 'xp-wave', enemies: [{ enemyId: 'xp-blob', count: 1 }] };
    const stage: StageDef = {
      id: 'xp-stage',
      name: 'XP Stage',
      waves: ['xp-wave'],
      boss: 'goblin-chief',
      bossXpBonus: 0,
    };
    const customContent = makeCustomContent({
      enemies: [xpEnemy],
      waves: [wave],
      stages: [stage],
    });

    let state = createInitialState(1);
    state = { ...state, unlockedStages: [...state.unlockedStages, 'xp-stage'] };
    state = startCombat(state, 'xp-stage', customContent);

    expect(state.character.level).toBe(1);
    expect(state.character.xp).toBe(0);

    // Kill enemy at step 10
    for (let i = 0; i < 10; i++) {
      state = stepCombat(state, 0.1, customContent);
    }

    // Leveled up to Level 2!
    expect(state.character.level).toBe(2);
    expect(state.character.xp).toBe(0);
    expect(state.character.skillPoints).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 8. Time splitting invariance (1 x 10s vs 100 x 0.1s)
  // -------------------------------------------------------------------------
  it('time splitting invariance: advance(s, 10) === 100 x advance(s, 0.1)', () => {
    let stateSingle = createInitialState(777);
    stateSingle = dispatch(stateSingle, { type: 'startCombat', stageId: 'stage-1' });

    let stateSplit = createInitialState(777);
    stateSplit = dispatch(stateSplit, { type: 'startCombat', stageId: 'stage-1' });

    const single = advance(stateSingle, 10);

    let split = stateSplit;
    for (let i = 0; i < 100; i++) {
      split = advance(split, 0.1);
    }

    expect(single).toEqual(split);
  });

  // -------------------------------------------------------------------------
  // 9. Additional Audit Tests (Fix 7)
  // -------------------------------------------------------------------------
  describe('audit scenarios', () => {
    // a) DoT and player attack on the same enemy in the same step: XP awarded once, wave advances once.
    it('awards XP once and advances wave once when DoT kills enemy in the same step player attacks', () => {
      const dummyEnemy: EnemyDef = {
        id: 'dot-kill-target',
        name: 'Target',
        maxHp: 20,
        damage: 0,
        attackInterval: 10.0,
        xpReward: 30,
        isBoss: false,
        onHitEffects: [],
      };
      const wave1: WaveDef = { id: 'w1', enemies: [{ enemyId: 'dot-kill-target', count: 1 }] };
      const wave2: WaveDef = { id: 'w2', enemies: [{ enemyId: 'dot-kill-target', count: 1 }] };
      const stage: StageDef = {
        id: 'dot-wave-stage',
        name: 'Stage',
        waves: ['w1', 'w2'],
        boss: 'goblin-chief',
        bossXpBonus: 0,
      };
      const customContent = makeCustomContent({
        enemies: [dummyEnemy],
        waves: [wave1, wave2],
        stages: [stage],
      });

      let state = createInitialState(1);
      state = { ...state, unlockedStages: [...state.unlockedStages, 'dot-wave-stage'] };
      state = startCombat(state, 'dot-wave-stage', customContent);

      // Enemy has 2 HP and active DoT with tick ready to deal 3 damage (lethal)
      const enemyWithDoT: EnemyState = {
        ...state.combat!.enemies[0],
        hp: 2,
        effects: [
          {
            effectId: 'burn',
            remainingMs: 3000,
            tickTimerMs: 1000, // Tick fires on this step
            stacks: 1,
          },
        ],
      };

      // Player attack timer is ready to fire
      state = {
        ...state,
        combat: {
          ...state.combat!,
          enemies: [enemyWithDoT],
          playerAttackTimerMs: 1000,
        },
      };

      state = stepCombat(state, 0.1, customContent);

      // XP awarded exactly once for 30 XP (level remains 1)
      expect(state.character.level).toBe(1);
      expect(state.character.xp).toBe(30);
      // Wave advanced exactly once to wave 1
      expect(state.combat!.waveIndex).toBe(1);
      // Newly spawned wave 2 enemy (maxHp 20) took player attack for 10 damage
      expect(state.combat!.enemies[0].hp).toBe(10);
    });

    // b) Tie rule (D14): player and last enemy both die in the same step -> player wins (playerHp = 1)
    describe('D14 simultaneous death tie-breaker', () => {
      it('player survives with 1 HP when both player and last enemy die to DoT in same step', () => {
        const dummyEnemy: EnemyDef = {
          id: 'tie-enemy-dot',
          name: 'Tie Enemy',
          maxHp: 20,
          damage: 0,
          attackInterval: 10.0,
          xpReward: 10,
          isBoss: false,
          onHitEffects: [],
        };
        const wave: WaveDef = { id: 'tie-w1', enemies: [{ enemyId: 'tie-enemy-dot', count: 1 }] };
        const stage: StageDef = {
          id: 'tie-stage-1',
          name: 'Tie Stage',
          waves: ['tie-w1'],
          boss: 'goblin-chief',
          bossXpBonus: 0,
        };
        const customContent = makeCustomContent({
          enemies: [dummyEnemy],
          waves: [wave],
          stages: [stage],
        });

        let state = createInitialState(1);
        state = { ...state, unlockedStages: [...state.unlockedStages, 'tie-stage-1'] };
        state = startCombat(state, 'tie-stage-1', customContent);

        // Player has 2 HP and lethal DoT (burn deals 3)
        // Enemy has 2 HP and lethal DoT (burn deals 3)
        state = {
          ...state,
          combat: {
            ...state.combat!,
            playerHp: 2,
            playerEffects: [
              {
                effectId: 'burn',
                remainingMs: 3000,
                tickTimerMs: 1000,
                stacks: 1,
              },
            ],
            enemies: [
              {
                ...state.combat!.enemies[0],
                hp: 2,
                effects: [
                  {
                    effectId: 'burn',
                    remainingMs: 3000,
                    tickTimerMs: 1000,
                    stacks: 1,
                  },
                ],
              },
            ],
          },
        };

        state = stepCombat(state, 0.1, customContent);

        // D14: Player wins tie, survives with 1 HP; stage cleared regular waves -> bossPending
        expect(state.combat!.playerHp).toBe(1);
        expect(state.combat!.playerDefeated).toBe(false);
        expect(state.combat!.bossPending).toBe(true);
      });

      it('player survives with 1 HP when player dies to DoT but kills last enemy with direct attack in same step', () => {
        const dummyEnemy: EnemyDef = {
          id: 'tie-enemy-direct',
          name: 'Tie Enemy Direct',
          maxHp: 20,
          damage: 0,
          attackInterval: 10.0,
          xpReward: 10,
          isBoss: false,
          onHitEffects: [],
        };
        const wave: WaveDef = { id: 'tie-w2', enemies: [{ enemyId: 'tie-enemy-direct', count: 1 }] };
        const stage: StageDef = {
          id: 'tie-stage-2',
          name: 'Tie Stage Direct',
          waves: ['tie-w2'],
          boss: 'goblin-chief',
          bossXpBonus: 0,
        };
        const customContent = makeCustomContent({
          enemies: [dummyEnemy],
          waves: [wave],
          stages: [stage],
        });

        let state = createInitialState(1);
        state = { ...state, unlockedStages: [...state.unlockedStages, 'tie-stage-2'] };
        state = startCombat(state, 'tie-stage-2', customContent);

        // Player has 2 HP and lethal DoT (3 damage)
        // Enemy has 2 HP, no DoT.
        // Player attack timer is 1000 ms (attack deals 10 damage, killing enemy).
        state = {
          ...state,
          combat: {
            ...state.combat!,
            playerHp: 2,
            playerAttackTimerMs: 1000,
            playerEffects: [
              {
                effectId: 'burn',
                remainingMs: 3000,
                tickTimerMs: 1000,
                stacks: 1,
              },
            ],
            enemies: [
              {
                ...state.combat!.enemies[0],
                hp: 2,
                effects: [],
              },
            ],
          },
        };

        state = stepCombat(state, 0.1, customContent);

        // D14: Player wins tie, survives with 1 HP; bossPending
        expect(state.combat!.playerHp).toBe(1);
        expect(state.combat!.playerDefeated).toBe(false);
        expect(state.combat!.bossPending).toBe(true);
      });
    });

    // c) Fast enemy: attackInterval = 0.04s over a 0.1s step fires 2 attacks and carries 0.02s remainder
    it('handles fast enemy with attackInterval = 0.04s firing 2 attacks and carrying 20ms remainder', () => {
      const fastEnemy: EnemyDef = {
        id: 'fast-attacker',
        name: 'Fast Attacker',
        maxHp: 100,
        damage: 4,
        attackInterval: 0.04, // 40 ms
        xpReward: 10,
        isBoss: false,
        onHitEffects: [],
      };
      const wave: WaveDef = { id: 'fast-w', enemies: [{ enemyId: 'fast-attacker', count: 1 }] };
      const stage: StageDef = {
        id: 'fast-stage',
        name: 'Fast Stage',
        waves: ['fast-w'],
        boss: 'goblin-chief',
        bossXpBonus: 0,
      };
      const customContent = makeCustomContent({
        enemies: [fastEnemy],
        waves: [wave],
        stages: [stage],
      });

      let state = createInitialState(1);
      state = { ...state, unlockedStages: [...state.unlockedStages, 'fast-stage'] };
      state = startCombat(state, 'fast-stage', customContent);

      const initialHp = state.combat!.playerHp;

      // In 0.1s (100 ms): 100 / 40 = 2 attacks, remainder 20 ms.
      // Total damage = 2 * 4 = 8.
      state = stepCombat(state, 0.1, customContent);

      expect(state.combat!.playerHp).toBe(initialHp - 8);
      expect(state.combat!.enemies[0].attackTimerMs).toBe(20);
    });

    // d) Mid-step level up: enemy kill awards XP -> player levels up -> next hit in same step uses new level stats; currentHp unchanged (D15)
    it('mid-step level-up applies higher attack to subsequent hit without modifying currentHp (D15)', () => {
      // Enemy 1: 5 HP, awards 50 XP (triggers level 1 -> 2 level up)
      // Enemy 2: 100 HP, to observe damage from second hit in the same step
      const mob1: EnemyDef = {
        id: 'xp-mob-1',
        name: 'Mob 1',
        maxHp: 5,
        damage: 0,
        attackInterval: 10.0,
        xpReward: 50,
        isBoss: false,
        onHitEffects: [],
      };
      const mob2: EnemyDef = {
        id: 'xp-mob-2',
        name: 'Mob 2',
        maxHp: 100,
        damage: 0,
        attackInterval: 10.0,
        xpReward: 10,
        isBoss: false,
        onHitEffects: [],
      };
      const wave: WaveDef = {
        id: 'multi-w',
        enemies: [
          { enemyId: 'xp-mob-1', count: 1 },
          { enemyId: 'xp-mob-2', count: 1 },
        ],
      };
      const stage: StageDef = {
        id: 'multi-hit-stage',
        name: 'Stage',
        waves: ['multi-w'],
        boss: 'goblin-chief',
        bossXpBonus: 0,
      };
      const customContent = makeCustomContent({
        enemies: [mob1, mob2],
        waves: [wave],
        stages: [stage],
      });

      let state = createInitialState(1);
      state = { ...state, unlockedStages: [...state.unlockedStages, 'multi-hit-stage'] };
      state = startCombat(state, 'multi-hit-stage', customContent);

      // Force player to have taken 20 damage (currentHp = 80, playerHp = 80)
      state = {
        ...state,
        character: {
          ...state.character,
          currentHp: 80,
        },
        combat: {
          ...state.combat!,
          playerHp: 80,
          // Give player enough timer for 2 attacks in this step (interval is 1000 ms at level 1)
          playerAttackTimerMs: 1900,
        },
      };

      // Ensure hit 2 does not crit so we can verify exact non-crit level 2 attack stat
      const origDeriveStats = statsModule.deriveStats;
      const statsSpy = vi.spyOn(statsModule, 'deriveStats').mockImplementation((s) => {
        const stats = origDeriveStats(s);
        return { ...stats, critChance: 0 };
      });

      try {
        // In 0.1s (100 ms dtMs), playerTimerMs reaches 2000 ms.
        // Attack 1 (at level 1 attack: 10): kills Mob 1 (5 HP). Awards 50 XP -> Level-up to Level 2!
        // D15: currentHp must remain 80 (not healed to full).
        // Attack 2 (at level 2): attack stat is 10 * 1.07 = 10.7. Mob 2 takes 10.7 damage.
        state = stepCombat(state, 0.1, customContent);

        expect(state.character.level).toBe(2);
        expect(state.character.currentHp).toBe(80);
        expect(state.combat!.playerHp).toBe(80);

        // Verify Mob 2 took the higher damage (100 - 10.7 = 89.3)
        const mob2Remaining = state.combat!.enemies[0];
        expect(mob2Remaining.defId).toBe('xp-mob-2');
        expect(mob2Remaining.hp).toBeCloseTo(89.3, 5);
      } finally {
        statsSpy.mockRestore();
      }
    });

    // e) Wave advance with active player effect: effect persists on player; new enemies spawn with clean effects array (D16)
    it('persists player effects across wave advance while new enemies spawn with clean effects (D16)', () => {
      const weakEnemy: EnemyDef = {
        id: 'weakling',
        name: 'Weakling',
        maxHp: 20,
        damage: 0,
        attackInterval: 10.0,
        xpReward: 10,
        isBoss: false,
        onHitEffects: [],
      };
      const wave1: WaveDef = { id: 'clean-w1', enemies: [{ enemyId: 'weakling', count: 1 }] };
      const wave2: WaveDef = { id: 'clean-w2', enemies: [{ enemyId: 'weakling', count: 1 }] };
      const stage: StageDef = {
        id: 'persist-stage',
        name: 'Persist Stage',
        waves: ['clean-w1', 'clean-w2'],
        boss: 'goblin-chief',
        bossXpBonus: 0,
      };
      const customContent = makeCustomContent({
        enemies: [weakEnemy],
        waves: [wave1, wave2],
        stages: [stage],
      });

      let state = createInitialState(1);
      state = { ...state, unlockedStages: [...state.unlockedStages, 'persist-stage'] };
      state = startCombat(state, 'persist-stage', customContent);

      // Add a stun effect to the player with 3000 ms remaining
      state = {
        ...state,
        combat: {
          ...state.combat!,
          playerAttackTimerMs: 1000,
          playerEffects: [
            {
              effectId: 'stun',
              remainingMs: 3000,
              tickTimerMs: 0,
              stacks: 1,
            },
          ],
        },
      };

      // Since player is stunned, player cannot attack. Let's kill the enemy via DoT on the enemy (hp: 2 vs burn: 3) to trigger wave advance.
      state = {
        ...state,
        combat: {
          ...state.combat!,
          enemies: [
            {
              ...state.combat!.enemies[0],
              hp: 2,
              effects: [
                {
                  effectId: 'burn',
                  remainingMs: 3000,
                  tickTimerMs: 1000,
                  stacks: 1,
                },
              ],
            },
          ],
        },
      };

      state = stepCombat(state, 0.1, customContent);

      // Wave advanced to wave 1
      expect(state.combat!.waveIndex).toBe(1);
      // D16: Player effect persisted, remaining duration decreased by 100 ms (3000 -> 2900)
      expect(state.combat!.playerEffects.length).toBe(1);
      expect(state.combat!.playerEffects[0].effectId).toBe('stun');
      expect(state.combat!.playerEffects[0].remainingMs).toBe(2900);

      // Newly spawned enemy in wave 2 has an empty effects list
      expect(state.combat!.enemies[0].effects).toEqual([]);
    });

    // g) State immutability: deep equality after JSON round trip of a fully populated CombatState with effects, timers, multiple enemies
    it('survives JSON round trip with deep equality on a fully populated CombatState', () => {
      const state = createInitialState(42);
      const started = startCombat(state, 'stage-1');

      const richState: GameState = {
        ...started,
        remainderMs: 45,
        combat: {
          ...started.combat!,
          playerAttackTimerMs: 650,
          playerHp: 75,
          playerEffects: [
            {
              effectId: 'burn',
              remainingMs: 2500,
              tickTimerMs: 400,
              stacks: 2,
            },
            {
              effectId: 'stun',
              remainingMs: 1200,
              tickTimerMs: 0,
              stacks: 1,
            },
          ],
          enemies: [
            {
              defId: 'slime',
              hp: 12,
              maxHp: 20,
              attackTimerMs: 800,
              effects: [
                {
                  effectId: 'burn',
                  remainingMs: 1800,
                  tickTimerMs: 300,
                  stacks: 1,
                },
              ],
            },
            {
              defId: 'goblin',
              hp: 35,
              maxHp: 35,
              attackTimerMs: 200,
              effects: [],
            },
          ],
          log: ['Hero engaged Stage 1', 'Hero attacked Slime for 10 damage'],
        },
      };

      const serialized = JSON.stringify(richState);
      const parsed: GameState = JSON.parse(serialized);

      expect(parsed).toEqual(richState);
    });
  });
});
