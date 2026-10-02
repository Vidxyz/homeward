import { describe, expect, it } from 'vitest';
import { LevelBuilder } from './levelBuilder';

describe('LevelBuilder', () => {
  it('starts empty and paints rects', () => {
    const b = new LevelBuilder(6, 3);
    b.rect(1, 1, 3, 2, '#');
    expect(b.toRows()).toEqual(['......', '.###..', '.###..']);
  });

  it('clips puts and rects that fall outside the grid', () => {
    const b = new LevelBuilder(3, 2);
    b.put(-1, 0, 'x').put(3, 0, 'x').put(0, 5, 'x').rect(2, 1, 5, 5, '#');
    expect(b.toRows()).toEqual(['...', '..#']);
  });

  it('trims columns on output', () => {
    const b = new LevelBuilder(6, 1);
    b.put(1, 0, '#');
    expect(b.toRows(3)).toEqual(['.#.']);
  });
});
