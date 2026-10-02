import { describe, expect, it } from 'vitest';
import { makeWorld } from '../engine/world';
import { parseLevel } from '../level';
import { canSee, lineOfSight } from './stealth';

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
