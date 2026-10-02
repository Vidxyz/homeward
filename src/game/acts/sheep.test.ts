import { describe, expect, it } from 'vitest';
import { resolveSheep } from './sheep';

const sheep = { x: 100, y: 150, w: 14, h: 10 };
const player = (x: number, y: number) => ({ x, y, w: 10, h: 14, vx: 0, vy: 0, onGround: false });

describe('resolveSheep', () => {
  it('ignores a player who is not touching', () => {
    const p = player(50, 146);
    expect(resolveSheep(p, sheep)).toBe('none');
    expect(p.x).toBe(50);
  });

  it('blocks a player walking into the sheep from the left', () => {
    const p = player(94, 146);
    p.vx = 90;
    expect(resolveSheep(p, sheep)).toBe('side');
    expect(p.x).toBe(sheep.x - p.w);
    expect(p.vx).toBe(0);
  });

  it('blocks a player walking into the sheep from the right', () => {
    const p = player(110, 146);
    p.vx = -90;
    expect(resolveSheep(p, sheep)).toBe('side');
    expect(p.x).toBe(sheep.x + sheep.w);
    expect(p.vx).toBe(0);
  });

  it('lets a player land on top of the sheep', () => {
    const p = player(102, 137); // feet 2px into the sheep's back
    p.vy = 120;
    expect(resolveSheep(p, sheep)).toBe('top');
    expect(p.y + p.h).toBe(sheep.y);
    expect(p.vy).toBe(0);
    expect(p.onGround).toBe(true);
  });
});
