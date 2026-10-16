import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, pow, round, floor, cmp, clamp } from '../../src/core/num.js';

describe('num', () => {
  describe('add', () => {
    it('adds two positive numbers', () => expect(add(2, 3)).toBe(5));
    it('handles negatives', () => expect(add(-4, 7)).toBe(3));
    it('handles zero', () => expect(add(0, 0)).toBe(0));
  });

  describe('sub', () => {
    it('subtracts', () => expect(sub(10, 4)).toBe(6));
    it('can go negative', () => expect(sub(3, 5)).toBe(-2));
  });

  describe('mul', () => {
    it('multiplies', () => expect(mul(3, 4)).toBe(12));
    it('handles zero', () => expect(mul(0, 99)).toBe(0));
    it('handles floats', () => expect(mul(1.5, 2)).toBeCloseTo(3));
  });

  describe('div', () => {
    it('divides evenly', () => expect(div(10, 2)).toBe(5));
    it('handles fractional results', () => expect(div(5, 2)).toBe(2.5));
  });

  describe('round', () => {
    it('rounds to nearest integer', () => {
      expect(round(67.5)).toBe(68);
      expect(round(67.4)).toBe(67);
      expect(round(50)).toBe(50);
    });
  });

  describe('floor', () => {
    it('floors to integer', () => {
      expect(floor(3.9)).toBe(3);
      expect(floor(3.1)).toBe(3);
    });
  });

  describe('pow', () => {
    it('returns 1 for exponent 0', () => expect(pow(7, 0)).toBe(1));
    it('returns the base for exponent 1', () => expect(pow(3, 1)).toBe(3));
    it('raises to positive integer powers', () => expect(pow(2, 10)).toBe(1024));
    it('handles fractional bases used by stat growth', () => {
      // Reference value from nine repeated multiplications (1.08^9).
      expect(pow(1.08, 9).toFixed(12)).toBe('1.999004627104');
    });
  });

  describe('cmp', () => {
    it('returns -1 when a < b', () => expect(cmp(1, 2)).toBe(-1));
    it('returns 0 when equal', () => expect(cmp(5, 5)).toBe(0));
    it('returns 1 when a > b', () => expect(cmp(9, 3)).toBe(1));
  });

  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
    it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
    it('passes through when in range', () => expect(clamp(5, 0, 10)).toBe(5));
    it('passes through when exactly at min', () => expect(clamp(0, 0, 10)).toBe(0));
    it('passes through when exactly at max', () => expect(clamp(10, 0, 10)).toBe(10));
  });
});
