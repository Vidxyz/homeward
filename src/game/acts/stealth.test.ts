import { describe, expect, it } from 'vitest';
import { makeWorld } from '../engine/world';
import { parseLevel } from '../level';
import { canSee, isFullyInShadow, isHiddenInShadow, lineOfSight } from './stealth';

function worldOf(rows: string[]) {
  return makeWorld(parseLevel(rows));
}

// 20 tiles wide, 4 tall. Wall at column 10, rows 0-2.
const open = worldOf(['S..................G', '....................', '....................', '####################']);
const walled = worldOf(['S.........#........G', '..........#.........', '..........#.........', '####################']);

const eye = { x: 40, y: 24 };

describe('lineOfSight', () => {
  it('is clear across open ground', () => {
    expect(lineOfSight(open, eye, { x: 200, y: 24 })).toBe(true);
  });

  it('is blocked by a solid tile in the way', () => {
    expect(lineOfSight(walled, eye, { x: 280, y: 24 })).toBe(false);
  });

  it('can pass over a wall when the ray goes above it', () => {
    expect(lineOfSight(walled, { x: 40, y: 56 }, { x: 280, y: 56 })).toBe(false);
    expect(lineOfSight(walled, { x: 40, y: 8 }, { x: 80, y: 8 })).toBe(true);
  });
});

describe('canSee', () => {
  it('sees a target in front, inside range', () => {
    expect(canSee(open, eye, 1, { x: 140, y: 24 }, 150, false)).toBe(true);
  });

  it('does not see a target behind', () => {
    expect(canSee(open, eye, 1, { x: 10, y: 24 }, 150, false)).toBe(false);
    expect(canSee(open, eye, -1, { x: 140, y: 24 }, 150, false)).toBe(false);
  });

  it('does not see a target out of range', () => {
    expect(canSee(open, eye, 1, { x: 300, y: 24 }, 150, false)).toBe(false);
  });

  it('does not see a hidden target', () => {
    expect(canSee(open, eye, 1, { x: 140, y: 24 }, 150, true)).toBe(false);
  });

  it('does not see through walls', () => {
    expect(canSee(walled, eye, 1, { x: 200, y: 24 }, 300, false)).toBe(false);
  });
});

describe('isFullyInShadow', () => {
  // Row 0: shadow tiles at columns 2-4 (x 32..80).
  const level = parseLevel(['S.HHH..G', '########']);

  it('is true when the whole body is inside shadow tiles', () => {
    expect(isFullyInShadow(level, { x: 40, y: 2, w: 10, h: 14 })).toBe(true);
    expect(isFullyInShadow(level, { x: 32, y: 2, w: 10, h: 14 })).toBe(true);
  });

  it('is false when any part of the body sticks out of the shadow', () => {
    expect(isFullyInShadow(level, { x: 28, y: 2, w: 10, h: 14 })).toBe(false); // left edge in light
    expect(isFullyInShadow(level, { x: 74, y: 2, w: 10, h: 14 })).toBe(false); // right edge in light
  });

  it('is false in plain light', () => {
    expect(isFullyInShadow(level, { x: 100, y: 2, w: 10, h: 14 })).toBe(false);
  });
});

describe('isHiddenInShadow', () => {
  const level = parseLevel(['S.HHH..G', '########']);
  const inside = { x: 40, y: 2, w: 10, h: 14 };

  it('hides a player who is still or creeping inside a shadow', () => {
    expect(isHiddenInShadow(level, inside, 0, false)).toBe(true);
    expect(isHiddenInShadow(level, inside, 36, false)).toBe(true);
  });

  it('does not hide a player who is running through a shadow', () => {
    expect(isHiddenInShadow(level, inside, 90, false)).toBe(false);
  });

  it('does not hide a player in a shadow that a brazier is lighting up', () => {
    expect(isHiddenInShadow(level, inside, 0, true)).toBe(false);
  });

  it('does not hide a player who is not fully inside', () => {
    expect(isHiddenInShadow(level, { x: 28, y: 2, w: 10, h: 14 }, 0, false)).toBe(false);
  });
});
