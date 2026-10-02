import { describe, expect, it } from 'vitest';
import { overlaps } from './types';

describe('overlaps', () => {
  it('is true for intersecting rects', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it('is false for touching or separate rects', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 30, w: 10, h: 10 })).toBe(false);
  });
});
