import { describe, expect, it } from 'vitest';
import { HUNCH_SCALE, HALL_SCALE, Suspicion, WALK_SPEED_LIMIT, looksSuspicious } from './disguise';

describe('looksSuspicious', () => {
  it('a hunched beggar is never suspicious, however he moves', () => {
    expect(looksSuspicious(90, true, true)).toBe(false);
    expect(looksSuspicious(0, false, true)).toBe(false);
  });

  it('walking tall and purposeful, or jumping, is suspicious', () => {
    expect(looksSuspicious(WALK_SPEED_LIMIT + 5, true, false)).toBe(true);
    expect(looksSuspicious(0, false, false)).toBe(true);
  });

  it('standing still or shuffling slowly is not', () => {
    expect(looksSuspicious(0, true, false)).toBe(false);
    expect(looksSuspicious(40, true, false)).toBe(false);
  });

  it('the hunched shuffle is under the limit, and the normal hall walk is over it', () => {
    expect(90 * HUNCH_SCALE).toBeLessThan(WALK_SPEED_LIMIT);
    expect(90 * HALL_SCALE).toBeGreaterThan(WALK_SPEED_LIMIT);
  });
});

describe('Suspicion', () => {
  it('fills while someone watches, and blows the disguise at full', () => {
    const s = new Suspicion();
    for (let i = 0; i < 59; i++) s.update(1 / 60, true);
    expect(s.blown).toBe(false);
    for (let i = 0; i < 3; i++) s.update(1 / 60, true);
    expect(s.blown).toBe(true);
  });

  it('drains when unobserved, but more slowly than it fills', () => {
    const s = new Suspicion();
    for (let i = 0; i < 30; i++) s.update(1 / 60, true);
    const peak = s.value;
    for (let i = 0; i < 30; i++) s.update(1 / 60, false);
    expect(s.value).toBeLessThan(peak);
    expect(s.value).toBeGreaterThan(0);
  });

  it('reset clears it', () => {
    const s = new Suspicion();
    s.update(2, true);
    s.reset();
    expect(s.value).toBe(0);
    expect(s.blown).toBe(false);
  });
});
