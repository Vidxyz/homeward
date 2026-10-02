import { describe, expect, it } from 'vitest';
import { ACTS } from './acts';
import { Session, type SessionEvent } from './session';
import { NO_INPUT, type InputState } from './types';

const DT = 1 / 60;
const right: InputState = { ...NO_INPUT, right: true };

function run(s: Session, frames: number, inp: InputState = NO_INPUT): SessionEvent[] {
  const all: SessionEvent[] = [];
  for (let i = 0; i < frames; i++) all.push(...s.update(DT, inp));
  return all;
}

describe('Session (Act 1, sailing)', () => {
  it('starts in open water and survives idling', () => {
    const s = new Session(1);
    run(s, 600);
    expect(s.deaths).toBe(0);
  });

  it('sails to the right under player control', () => {
    const s = new Session(1);
    const x0 = s.player.x;
    run(s, 60, right);
    expect(s.player.x).toBeGreaterThan(x0 + 50);
  });

  it('steers up and down with the jump and action keys', () => {
    const s = new Session(1);
    const y0 = s.player.y;
    run(s, 30, { ...NO_INPUT, jump: true });
    expect(s.player.y).toBeLessThan(y0 - 20);
    run(s, 60, { ...NO_INPUT, action: true });
    expect(s.player.y).toBeGreaterThan(y0);
  });

  it('wrecks the ship on a reef, then respawns at the spawn', () => {
    const s = new Session(1);
    let rock: { c: number; r: number } | null = null;
    for (let r = 0; r < s.level.rows && !rock; r++) {
      const c = s.level.tiles[r].indexOf('#');
      if (c >= 0) rock = { c, r };
    }
    expect(rock).not.toBeNull();
    s.player.x = rock!.c * 16 - 40;
    s.player.y = rock!.r * 16 + 2;
    for (let i = 0; i < 90 && s.deaths === 0; i++) s.update(DT, right);
    expect(s.deaths).toBe(1);
    run(s, 60);
    expect(s.deaths).toBe(1);
    expect(Math.abs(s.player.x - (s.level.spawn.x + 3))).toBeLessThan(2);
  });

  it('emits a checkpoint sound and respawns there afterwards', () => {
    const s = new Session(1);
    const cp = s.level.checkpoints[0];
    s.player.x = cp.x + 3;
    s.player.y = cp.y + 2;
    const events = run(s, 2);
    expect(events).toContainEqual({ type: 'sfx', name: 'checkpoint' });

    s.player.y = 500; // out of bounds is clamped; put the ship inside a reef instead
    const rockCol = s.level.tiles[0].indexOf('#');
    s.player.x = rockCol * 16;
    s.player.y = 0;
    run(s, 90);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
    expect(Math.abs(s.player.x - (cp.x + 3))).toBeLessThan(2);
  });

  it('completes the act when the shore is reached and then stops updating', () => {
    const s = new Session(1);
    s.player.x = s.level.goal.x - 20; // the bow crosses the shoreline just before the sand
    s.player.y = 80;
    const events = run(s, 2);
    expect(events).toContainEqual({ type: 'complete', act: 1, deaths: 0 });
    expect(s.finished).toBe(true);
    expect(run(s, 5)).toEqual([]);
  });

  it('rejects an unknown act number', () => {
    expect(() => new Session(99)).toThrow(/act/i);
  });
});

describe('Session (Act 2)', () => {
  it('loads, lets the player idle behind the Cyclops, and stays finite', () => {
    const s = new Session(2);
    run(s, 600);
    expect(s.deaths).toBe(0);
    expect(Number.isFinite(s.player.x)).toBe(true);
  });

  it('kills a player standing in the open in front of him', () => {
    const s = new Session(2);
    run(s, 100); // let the post-spawn grace period (1.5 s) expire; he is now near col 33, facing right
    s.player.x = 43 * 16; // inside his 150 px sight range, in the open (the nearest shadow zone is cols 38-40)
    s.player.y = 10 * 16 - 14;
    run(s, 120); // 0.7 s of exposure fills the meter
    expect(s.deaths).toBeGreaterThanOrEqual(1);
  });

  it('does not kill a player standing fully inside a shadow, with no button held', () => {
    const s = new Session(2);
    s.player.x = 38 * 16 + 20; // inside the shadow zone at cols 38-40
    s.player.y = 10 * 16 - 14;
    run(s, 400);
    expect(s.deaths).toBe(0);
  });

  it('still kills a player who is only half in a shadow', () => {
    const s = new Session(2);
    run(s, 100); // let the post-spawn grace expire; he is near col 33, facing right
    s.player.x = 40 * 16 + 10; // right edge (x+10) crosses out of the zone (cols 38-40) into the light
    s.player.y = 10 * 16 - 14;
    run(s, 120);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
  });
});

