/**
 * Combat Engine (M1-07 + M1-08).
 *
 * Implements automatic combat within the fixed-step advance() loop:
 * - Attack timers with remainder carry
 * - Player damage, crit rolling (via seeded RNG), target selection (first alive)
 * - Enemy attacks, damage, HP floored at 0
 * - Kills, enemy removal, XP award per kill (direct hits and DoT)
 * - Timed effects: Burn (damage-over-time) and Stun (attack-timer freezing)
 * - Stacking rules: refresh, stack, ignore
 * - Wave advancement and bossPending transition
 * - Player defeat flag (retreat rule deferred to M1-10)
 *
 * Hard rules:
 * - Pure functions, no input mutation, no Math.random(), Date.now(), or DOM.
 * - Uses deriveStats(state) for player stats and core/num.ts for arithmetic.
 * - Enemy and effect data loaded from Content, never hardcoded.
 */
import type { Content } from '../../data/index.js';
import { awardXp } from '../level.js';
import { add, clamp, div, mul, round, sub } from '../num.js';
import { nextBool } from '../rng.js';
import { deriveStats } from '../stats.js';
import type { CombatPhase, CombatState, EnemyState, GameConfig, GameState } from '../types.js';
import {
  applyEffectToInstances,
  deriveOnHitEffects,
  isStunned,
  tickEffectInstances,
} from './effects.js';

// ---------------------------------------------------------------------------
// Wave Spawner
// ---------------------------------------------------------------------------

/**
 * Instantiates fresh EnemyState objects for all enemies in a wave.
 */
export function spawnWaveEnemies(
  waveId: string,
  contentInstance: Content,
): readonly EnemyState[] {
  const wave = contentInstance.waves.get(waveId);
  if (!wave) {
    throw new Error(`spawnWaveEnemies: wave '${waveId}' not found in content`);
  }

  const enemies: EnemyState[] = [];
  for (const group of wave.enemies) {
    const def = contentInstance.enemies.get(group.enemyId);
    if (!def) {
      throw new Error(`spawnWaveEnemies: enemy '${group.enemyId}' not found in content`);
    }

    for (let i = 0; i < group.count; i++) {
      enemies.push({
        defId: def.id,
        hp: def.maxHp,
        maxHp: def.maxHp,
        attackTimerMs: 0,
        effects: [],
      });
    }
  }

  return enemies;
}

// ---------------------------------------------------------------------------
// Start Combat
// ---------------------------------------------------------------------------

/**
 * Initializes a new combat session for an unlocked stage.
 */
export function startCombat(
  state: GameState,
  stageId: string,
  config: GameConfig,
): GameState {
  if (state.activeActivity !== null && state.activeActivity !== 'combat') {
    return state;
  }
  if (!state.unlockedStages.includes(stageId)) {
    return state;
  }

  const stage = config.content.stages.get(stageId);
  if (!stage) {
    return state;
  }

  const initialEnemies = spawnWaveEnemies(stage.waves[0], config.content);
  const playerHp = state.character.currentHp;

  const combat: CombatState = {
    stageId,
    waveIndex: 0,
    enemies: initialEnemies,
    playerAttackTimerMs: 0,
    playerHp,
    playerEffects: [],
    bossPending: false,
    playerDefeated: false,
    phase: { type: 'active' },
    log: [],
  };

  return {
    ...state,
    activeActivity: 'combat',
    combat,
  };
}

// ---------------------------------------------------------------------------
// Hooks (M1-08 Effects / M1-09 Boss / M1-10 Defeat)
// ---------------------------------------------------------------------------

/**
 * Hook called when player reaches 0 HP.
 * In M1-07/M1-08 this preserves playerDefeated: true without retreat.
 */
export function onPlayerDefeated(state: GameState): GameState {
  return state;
}

/**
 * Hook called when all regular waves in a stage are cleared.
 * In M1-07/M1-08 this marks bossPending: true (boss spawning is deferred to M1-09).
 */
export function onBossPending(state: GameState): GameState {
  return state;
}

// ---------------------------------------------------------------------------
// Step Combat (Called once per fixed 0.1s step)
// ---------------------------------------------------------------------------

/**
 * Advances combat by a time delta dt (seconds).
 * Pure function: never mutates input state.
 */
