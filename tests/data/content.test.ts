import { describe, it, expect } from 'vitest';
import {
  loadContent,
  ContentValidationError,
  starterContent,
  type RawContent,
  enemyDefSchema,
  waveDefSchema,
  damageOverTimeEffectDefSchema,
  stunEffectDefSchema,
} from '../../src/data/index.js';

function cloneStarter(): RawContent {
  return structuredClone(starterContent);
}

describe('Content loading and cross-reference validation (M1-06)', () => {
  // -------------------------------------------------------------------------
  // 1. Shipped starter content
  // -------------------------------------------------------------------------
  it('loads shipped starter content without error and populates lookup maps', () => {
    const loaded = loadContent(starterContent);

    // Effects
    expect(loaded.effects.size).toBe(2);
    expect(loaded.effects.get('burn')?.kind).toBe('damageOverTime');
    expect(loaded.effects.get('stun')?.kind).toBe('stun');

    // Enemies
    expect(loaded.enemies.size).toBe(4);
    expect(loaded.enemies.get('slime')?.isBoss).toBe(false);
    expect(loaded.enemies.get('goblin-chief')?.isBoss).toBe(true);

    // Waves
    expect(loaded.waves.size).toBe(3);
    expect(loaded.waves.get('wave-1')?.enemies.length).toBeGreaterThan(0);

    // Stages
    expect(loaded.stages.size).toBe(2);
    expect(loaded.stages.get('stage-1')?.boss).toBe('goblin-chief');
    expect(loaded.stages.get('stage-1')?.unlocksStageId).toBe('stage-2');
    expect(loaded.stages.get('stage-2')?.id).toBe('stage-2');

    // Raw preservation
    expect(loaded.raw).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 2. Cross-reference validation failures (each names offending id)
  // -------------------------------------------------------------------------
  describe('cross-reference validation errors', () => {
    it('fails with ContentValidationError when wave references a nonexistent enemy', () => {
      const bad = cloneStarter();
      bad.waves[0].enemies.push({ enemyId: 'missing-enemy-xyz', count: 1 });

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-enemy-xyz');
        expect(valErr.message).toContain(bad.waves[0].id);
      }
    });

    it('fails with ContentValidationError when stage references a nonexistent wave', () => {
      const bad = cloneStarter();
      bad.stages[0].waves.push('missing-wave-xyz');

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-wave-xyz');
        expect(valErr.message).toContain(bad.stages[0].id);
      }
    });

    it('fails with ContentValidationError when stage boss references a nonexistent enemy', () => {
      const bad = cloneStarter();
      bad.stages[0].boss = 'missing-boss-xyz';

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-boss-xyz');
        expect(valErr.message).toContain(bad.stages[0].id);
      }
    });

    it('fails with ContentValidationError when stage boss references a non-boss enemy', () => {
      const bad = cloneStarter();
      bad.stages[0].boss = 'slime'; // slime has isBoss: false

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('slime');
        expect(valErr.message).toContain(bad.stages[0].id);
      }
    });

    it('fails with ContentValidationError when enemy references a nonexistent effect', () => {
      const bad = cloneStarter();
      bad.enemies[0].onHitEffects = ['missing-effect-xyz'];

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-effect-xyz');
        expect(valErr.message).toContain(bad.enemies[0].id);
      }
    });

    it('fails with ContentValidationError when unlocksStageId points to a nonexistent stage', () => {
      const bad = cloneStarter();
      bad.stages[0].unlocksStageId = 'missing-stage-xyz';

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-stage-xyz');
        expect(valErr.message).toContain(bad.stages[0].id);
      }
    });

    it('fails with ContentValidationError when playerBaseOnHitEffects references a nonexistent effect', () => {
      const bad = cloneStarter();
      bad.playerBaseOnHitEffects.push('missing-player-effect-xyz');

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-player-effect-xyz');
        expect(valErr.message).toContain('playerBaseOnHitEffects');
      }
    });

    it('fails with ContentValidationError when startingStageId points to a nonexistent stage', () => {
      const bad = cloneStarter();
      bad.startingStageId = 'missing-stage-xyz';

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('missing-stage-xyz');
        expect(valErr.message).toContain('startingStageId');
      }
    });

    it('fails with ContentValidationError on duplicate enemy ids', () => {
      const bad = cloneStarter();
      bad.enemies.push({ ...bad.enemies[0] }); // duplicate 'slime'

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('slime');
      }
    });

    it('fails with ContentValidationError when boss is placed in a regular wave', () => {
      const bad = cloneStarter();
      bad.waves[0].enemies.push({ enemyId: 'goblin-chief', count: 1 });

      expect(() => loadContent(bad)).toThrowError(ContentValidationError);
      try {
        loadContent(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ContentValidationError);
        const valErr = err as ContentValidationError;
        expect(valErr.message).toContain('goblin-chief');
        expect(valErr.message).toContain(bad.waves[0].id);
      }
    });

    it('fails with ContentValidationError on duplicate effect, wave, and stage ids', () => {
      const badEffects = cloneStarter();
      badEffects.effects.push({ ...badEffects.effects[0] });
      expect(() => loadContent(badEffects)).toThrowError(/Duplicate effect id: 'burn'/);

      const badWaves = cloneStarter();
      badWaves.waves.push({ ...badWaves.waves[0] });
      expect(() => loadContent(badWaves)).toThrowError(/Duplicate wave id: 'wave-1'/);

      const badStages = cloneStarter();
      badStages.stages.push({ ...badStages.stages[0] });
      expect(() => loadContent(badStages)).toThrowError(/Duplicate stage id: 'stage-1'/);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Schema-level failures
  // -------------------------------------------------------------------------
  describe('schema-level failures', () => {
    it('fails on negative maxHp', () => {
      const bad = cloneStarter();
      bad.enemies[0].maxHp = -10;
      expect(() => loadContent(bad)).toThrow();
      expect(() => enemyDefSchema.parse(bad.enemies[0])).toThrow();
    });

    it('fails on attackInterval of 0', () => {
      const bad = cloneStarter();
      bad.enemies[0].attackInterval = 0;
      expect(() => loadContent(bad)).toThrow();
      expect(() => enemyDefSchema.parse(bad.enemies[0])).toThrow();
    });

    it('fails on empty wave', () => {
      const bad = cloneStarter();
      bad.waves[0].enemies = [];
      expect(() => loadContent(bad)).toThrow();
      expect(() => waveDefSchema.parse(bad.waves[0])).toThrow();
    });

    it('fails when damageOverTime effect is missing tickInterval', () => {
      const bad = cloneStarter();
      // @ts-expect-error deleting required property
      delete bad.effects[0].tickInterval;
      expect(() => loadContent(bad)).toThrow();
      expect(() => damageOverTimeEffectDefSchema.parse(bad.effects[0])).toThrow();
    });

    it('fails when stun effect carries tickInterval', () => {
      const bad = cloneStarter();
      // @ts-expect-error adding unrecognized property to strict stun schema
      bad.effects[1].tickInterval = 1;
      expect(() => loadContent(bad)).toThrow();
      expect(() => stunEffectDefSchema.parse(bad.effects[1])).toThrow();
    });

    it('defaults maxStacks to 3 and validates custom maxStacks', () => {
      const loaded = loadContent(starterContent);
      expect(loaded.effects.get('burn')?.maxStacks).toBe(3);
      expect(loaded.effects.get('stun')?.maxStacks).toBe(3);

      const custom = cloneStarter();
      custom.effects[0].maxStacks = 5;
      const parsed = loadContent(custom);
      expect(parsed.effects.get('burn')?.maxStacks).toBe(5);

      const invalidNegative = cloneStarter();
      invalidNegative.effects[0].maxStacks = -1;
      expect(() => loadContent(invalidNegative)).toThrow();

      const invalidFloat = cloneStarter();
      invalidFloat.effects[0].maxStacks = 2.5;
      expect(() => loadContent(invalidFloat)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Multiple errors reported in one thrown error
  // -------------------------------------------------------------------------
  it('reports multiple separate problems in one ContentValidationError', () => {
    const bad = cloneStarter();
    bad.enemies[0].onHitEffects = ['ghost-effect-1'];
    bad.stages[0].waves.push('ghost-wave-1');
    bad.stages[0].unlocksStageId = 'ghost-stage-1';

    try {
      loadContent(bad);
      expect.unreachable('Should have thrown ContentValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ContentValidationError);
      const valErr = err as ContentValidationError;
      expect(valErr.errors.length).toBe(3);
      expect(valErr.message).toContain('ghost-effect-1');
      expect(valErr.message).toContain('ghost-wave-1');
      expect(valErr.message).toContain('ghost-stage-1');
    }
  });
});
