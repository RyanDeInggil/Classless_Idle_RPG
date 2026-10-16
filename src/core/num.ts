/**
 * Arithmetic helpers wrapping native numbers.
 * All arithmetic in src/core must go through these so a future
 * big-number library swap is isolated to this one file (D4).
 */

export function add(a: number, b: number): number {
  return a + b;
}

export function sub(a: number, b: number): number {
  return a - b;
}

export function mul(a: number, b: number): number {
  return a * b;
}

export function div(a: number, b: number): number {
  return a / b;
}

/** Exponentiation. `pow(x, 0)` is 1, `pow(x, 1)` is x. */
export function pow(base: number, exponent: number): number {
  return base ** exponent;
}

export function round(n: number): number {
  return Math.round(n);
}

export function floor(n: number): number {
  return Math.floor(n);
}

/** Ordering comparison: -1 | 0 | 1 */
export function cmp(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
