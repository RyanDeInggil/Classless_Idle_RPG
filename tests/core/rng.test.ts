import { describe, it, expect } from 'vitest';
import { createRng, nextFloat, nextInt, nextBool } from '../../src/core/rng.js';

describe('rng', () => {
  describe('nextFloat', () => {
    it('produces values in [0, 1)', () => {
      let rng = createRng(12345);
      for (let i = 0; i < 1000; i++) {
        const [val, next] = nextFloat(rng);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
        rng = next;
      }
    });

    it('is deterministic — same seed gives same sequence', () => {
      const [a] = nextFloat(createRng(99));
      const [b] = nextFloat(createRng(99));
      expect(a).toBe(b);
    });

    it('different seeds produce different values', () => {
      const [a] = nextFloat(createRng(1));
      const [b] = nextFloat(createRng(2));
      expect(a).not.toBe(b);
    });

    it('does not mutate input state', () => {
      const rng = createRng(42);
      const [, next1] = nextFloat(rng);
      const [, next2] = nextFloat(rng); // call again on same input
      // Both calls on same seed must yield same next state
      expect(next1).toEqual(next2);
    });

    it('advances state — consecutive calls differ', () => {
      const rng = createRng(7);
      const [a, rng2] = nextFloat(rng);
      const [b] = nextFloat(rng2);
      expect(a).not.toBe(b);
    });
  });

  describe('nextInt', () => {
    it('stays within [min, max] inclusive across many samples', () => {
      let rng = createRng(7);
      for (let i = 0; i < 1000; i++) {
        const [val, next] = nextInt(rng, 1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        expect(Number.isInteger(val)).toBe(true);
        rng = next;
      }
    });

    it('covers min and max (statistical, very likely with 5000 samples)', () => {
      let rng = createRng(101);
      const seen = new Set<number>();
      for (let i = 0; i < 5000; i++) {
        const [val, next] = nextInt(rng, 1, 6);
        seen.add(val);
        rng = next;
      }
      expect(seen.has(1)).toBe(true);
      expect(seen.has(6)).toBe(true);
    });
  });

  describe('nextBool', () => {
    it('always true when probability is 1', () => {
      let rng = createRng(1);
      for (let i = 0; i < 100; i++) {
        const [val, next] = nextBool(rng, 1.0);
        expect(val).toBe(true);
        rng = next;
      }
    });

    it('always false when probability is 0', () => {
      let rng = createRng(1);
      for (let i = 0; i < 100; i++) {
        const [val, next] = nextBool(rng, 0);
        expect(val).toBe(false);
        rng = next;
      }
    });
  });

  describe('serialization', () => {
    it('survives JSON round trip and produces identical random sequence', () => {
      let rngOrig = createRng(12345);
      // Advance a few steps
      for (let i = 0; i < 5; i++) {
        [, rngOrig] = nextFloat(rngOrig);
      }

      // JSON round trip
      const serialized = JSON.stringify(rngOrig);
      let rngRestored = JSON.parse(serialized);

      // Verify identical subsequent outputs over 50 samples
      for (let i = 0; i < 50; i++) {
        const [valOrig, nextOrig] = nextFloat(rngOrig);
        const [valRestored, nextRestored] = nextFloat(rngRestored);
        expect(valRestored).toBe(valOrig);
        rngOrig = nextOrig;
        rngRestored = nextRestored;
      }
    });
  });
});
