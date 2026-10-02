import { describe, expect, it } from 'vitest';
import type { SfxName } from '../../types';
import { mulberry32 } from '../pathGen';
import { Cyclops } from './cyclops';

const BOUNDS = { min: 128, max: 2048 };
const make = (x = 480) => new Cyclops(x, BOUNDS, mulberry32(7));
const step = (c: Cyclops, seconds: number, sfx: SfxName[] = []) => {
  for (let t = 0; t < seconds; t += 1 / 60) c.update(1 / 60, sfx);
};

describe('Cyclops (sighted)', () => {
  it('paces erratically but stays inside his bounds', () => {
    const c = make();
    let last = c.dir;
    let changes = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 60 * 120; i++) {
      c.update(1 / 60, []);
      if (c.dir !== last) {
        changes++;
        last = c.dir;
      }
      min = Math.min(min, c.x);
      max = Math.max(max, c.x);
    }
    expect(changes).toBeGreaterThanOrEqual(6);
    expect(min).toBeGreaterThanOrEqual(BOUNDS.min - 0.01);
    expect(max).toBeLessThanOrEqual(BOUNDS.max + 0.01);
  });

  it('goes to investigate a noise he can hear, and ignores one that is too far away', () => {
    const c = make(800);
    c.hear(1200);
    expect(c.mood).toBe('investigate');
    step(c, 1);
    expect(c.x).toBeGreaterThan(830);

    const far = make(200);
    far.hear(1800);
    expect(far.mood).toBe('walk');
  });

  it('can never grab anyone while he can see', () => {
    const c = make(500);
    expect(c.grabs(500)).toBe(false);
  });
});

describe('Cyclops (blinded)', () => {
  const blinded = (x = 1280) => {
    const c = make();
    c.blindHim(x, { min: 1280, max: 2900 });
    return c;
  };

  it('is stunned and stays put at first', () => {
    const c = blinded();
    expect(c.blind).toBe(true);
    expect(c.mood).toBe('stunned');
    const x0 = c.x;
    step(c, 1.2);
    expect(c.x).toBe(x0);
    expect(c.grabs(x0)).toBe(false); // he cannot grab while stunned
  });

  it('recovers and staggers around slowly', () => {
    const c = blinded();
    step(c, 3.2);
    expect(c.mood).not.toBe('stunned');
    const x0 = c.x;
    step(c, 6);
    expect(Math.abs(c.x - x0)).toBeGreaterThan(0);
  });

  it('hunts towards a noise it hears, then searches around where it came from', () => {
    const c = blinded();
    step(c, 3);
    c.x = 1500;
    c.hear(1700, 300);
    expect(c.mood).toBe('hunt');
    step(c, 1);
    expect(c.x).toBeGreaterThan(1540);
    step(c, 5);
    expect(['search', 'walk', 'pause']).toContain(c.mood);
  });

  it('ignores noise outside the range it was given', () => {
    const c = blinded();
    step(c, 3);
    c.x = 1500;
    c.hear(2500, 300);
    expect(c.mood).not.toBe('hunt');
  });

  it('grabs anyone who is right next to him once he has recovered', () => {
    const c = blinded();
    step(c, 3);
    expect(c.grabs(c.x + 10)).toBe(true);
    expect(c.grabs(c.x + 60)).toBe(false);
  });

  it('stays inside his bounds', () => {
    const c = blinded();
    for (let i = 0; i < 60 * 90; i++) {
      c.update(1 / 60, []);
      if (i % 600 === 0) c.hear(1280 + (i % 1200), 5000);
      expect(c.x).toBeGreaterThanOrEqual(1280 - 0.01);
      expect(c.x).toBeLessThanOrEqual(2900 + 0.01);
    }
  });
});
