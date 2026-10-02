import { describe, expect, it } from 'vitest';
import { PULL_MAX, PULL_RANGE, SCROLL_END, SCROLL_START, scrollSpeed, whirlpoolPull } from './whirlpool';

describe('scrollSpeed', () => {
  it('starts gentle and builds to nearly the player\'s running speed', () => {
    expect(scrollSpeed(0)).toBe(SCROLL_START);
    expect(scrollSpeed(1)).toBe(SCROLL_END);
    expect(SCROLL_END).toBeGreaterThanOrEqual(85);
    let last = 0;
    for (let p = 0; p <= 1; p += 0.1) {
      expect(scrollSpeed(p)).toBeGreaterThanOrEqual(last);
      last = scrollSpeed(p);
    }
  });

  it('clamps outside 0..1', () => {
    expect(scrollSpeed(-1)).toBe(SCROLL_START);
    expect(scrollSpeed(5)).toBe(SCROLL_END);
  });
});

describe('whirlpoolPull', () => {
  it('does nothing far from the whirlpool', () => {
    expect(whirlpoolPull(PULL_RANGE)).toBe(0);
    expect(whirlpoolPull(500)).toBe(0);
  });

  it('pulls leftwards, harder the closer you are', () => {
    expect(whirlpoolPull(PULL_RANGE / 2)).toBeLessThan(0);
    expect(whirlpoolPull(20)).toBeLessThan(whirlpoolPull(100));
    expect(whirlpoolPull(0)).toBe(-PULL_MAX);
    expect(whirlpoolPull(-30)).toBe(-PULL_MAX);
  });
});
