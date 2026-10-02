import { describe, expect, it } from 'vitest';
import { VIEW_W } from '../types';
import { Camera } from './camera';

const box = (x: number, y = 0) => ({ x, y, w: 10, h: 14 });

describe('Camera', () => {
  it('clamps at the left edge', () => {
    const c = new Camera(100, 12);
    c.snapTo(box(0));
    expect(c.x).toBe(0);
  });

  it('clamps at the right edge', () => {
    const c = new Camera(100, 12);
    c.snapTo(box(100 * 16));
    expect(c.x).toBe(100 * 16 - VIEW_W);
  });

  it('eases towards the target when following', () => {
    const c = new Camera(100, 12);
    c.snapTo(box(400));
    const before = c.x;
    for (let i = 0; i < 5; i++) c.follow(box(600));
    expect(c.x).toBeGreaterThan(before);
    expect(c.x).toBeLessThan(600);
    expect(c.px).toBeLessThan(c.x);
  });

  it('setX clamps and keeps the previous position for interpolation', () => {
    const c = new Camera(100, 12);
    c.snapX(100);
    c.setX(100 * 16 + 500);
    expect(c.x).toBe(100 * 16 - VIEW_W);
    expect(c.px).toBe(100);
  });

  it('does not scroll vertically when the level is exactly one screen tall', () => {
    const c = new Camera(100, 12);
    c.snapTo(box(300, 100));
    expect(c.y).toBe(0);
  });
});
