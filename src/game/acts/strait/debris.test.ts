import { describe, expect, it } from 'vitest';
import { logBox, spawnLog, updateLog } from './debris';

describe('thrown wreckage', () => {
  it('appears off the right edge at the height of the player\'s feet', () => {
    const l = spawnLog(1000, 150);
    expect(l.x).toBeGreaterThan(1000 + 320);
    expect(l.y + l.h).toBeCloseTo(150, 0);
    expect(l.vx).toBeLessThan(0);
  });

  it('only warns at first: no hitbox and no movement', () => {
    const l = spawnLog(1000, 150);
    const x0 = l.x;
    updateLog(l, 0.3);
    expect(logBox(l)).toBeNull();
    expect(l.x).toBe(x0);
  });

  it('then flies left and becomes dangerous', () => {
    const l = spawnLog(1000, 150);
    const x0 = l.x;
    updateLog(l, 0.9);
    updateLog(l, 0.5);
    expect(l.x).toBeLessThan(x0);
    expect(logBox(l)).not.toBeNull();
  });
});
