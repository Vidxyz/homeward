import { describe, expect, it } from 'vitest';
import { AWAKE_TIME, SNORE_RADIUS, makeGiant, nudgeGiant, updateGiant } from './giants';

describe('sleeping giant', () => {
  it('stays asleep for noises that are quiet or far away', () => {
    const g = makeGiant(500);
    expect(nudgeGiant(g, 500 + SNORE_RADIUS + 50, 200)).toBe(false);
    expect(nudgeGiant(g, 520, 0)).toBe(false);
    expect(g.awake).toBe(false);
  });

  it('wakes, facing the noise, when something loud happens nearby', () => {
    const g = makeGiant(500);
    expect(nudgeGiant(g, 450, 190)).toBe(true);
    expect(g.awake).toBe(true);
    expect(g.dir).toBe(-1);
  });

  it('only reports the moment of waking once', () => {
    const g = makeGiant(500);
    expect(nudgeGiant(g, 520, 190)).toBe(true);
    expect(nudgeGiant(g, 520, 190)).toBe(false);
  });

  it('goes back to sleep after a while', () => {
    const g = makeGiant(500);
    nudgeGiant(g, 520, 190);
    for (let t = 0; t < AWAKE_TIME - 0.5; t += 0.1) updateGiant(g, 0.1);
    expect(g.awake).toBe(true);
    for (let t = 0; t < 1; t += 0.1) updateGiant(g, 0.1);
    expect(g.awake).toBe(false);
  });
});
