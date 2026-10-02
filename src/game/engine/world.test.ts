import { describe, expect, it } from 'vitest';
import { parseLevel } from '../level';
import { makeWorld } from './world';

const level = parseLevel(['S.#G', '####']);

describe('makeWorld', () => {
  it('reads solids and hazards from the tiles', () => {
    const w = makeWorld(level);
    expect(w.solid(2, 0)).toBe(true);
    expect(w.solid(1, 0)).toBe(false);
  });

  it('adds dynamic solids from an override without hiding tile solids', () => {
    let on = false;
    const w = makeWorld(level, { solidOverride: (c, r) => on && c === 1 && r === 0 });
    expect(w.solid(1, 0)).toBe(false);
    on = true;
    expect(w.solid(1, 0)).toBe(true);
    expect(w.solid(2, 0)).toBe(true);
  });
});
