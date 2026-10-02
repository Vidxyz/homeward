import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../pathGen';
import { chooseKind, planVolley, volleyEvery, warnTime } from './strikes';

describe('planVolley', () => {
  it('aims at where a running player will be when the strike lands', () => {
    expect(planVolley(500, 90, 0.9, 'aimed')).toEqual([500 + 81]);
  });

  it('lands on a player who stands still (no hiding by stopping)', () => {
    expect(planVolley(500, 0, 0.9, 'aimed')).toEqual([500]);
  });

  it('a pincer flanks the aimed spot and leaves the middle clear', () => {
    const [a, b] = planVolley(500, 0, 0.9, 'pincer');
    expect(a).toBeLessThan(500);
    expect(b).toBeGreaterThan(500);
    expect(500 - a).toBeCloseTo(b - 500);
    expect(b - a).toBeGreaterThan(40); // wide enough to stand between them
  });

  it('a comb has three heads including the aimed spot, with safe lanes between', () => {
    const xs = planVolley(500, 0, 0.9, 'comb');
    expect(xs).toHaveLength(3);
    expect(xs).toContain(500);
    const sorted = [...xs].sort((p, q) => p - q);
    expect(sorted[1] - sorted[0]).toBeGreaterThan(28);
  });
});

describe('difficulty over the act', () => {
  it('strikes come faster and the warning gets shorter', () => {
    expect(volleyEvery(1)).toBeLessThan(volleyEvery(0));
    expect(warnTime(0.9)).toBeLessThan(warnTime(0.1));
  });

  it('starts with single aimed strikes and escalates to patterns', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 50; i++) expect(chooseKind(0.05, rng)).toBe('aimed');
    const late = new Set(Array.from({ length: 200 }, () => chooseKind(0.9, rng)));
    expect(late.has('pincer')).toBe(true);
    expect(late.has('comb')).toBe(true);
  });
});
