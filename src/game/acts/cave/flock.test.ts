import { describe, expect, it } from 'vitest';
import { makeWorld } from '../../engine/world';
import { parseLevel } from '../../level';
import type { SfxName } from '../../types';
import { mulberry32 } from '../pathGen';
import { Flock } from './flock';

// 300 tiles wide: floor on rows 10-11, a stalagmite at column 20, nothing else.
function caveWorld() {
  const rows = Array.from({ length: 12 }, () => '.'.repeat(300));
  rows[9] = 'S' + '.'.repeat(18) + '#' + '.'.repeat(279);
  rows[8] = '.'.repeat(299) + 'G';
  rows[10] = '#'.repeat(300);
  rows[11] = '#'.repeat(300);
  return makeWorld(parseLevel(rows));
}

const player = (x: number, y = 146) => ({ x, y, w: 10, h: 14, vx: 0, vy: 0, onGround: false });

describe('Flock grazing', () => {
  it('wanders near home, never into a wall, and never leaves its roaming range', () => {
    const world = caveWorld();
    const flock = new Flock([20 * 16 - 40, 100 * 16], mulberry32(3));
    const far = player(4000);
    let moved = false;
    const start = flock.sheep.map((s) => s.x);
    for (let i = 0; i < 60 * 60; i++) {
      flock.update(1 / 60, world, far, [], () => {});
      flock.sheep.forEach((s, k) => {
        expect(Math.abs(s.x - s.home)).toBeLessThanOrEqual(70);
        if (s.x !== start[k]) moved = true;
        const frontCol = Math.floor((s.dir > 0 ? s.x + 14 : s.x) / 16);
        if (frontCol === 19) expect(world.solid(frontCol, 9)).toBe(false);
      });
    }
    expect(moved).toBe(true);
  });

  it('bumping a sheep makes it bleat once, with a cooldown, and tells the listener', () => {
    const world = caveWorld();
    const flock = new Flock([800], mulberry32(3));
    const s = flock.sheep[0];
    s.moving = false;
    s.timer = 1e9;
    s.nextBleat = 1e9;
    const sfx: SfxName[] = [];
    const heard: number[] = [];
    const p = player(s.x - 8);
    for (let i = 0; i < 30; i++) {
      s.timer = 1e9;
      s.moving = false;
      flock.update(1 / 60, world, p, sfx, (x) => heard.push(x));
    }
    expect(sfx.filter((n) => n === 'bleat')).toHaveLength(1);
    expect(heard).toHaveLength(1);
  });
});

describe('Flock random bleating', () => {
  it('is audible but never alerts the listener (only a bump does)', () => {
    const world = caveWorld();
    const flock = new Flock([800, 1000], mulberry32(3));
    const sfx: SfxName[] = [];
    const heard: number[] = [];
    const far = player(4000);
    for (let i = 0; i < 60 * 60; i++) flock.update(1 / 60, world, far, sfx, (x) => heard.push(x));
    expect(sfx.filter((n) => n === 'bleat').length).toBeGreaterThan(5);
    expect(heard).toHaveLength(0);
  });
});

describe('Flock stampede', () => {
  it('runs every sheep to the right in clusters, and wraps them round at the end', () => {
    const world = caveWorld();
    const flock = new Flock([], mulberry32(5));
    flock.startStampede(1000, 3000);
    expect(flock.sheep.length).toBeGreaterThanOrEqual(12);
    const x0 = flock.sheep.map((s) => s.x);
    const far = player(4800);
    for (let i = 0; i < 60; i++) flock.update(1 / 60, world, far, [], () => {});
    flock.sheep.forEach((s, k) => expect(s.x).toBeGreaterThan(x0[k] + 30));

    for (let i = 0; i < 60 * 60; i++) flock.update(1 / 60, world, far, [], () => {});
    flock.sheep.forEach((s) => {
      expect(s.x).toBeGreaterThanOrEqual(1000 - 200);
      expect(s.x).toBeLessThanOrEqual(3000 + 1);
    });
  });

  it('exposes positions so the flock can mask the player\'s noise', () => {
    const flock = new Flock([], mulberry32(5));
    flock.startStampede(1000, 3000);
    expect(flock.xs()).toHaveLength(flock.sheep.length);
  });

  it("carries a player who is standing on a sheep's back", () => {
    const world = caveWorld();
    const flock = new Flock([], mulberry32(5));
    flock.startStampede(1000, 3000);
    const s = flock.sheep[0];
    const p = player(s.x + 2);
    const x0 = p.x;
    for (let i = 0; i < 30; i++) {
      p.y = 138; // feet 2px inside the sheep's back (its top is at y = 150, the player is 14 tall)
      p.vy = 40;
      flock.update(1 / 60, world, p, [], () => {});
    }
    expect(p.x).toBeGreaterThan(x0 + 20); // carried along, not left behind
    expect(Math.abs(p.x - s.x)).toBeLessThanOrEqual(12); // still on the same sheep
  });
});