describe('Session (Act 3)', () => {
  it('pulls an idle player backwards but keeps them on the pier', () => {
    const s = new Session(3);
    run(s, 600);
    expect(s.deaths).toBe(0);
    expect(s.player.x).toBeGreaterThanOrEqual(0);
  });

  it('a well-timed ACTION press suppresses the pull', () => {
    const protectedRun = new Session(3);
    protectedRun.player.x = 140;
    const x0 = protectedRun.player.x;
    // Press just before the second beat at t = 1.6 s (frame 94 is t ~ 1.58).
    for (let i = 0; i < 100; i++) {
      protectedRun.update(DT, i === 94 ? { ...NO_INPUT, action: true, actionPressed: true } : NO_INPUT);
    }
    const unprotected = new Session(3);
    unprotected.player.x = 140;
    for (let i = 0; i < 100; i++) unprotected.update(DT, NO_INPUT);
    expect(x0 - protectedRun.player.x).toBeLessThan(x0 - unprotected.player.x);
  });
});

describe('Session (Act 4)', () => {
  it('the whirlpool catches an idle player and they respawn behind the scroll', () => {
    const s = new Session(4);
    run(s, 600);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(s.player.x)).toBe(true);
  });

  it('auto-scrolls the camera to the right', () => {
    const s = new Session(4);
    const x0 = s.camera.x;
    run(s, 50); // under a second: before the whirlpool catches the idle player and resets the scroll
    expect(s.camera.x).toBeGreaterThan(x0 + 25);
  });
});

describe('Session (Act 5)', () => {
  it('has no hazards, walks slowly, and completes at the goal', () => {
    const s = new Session(5);
    run(s, 300, right);
    expect(s.deaths).toBe(0);
    expect(s.player.speedScale).toBeCloseTo(0.7);
    s.player.x = s.level.goal.x;
    s.player.y = s.level.goal.y;
    expect(run(s, 2)).toContainEqual({ type: 'complete', act: 5, deaths: 0 });
  });
});

describe('every act', () => {
  it('has exactly five acts with unique ids', () => {
    expect(ACTS.map((a) => a.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([1, 2, 3, 4, 5])('act %i loads and survives 20 s of play without throwing', (n) => {
    const s = new Session(n);
    expect(s.level.checkpoints.length).toBeGreaterThanOrEqual(n === 5 ? 0 : 1);
    for (let i = 0; i < 1200; i++) {
      s.update(DT, i % 120 < 60 ? right : NO_INPUT);
      expect(Number.isFinite(s.player.x)).toBe(true);
      expect(Number.isFinite(s.player.y)).toBe(true);
      expect(Number.isFinite(s.camera.x)).toBe(true);
    }
  });
});

interface CaveInternals {
  x: number;
  dir: 1 | -1;
  mood: string;
  hear(x: number): void;
  sheep: { x: number; moving: boolean; timer: number; cooldown: number; bleatFor: number }[];
}

describe('Session (Act 2, erratic Cyclops and sheep)', () => {
  it('paces erratically: he reverses direction several times and stays inside the cave', () => {
    const s = new Session(2);
    const cave = s.inst as unknown as CaveInternals;
    let changes = 0;
    let last = cave.dir;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < 60 * 120; i++) {
      s.player.x = 5 * 16 + 20; // keep the player hidden-ish and out of the way
      s.update(DT, { ...NO_INPUT, action: true });
      if (cave.dir !== last) {
        changes++;
        last = cave.dir;
      }
      minX = Math.min(minX, cave.x);
      maxX = Math.max(maxX, cave.x);
    }
    expect(changes).toBeGreaterThanOrEqual(6);
    expect(minX).toBeGreaterThanOrEqual(8 * 16 - 0.01);
    expect(maxX).toBeLessThanOrEqual(128 * 16 + 0.01);
  });

  it('goes to investigate a noise he can hear, and ignores one that is too far away', () => {
    const s = new Session(2);
    const cave = s.inst as unknown as CaveInternals;
    cave.x = 800;
    cave.hear(1200);
    expect(cave.mood).toBe('investigate');
    run(s, 60);
    expect(cave.x).toBeGreaterThan(830);

    const far = new Session(2);
    const farCave = far.inst as unknown as CaveInternals;
    farCave.x = 200;
    farCave.hear(1800);
    expect(farCave.mood).toBe('walk');
  });

  it('sheep block the player, and bumping one makes it bleat', () => {
    const s = new Session(2);
    const cave = s.inst as unknown as CaveInternals;
    const sheep = cave.sheep[0];
    sheep.moving = false;
    sheep.timer = 1e9;
    s.player.x = sheep.x - 25;
    s.player.y = 10 * 16 - 14;
    const events: SessionEvent[] = [];
    for (let i = 0; i < 60; i++) {
      sheep.timer = 1e9;
      sheep.moving = false;
      events.push(...s.update(DT, right));
    }
    expect(s.player.x + s.player.w).toBeLessThanOrEqual(sheep.x + 2);
    expect(events).toContainEqual({ type: 'sfx', name: 'bleat' });
  });
});