export function stepCombat(
  state: GameState,
  dt: number,
  config: GameConfig,
): GameState {
  if (state.activeActivity !== 'combat' || state.combat === null) {
    return state;
  }

  const combat = state.combat;
  const contentInstance = config.content;

  // If already defeated or waiting for boss, do not process combat
  if (combat.playerDefeated || combat.bossPending) {
    return state;
  }

  // If player HP is already 0, ensure defeated flag is set
  if (combat.playerHp <= 0) {
    const updatedState: GameState = {
      ...state,
      combat: {
        ...combat,
        playerHp: 0,
        playerEffects: [],
        playerDefeated: true,
        phase: { type: 'playerDefeated' },
      },
      character: {
        ...state.character,
        currentHp: 0,
      },
    };
    return onPlayerDefeated(updatedState);
  }

  const dtMs = round(mul(dt, 1000));
  let currentState: GameState = state;
  let currentRng = state.rng;
  let currentEnemies: EnemyState[] = [...combat.enemies];
  let playerHp = combat.playerHp;
  let playerEffects = combat.playerEffects ?? [];
  let waveIndex = combat.waveIndex;
  let bossPending: boolean = false;
  let playerDefeated: boolean = false;
  let phase: CombatPhase = combat.phase;
  const hadEnemiesAtStart = currentEnemies.length > 0;
  let waveClearedThisStep: boolean = false;

  // -------------------------------------------------------------------------
  // 0. Tick Active Effects (DoT & Expired Duration)
  // -------------------------------------------------------------------------
  const playerStunnedAtStart = isStunned(playerEffects, contentInstance);

  // Build working records for enemies with stunnedAtStart flag
  type EnemyWorkingRecord = EnemyState & { stunnedAtStart: boolean };

  // Enemies DoT
  const survivingEnemiesAfterDot: EnemyWorkingRecord[] = [];
  for (const enemy of currentEnemies) {
    const wasStunned = isStunned(enemy.effects, contentInstance);
    const tickResult = tickEffectInstances(enemy.effects, dt, contentInstance);
    const newHp = clamp(sub(enemy.hp, tickResult.totalDamage), 0, enemy.maxHp);

    if (newHp <= 0) {
      // Enemy killed by DoT!
      const enemyDef = contentInstance.enemies.get(enemy.defId);
      if (enemyDef) {
        currentState = awardXp(currentState, enemyDef.xpReward, config.levelCurve);
      }
      // Dead enemy removed (effects vanish with it)
    } else {
      const survivingEnemy: EnemyWorkingRecord = {
        ...enemy,
        hp: newHp,
        effects: tickResult.effects,
        stunnedAtStart: wasStunned,
      };
      survivingEnemiesAfterDot.push(survivingEnemy);
    }
  }
  let currentEnemiesWorking: EnemyWorkingRecord[] = survivingEnemiesAfterDot;

  // Check wave advancement if DoT cleared the wave
  if (currentEnemiesWorking.length === 0 && hadEnemiesAtStart) {
    waveClearedThisStep = true;
    const stage = contentInstance.stages.get(combat.stageId);
    if (stage) {
      const nextWaveIndex = add(waveIndex, 1);
      if (nextWaveIndex < stage.waves.length) {
        waveIndex = nextWaveIndex;
        const freshEnemies = spawnWaveEnemies(stage.waves[waveIndex], contentInstance);
        currentEnemiesWorking = freshEnemies.map((e) => ({ ...e, stunnedAtStart: false }));
      } else {
        bossPending = true;
        phase = { type: 'bossPending' };
      }
    }
  }

  // Player DoT
  const playerTickResult = tickEffectInstances(playerEffects, dt, contentInstance);
  playerEffects = playerTickResult.effects;
  let playerLethalDoT = false;
  if (playerTickResult.totalDamage > 0) {
    const maxHp = deriveStats(currentState, config).maxHp;
    playerHp = clamp(sub(playerHp, playerTickResult.totalDamage), 0, maxHp);

    if (playerHp <= 0) {
      // D14: If the player and the last enemy of the current wave would both die in the same step, the player wins.
      if (waveClearedThisStep) {
        playerHp = 1; // Player survives tie with 1 HP (DoT-death tie)
      } else {
        // Player took lethal DoT, but may still attack and clear wave in this step (direct-attack tie)
        playerLethalDoT = true;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 1. Player Attack Cycle (if not stunned, defeated, or bossPending)
  // -------------------------------------------------------------------------
  let playerTimerMs = combat.playerAttackTimerMs;

  if (!playerDefeated && !bossPending) {
    const playerStunned = playerStunnedAtStart || isStunned(playerEffects, contentInstance);

    if (!playerStunned) {
      let playerStats = deriveStats(currentState, config);
      let playerAttackIntervalMs = round(div(1000, playerStats.attackRate));
      playerTimerMs = add(playerTimerMs, dtMs);

      while (playerTimerMs >= playerAttackIntervalMs && currentEnemiesWorking.length > 0) {
        playerTimerMs = sub(playerTimerMs, playerAttackIntervalMs);

        // Derive stats from latest currentState (recalculated in case mid-step kill leveled up player, per D15)
        playerStats = deriveStats(currentState, config);
        playerAttackIntervalMs = round(div(1000, playerStats.attackRate));

        // Roll for crit using seeded RNG
        const [isCrit, nextRng] = nextBool(currentRng, playerStats.critChance);
        currentRng = nextRng;

        const damage = isCrit
          ? mul(playerStats.attack, playerStats.critDamage)
          : playerStats.attack;

        // Hits the first living enemy
        const target = currentEnemiesWorking[0];
        const newEnemyHp = clamp(sub(target.hp, damage), 0, target.maxHp);

        if (newEnemyHp <= 0) {
          // Enemy killed!
          const enemyDef = contentInstance.enemies.get(target.defId);
          if (enemyDef) {
            currentState = awardXp(currentState, enemyDef.xpReward, config.levelCurve);
          }
          // Remove dead enemy
          currentEnemiesWorking = currentEnemiesWorking.slice(1);
        } else {
          // Enemy survives hit: apply player's on-hit effects
          let updatedEffects = target.effects;
          const playerOnHit = deriveOnHitEffects(currentState, contentInstance);
          for (const effectId of playerOnHit) {
            const effectDef = contentInstance.effects.get(effectId);
            if (effectDef) {
              updatedEffects = applyEffectToInstances(updatedEffects, effectDef);
            }
          }

          const updatedTarget: EnemyWorkingRecord = {
            ...target,
            hp: newEnemyHp,
            effects: updatedEffects,
          };
          currentEnemiesWorking[0] = updatedTarget;
        }
      }

      // Check wave advancement after player attacks
      if (currentEnemiesWorking.length === 0) {
        waveClearedThisStep = true;
        const stage = contentInstance.stages.get(combat.stageId);
        if (stage) {
          const nextWaveIndex = add(waveIndex, 1);
          if (nextWaveIndex < stage.waves.length) {
            waveIndex = nextWaveIndex;
            const freshEnemies = spawnWaveEnemies(stage.waves[waveIndex], contentInstance);
            currentEnemiesWorking = freshEnemies.map((e) => ({ ...e, stunnedAtStart: false }));
          } else {
            // Cleared final regular wave -> boss pending
            bossPending = true;
            phase = { type: 'bossPending' };
          }
        }
      }
    }
    // If playerStunned: playerTimerMs is NOT advanced, attacks cannot fire
  }

  // If player took lethal DoT, resolve D14 tie or defeat after player's attack cycle
  if (playerLethalDoT) {
    if (waveClearedThisStep) {
      playerHp = 1; // Player survives tie with 1 HP (direct-attack tie)
    } else {
      playerHp = 0;
      playerDefeated = true;
      playerEffects = [];
      phase = { type: 'playerDefeated' };
    }
  }

  // -------------------------------------------------------------------------
  // 2. Enemy Attack Cycle (if not boss pending and player still alive)
  // -------------------------------------------------------------------------
  if (!playerDefeated && !bossPending && currentEnemiesWorking.length > 0) {
    const updatedEnemies: EnemyWorkingRecord[] = [];

    for (const enemy of currentEnemiesWorking) {
      if (playerDefeated) {
        updatedEnemies.push(enemy);
        continue;
      }

      const enemyDef = contentInstance.enemies.get(enemy.defId);
      if (!enemyDef) {
        updatedEnemies.push(enemy);
        continue;
      }

      const enemyStunned = enemy.stunnedAtStart || isStunned(enemy.effects, contentInstance);
      let enemyTimerMs = enemy.attackTimerMs;

      if (!enemyStunned) {
        const enemyAttackIntervalMs = round(mul(enemyDef.attackInterval, 1000));
        enemyTimerMs = add(enemyTimerMs, dtMs);

        while (enemyTimerMs >= enemyAttackIntervalMs) {
          enemyTimerMs = sub(enemyTimerMs, enemyAttackIntervalMs);

          // Enemy damages player
          const maxHp = deriveStats(currentState, config).maxHp;
          playerHp = clamp(sub(playerHp, enemyDef.damage), 0, maxHp);

          // Apply enemy on-hit effects to player
          for (const effectId of enemyDef.onHitEffects) {
            const effectDef = contentInstance.effects.get(effectId);
            if (effectDef) {
              playerEffects = applyEffectToInstances(playerEffects, effectDef);
            }
          }

          if (playerHp <= 0) {
            playerHp = 0;
            playerDefeated = true;
            playerEffects = []; // Clear effects on defeat
            phase = { type: 'playerDefeated' };
            break;
          }
        }
      }
      // If enemyStunned: enemyTimerMs is NOT advanced, enemy cannot attack

      updatedEnemies.push({
        ...enemy,
        attackTimerMs: enemyTimerMs,
      });
    }

    currentEnemiesWorking = updatedEnemies;
  }

  // Strip the stunnedAtStart flag to get clean EnemyState array
  currentEnemies = currentEnemiesWorking.map(({ stunnedAtStart, ...rest }) => rest);

  // -------------------------------------------------------------------------
  // 3. Assemble Updated GameState
  // -------------------------------------------------------------------------
  const nextCombat: CombatState = {
    stageId: combat.stageId,
    waveIndex,
    enemies: currentEnemies,
    playerAttackTimerMs: playerTimerMs,
    playerHp,
    playerEffects,
    bossPending,
    playerDefeated,
    phase,
    log: combat.log,
  };

  let resultState: GameState = {
    ...currentState,
    rng: currentRng,
    combat: nextCombat,
    character: {
      ...currentState.character,
      currentHp: playerHp,
    },
  };

  if (playerDefeated) {
    resultState = onPlayerDefeated(resultState);
  } else if (bossPending) {
    resultState = onBossPending(resultState);
  }

  return resultState;
}
