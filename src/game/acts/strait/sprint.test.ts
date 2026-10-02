import { describe, expect, it } from 'vitest';
import { DRAIN_TIME, SPRINT_SCALE, Sprint, WINDED_SCALE, WINDED_TIME } from './sprint';

const DT = 1 / 60;

describe('Sprint', () => {
  it('runs at normal speed when not sprinting', () => {
    const s = new Sprint();
    expect(s.update(DT, false)).toBe(1);
  });

  it('runs faster while sprinting, and the stamina drains', () => {
    const s = new Sprint();
    expect(s.update(DT, true)).toBe(SPRINT_SCALE);
    for (let i = 0; i < 60; i++) s.update(DT, true);
    expect(s.value).toBeLessThan(1);
    expect(SPRINT_SCALE).toBeGreaterThan(1.2);
  });

  it('runs out after about its drain time, then slows you down for a while', () => {
    const s = new Sprint();
    let sprintFor = 0;
    while (s.update(DT, true) === SPRINT_SCALE && sprintFor < 10) sprintFor += DT;
    expect(sprintFor).toBeGreaterThan(DRAIN_TIME - 0.2);
    expect(sprintFor).toBeLessThan(DRAIN_TIME + 0.3);
    expect(s.winded).toBe(true);
    expect(s.update(DT, true)).toBe(WINDED_SCALE); // holding the button does not help
    expect(WINDED_SCALE).toBeLessThan(0.9);
  });

  it('is winded only briefly, then back to normal speed', () => {
    const s = new Sprint();
    while (!s.winded) s.update(DT, true);
    let windedFor = 0;
    while (s.update(DT, false) === WINDED_SCALE && windedFor < 10) windedFor += DT;
    expect(windedFor).toBeGreaterThan(WINDED_TIME - 0.2);
    expect(windedFor).toBeLessThan(WINDED_TIME + 0.2);
    expect(s.update(DT, false)).toBe(1);
  });

  it('refills while you are not sprinting, but more slowly than it drains', () => {
    const s = new Sprint();
    for (let i = 0; i < 60; i++) s.update(DT, true); // 1 s: about half gone
    const low = s.value;
    for (let i = 0; i < 60; i++) s.update(DT, false);
    expect(s.value).toBeGreaterThan(low);
    expect(s.value).toBeLessThan(1);
  });

  it('can sprint again once it has recovered a little, but not while winded', () => {
    const s = new Sprint();
    while (!s.winded) s.update(DT, true);
    for (let i = 0; i < 60 * 6; i++) s.update(DT, false); // a long rest
    expect(s.update(DT, true)).toBe(SPRINT_SCALE);
  });

  it('reset refills it and clears being winded', () => {
    const s = new Sprint();
    while (!s.winded) s.update(DT, true);
    s.reset();
    expect(s.value).toBe(1);
    expect(s.winded).toBe(false);
  });
});
