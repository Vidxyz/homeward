import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../pathGen';
import { JEERS, SUITOR_RANGE, makeSuitor, updateSuitor } from './suitors';

describe('suitors', () => {
  it('look one way, then the other, at uneven intervals', () => {
    const rng = mulberry32(3);
    const s = makeSuitor(500, rng);
    const turns: number[] = [];
    let last = s.dir;
    let t = 0;
    for (let i = 0; i < 60 * 60; i++) {
      updateSuitor(s, 1 / 60, rng);
      t += 1 / 60;
      if (s.dir !== last) {
        turns.push(t);
        last = s.dir;
      }
    }
    expect(turns.length).toBeGreaterThanOrEqual(10);
    const gaps = turns.slice(1).map((v, i) => v - turns[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1.5);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(5);
    expect(new Set(gaps.map((g) => g.toFixed(1))).size).toBeGreaterThan(3); // not a fixed rhythm
  });

  it('jeer now and then, always with one of the known lines', () => {
    const rng = mulberry32(4);
    const s = makeSuitor(500, rng);
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 120; i++) {
      updateSuitor(s, 1 / 60, rng);
      if (s.jeer > 0) seen.add(s.jeerText);
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
    for (const j of seen) expect(JEERS).toContain(j);
  });

  it('see a good way ahead but not forever', () => {
    expect(SUITOR_RANGE).toBeGreaterThan(80);
    expect(SUITOR_RANGE).toBeLessThan(200);
  });
});
