import { describe, expect, it } from 'vitest';
import { HUNCH_SCALE, HALL_SCALE, STOOP_DRAIN, Stamina, Suspicion, WALK_SPEED_LIMIT, looksSuspicious } from './disguise';

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

describe('Stamina (how long an old man can stay stooped)', () => {
  it('lets you stoop at first, and reports whether you are actually stooping', () => {
    const s = new Stamina();
    expect(s.update(1 / 60, true)).toBe(true);
    expect(s.update(1 / 60, false)).toBe(false);
  });

  it('drains while stooped, and runs out after about its drain time', () => {
    const s = new Stamina();
    let stoopedFor = 0;
    while (s.update(1 / 60, true) && stoopedFor < 20) stoopedFor += 1 / 60; // the first unbroken stoop
    expect(stoopedFor).toBeGreaterThan(STOOP_DRAIN - 0.2);
    expect(stoopedFor).toBeLessThan(STOOP_DRAIN + 0.5);
    expect(s.exhausted).toBe(true);
  });

  it('once exhausted you cannot stoop until you have recovered a little', () => {
    const s = new Stamina();
    for (let i = 0; i < 60 * 20 && !s.exhausted; i++) s.update(1 / 60, true);
    expect(s.exhausted).toBe(true);
    expect(s.update(1 / 60, true)).toBe(false); // still too tired
    for (let i = 0; i < 60 * 2; i++) s.update(1 / 60, false); // stand and rest
    expect(s.exhausted).toBe(false);
    expect(s.update(1 / 60, true)).toBe(true);
  });

  it('refills while standing, but more slowly than it drained', () => {
    const s = new Stamina();
    for (let i = 0; i < 60 * 3; i++) s.update(1 / 60, true); // half gone
    const low = s.value;
    for (let i = 0; i < 60 * 1; i++) s.update(1 / 60, false);
    expect(s.value).toBeGreaterThan(low);
    expect(s.value - low).toBeLessThan(0.5); // refilling at a quarter of full per second
    expect(s.value).toBeLessThan(1);
  });

  it('reset refills it', () => {
    const s = new Stamina();
    for (let i = 0; i < 60 * 8; i++) s.update(1 / 60, true);
    s.reset();
    expect(s.value).toBe(1);
    expect(s.exhausted).toBe(false);
  });
});
