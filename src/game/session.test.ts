import { describe, expect, it } from 'vitest';
import { ACTS } from './acts';
import { layoutAct1 } from './acts/act1';
import { layoutAct4 } from './acts/act4';
import { gapTop } from './acts/sea';
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

  it('wrecks the ship on a reef wall, then respawns at the spawn', () => {
    const s = new Session(1);
    const wall = layoutAct1().barriers[0];
    s.player.x = wall.col * 16 - 30;
    s.player.y = 4; // high up, well inside the upper reef (the gap never rises above y=24)
    for (let i = 0; i < 120 && s.deaths === 0; i++) s.update(DT, right);
    expect(s.deaths).toBe(1);
    run(s, 60);
    expect(s.deaths).toBe(1);
    expect(Math.abs(s.player.x - (s.level.spawn.x + 3))).toBeLessThan(2);
  });

  it('lets the ship through when it is lined up with the moving gap', () => {
    const s = new Session(1);
    const wall = layoutAct1().barriers[0];
    s.player.x = wall.col * 16 - 120;
    let passed = false;
    for (let i = 0; i < 60 * 8 && !passed && s.deaths === 0; i++) {
      // Steer to the middle of the gap as it is right now.
      const aim = gapTop(wall, s.time) + (wall.gapH * 16) / 2 - s.player.h / 2;
      s.update(DT, { ...NO_INPUT, right: true, jump: s.player.y > aim + 1.5, action: s.player.y < aim - 1.5 });
      if (s.player.x > wall.col * 16 + 40) passed = true;
    }
    expect(passed).toBe(true);
    expect(s.deaths).toBe(0);
  });

  it('emits a checkpoint sound and respawns there afterwards', () => {
    const s = new Session(1);
    const cp = s.level.checkpoints[0];
    s.player.x = cp.x + 3;
    s.player.y = cp.y + 2;
    const events = run(s, 2);
    expect(events).toContainEqual({ type: 'sfx', name: 'checkpoint' });

    const wall = layoutAct1().barriers.find((b) => b.col * 16 > cp.x)!;
    s.player.x = wall.col * 16 - 20;
    s.player.y = 4;
    for (let i = 0; i < 120 && s.deaths === 0; i++) s.update(DT, right);
    expect(s.deaths).toBe(1);
    run(s, 90);
    expect(Math.abs(s.player.x - (cp.x + 3))).toBeLessThan(15); // the current drifts an idle ship a little
    expect(s.player.x).toBeGreaterThan(s.level.spawn.x + 100); // ...but it is clearly at the checkpoint, not the spawn
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

interface CaveInternals {
  phase: 1 | 2;
  cyclops: { x: number; dir: 1 | -1; mood: string; blind: boolean };
  flock: { sheep: { x: number; moving: boolean; timer: number; nextBleat: number; cooldown: number }[] };
  giants: { x: number; awake: boolean }[];
  fallers: { x: number; state: string }[];
  dog: { x: number };
}
const cave = (s: Session) => s.inst as unknown as CaveInternals;
const FLOOR_STAND_Y = 10 * 16 - 14;

describe('Session (Act 2, phase 1: sneaking in)', () => {
  it('loads, and lets the player idle at the start without being caught', () => {
    const s = new Session(2);
    run(s, 600);
    expect(s.deaths).toBe(0);
    expect(Number.isFinite(s.player.x)).toBe(true);
  });

  it('kills a player standing in the open in front of him', () => {
    const s = new Session(2);
    run(s, 100); // let the post-spawn grace period (1.5 s) expire
    cave(s).cyclops.x = 480;
    cave(s).cyclops.dir = 1;
    s.player.x = 36 * 16 + 4; // ~100px in front of him, clear line of sight, not in a shadow
    s.player.y = FLOOR_STAND_Y;
    run(s, 150);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
  });

  it('hides a player who stands still fully inside a shadow', () => {
    const s = new Session(2);
    s.player.x = 38 * 16 + 20; // inside the shadow at cols 38-40
    s.player.y = FLOOR_STAND_Y;
    run(s, 400);
    expect(s.deaths).toBe(0);
  });

  it('does not hide a player who runs through a shadow', () => {
    const s = new Session(2);
    run(s, 100);
    cave(s).cyclops.x = 500; // to the left of the shadow (cols 38-40), facing it
    cave(s).cyclops.dir = 1;
    let died = false;
    s.player.x = 38 * 16 + 4;
    s.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 120 && !died; i++) {
      if (s.player.x > 40 * 16 - 12) s.player.x = 38 * 16 + 4; // keep running, but stay inside the shadow
      cave(s).cyclops.x = 500;
      s.update(DT, { ...NO_INPUT, right: true });
      died = s.deaths > 0;
    }
    expect(died).toBe(true);
  });

  it('holding ACTION makes the player creep slowly', () => {
    const fast = new Session(2);
    const slow = new Session(2);
    run(fast, 60, right);
    run(slow, 60, { ...NO_INPUT, right: true, action: true });
    expect(fast.player.x - 35).toBeGreaterThan(2 * (slow.player.x - 35));
  });

  it('sheep block the player, and bumping one makes it bleat', () => {
    const s = new Session(2);
    const sheep = cave(s).flock.sheep[0];
    sheep.nextBleat = 1e9;
    s.player.x = sheep.x - 25;
    s.player.y = FLOOR_STAND_Y;
    const events: SessionEvent[] = [];
    for (let i = 0; i < 60; i++) {
      sheep.timer = 1e9;
      sheep.moving = false;
      events.push(...s.update(DT, right));
    }
    expect(s.player.x + s.player.w).toBeLessThanOrEqual(sheep.x + 2);
    expect(events).toContainEqual({ type: 'sfx', name: 'bleat' });
  });

  it('a stalactite drops on someone who stands beneath it', () => {
    const s = new Session(2);
    const f = cave(s).fallers[0];
    s.player.x = f.x - 5;
    s.player.y = FLOOR_STAND_Y;
    run(s, 200);
    expect(s.deaths).toBeGreaterThanOrEqual(1); // crushed (the stalactite resets when you respawn)
  });

  it('a stalactite leaves someone who keeps walking unharmed, but the crash is heard', () => {
    const s = new Session(2);
    run(s, 100);
    const f = cave(s).fallers[0];
    s.player.x = f.x - 40;
    s.player.y = FLOOR_STAND_Y;
    const events: SessionEvent[] = [];
    for (let i = 0; i < 150; i++) events.push(...s.update(DT, right));
    expect(events).toContainEqual({ type: 'sfx', name: 'crash' });
    expect(s.deaths).toBe(0);
  });

  it('the dog sniffs out a player who lingers near it, and barks', () => {
    const s = new Session(2);
    const events: SessionEvent[] = [];
    s.player.x = cave(s).dog.x;
    s.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 90; i++) {
      s.player.x = cave(s).dog.x + 10;
      s.player.y = FLOOR_STAND_Y;
      events.push(...s.update(DT, NO_INPUT));
    }
    expect(events).toContainEqual({ type: 'sfx', name: 'bark' });
  });

  it('a sleeping giant wakes when the player runs close by', () => {
    const s = new Session(2);
    const g = cave(s).giants[0];
    expect(g.awake).toBe(false);
    s.player.x = g.x - 70;
    s.player.y = FLOOR_STAND_Y;
    run(s, 40, right);
    expect(g.awake).toBe(true);
  });
});

describe('Session (Act 2, phase 2: the escape)', () => {
  function afterStake(): Session {
    const s = new Session(2);
    const events: SessionEvent[] = [];
    s.player.x = 89 * 16;
    s.player.y = FLOOR_STAND_Y;
    events.push(...s.update(DT, NO_INPUT));
    expect(events).toContainEqual({ type: 'sfx', name: 'howl' });
    s.player.x = 2600; // well away from him
    s.player.y = FLOOR_STAND_Y;
    return s;
  }

  it('taking the stake blinds him and starts phase 2', () => {
    const s = afterStake();
    expect(cave(s).phase).toBe(2);
    expect(cave(s).cyclops.blind).toBe(true);
  });

  it('the flock stampedes once he is blinded', () => {
    const s = afterStake();
    const x0 = cave(s).flock.sheep.map((sh) => sh.x);
    run(s, 60);
    const moved = cave(s).flock.sheep.filter((sh, i) => sh.x > x0[i] + 20).length;
    expect(moved).toBeGreaterThanOrEqual(cave(s).flock.sheep.length - 2);
  });

  it('running makes the blind Cyclops hunt towards you; creeping does not', () => {
    const loud = afterStake();
    run(loud, 200); // he recovers from the stun
    cave(loud).cyclops.x = 1760;
    cave(loud).flock.sheep.length = 0; // no flock cover
    loud.player.x = 1860;
    loud.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 10; i++) loud.update(DT, { ...NO_INPUT, left: true });
    expect(cave(loud).cyclops.mood).toBe('hunt');

    const quiet = afterStake();
    run(quiet, 200);
    cave(quiet).cyclops.x = 1760;
    cave(quiet).flock.sheep.length = 0;
    quiet.player.x = 1860;
    quiet.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 60; i++) quiet.update(DT, { ...NO_INPUT, left: true, action: true });
    expect(cave(quiet).cyclops.mood).not.toBe('hunt');
  });

  it('standing among the flock hides the sound of running', () => {
    const s = afterStake();
    run(s, 200);
    cave(s).cyclops.x = 1760;
    const sheep = cave(s).flock.sheep;
    s.player.x = 1860;
    s.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 10; i++) {
      sheep[0].x = s.player.x + 20; // a sheep right beside the player
      s.update(DT, { ...NO_INPUT, left: true });
    }
    expect(cave(s).cyclops.mood).not.toBe('hunt');
  });

  it('the blind Cyclops catches someone who stays beside him', () => {
    const s = afterStake();
    run(s, 200);
    const c = cave(s).cyclops;
    s.player.x = c.x + 5;
    s.player.y = FLOOR_STAND_Y;
    run(s, 5);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
  });

  it('respawns in phase 2 (the stake stays taken), with the Cyclops stunned again', () => {
    const s = afterStake();
    run(s, 200);
    const c = cave(s).cyclops;
    s.player.x = c.x + 5;
    s.player.y = FLOOR_STAND_Y;
    for (let i = 0; i < 20 && s.deaths === 0; i++) s.update(DT, NO_INPUT);
    expect(s.deaths).toBe(1);
    run(s, 60);
    expect(cave(s).phase).toBe(2);
    expect(cave(s).cyclops.mood).toBe('stunned');
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
    run(s, 80); // the screen holds still for the 1.5 s start grace...
    expect(s.camera.x - x0).toBeLessThan(1);
    run(s, 25); // ...then it begins to scroll (before the whirlpool catches the idle player)
    expect(s.camera.x).toBeGreaterThan(x0 + 10);
  });
});

describe('Act 4 additions', () => {
  it('pulls the screen along with a player who runs ahead of the scroll', () => {
    const s = new Session(4);
    const inst = s.inst as unknown as { camX: number };
    inst.camX = 400;
    s.player.x = 400 + 300; // far ahead of the screen
    s.player.y = 10;
    s.update(DT, NO_INPUT);
    expect(inst.camX).toBeGreaterThanOrEqual(s.player.x + s.player.w / 2 - 200 - 1);
  });

  it('has crumbling platforms and spikes, and keeps checkpoint platforms solid and clear', () => {
    const layout = layoutAct4();
    expect(layout.crumbles.length).toBeGreaterThanOrEqual(5);
    expect(layout.rows.join('').split('^').length - 1).toBeGreaterThanOrEqual(3); // at least three spikes
    // every spike has at least three solid tiles of platform to its left (a safe landing)
    layout.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch !== '^') return;
        for (let k = 1; k <= 3; k++) expect(layout.rows[r + 1][c - k], `spike at ${c},${r}`).toBe('#');
      });
    });
    for (const c of layout.crumbles) expect(layout.rows[c.row - 1][c.col + 1]).not.toBe('C');
  });

  it('a cracked platform gives way under a player who stands on it, and holds again later', () => {
    const s = new Session(4);
    const spec = layoutAct4().crumbles[0];
    const inst = s.inst as unknown as { crumbles: { state: string }[]; camX: number };
    const platform = inst.crumbles[0];
    inst.camX = spec.col * 16 - 100; // bring the screen to the platform (the right edge is a wall)
    s.player.x = spec.col * 16 + 20;
    s.player.y = spec.row * 16 - 14;
    for (let i = 0; i < 20; i++) s.update(DT, NO_INPUT); // settle onto it, held still by the start grace
    expect(platform.state).not.toBe('solid');
    for (let i = 0; i < 60 * 2; i++) s.update(DT, NO_INPUT); // a still player does not last long on it
    expect(platform.state).toBe('fallen');
  });
});

interface IthacaInternals {
  suitors: { x: number; dir: 1 | -1; timer: number; jeer: number; nextJeer: number }[];
  bow: { stage: string; aim(): number; tension: number } | null;
}
const ithaca = (s: Session) => s.inst as unknown as IthacaInternals;

describe('Session (Act 5, Ithaca)', () => {
  it('the road is safe and unhurried', () => {
    const s = new Session(5);
    run(s, 300, right);
    expect(s.deaths).toBe(0);
    expect(s.player.speedScale).toBeCloseTo(0.7);
  });

  it('a beggar who runs about in front of the suitors is seen through', () => {
    const s = new Session(5);
    const suitor = ithaca(s).suitors[0];
    s.player.x = suitor.x - 52;
    s.player.y = 9 * 16 - 14;
    let died = false;
    for (let i = 0; i < 240 && !died; i++) {
      suitor.dir = -1; // looking straight at him
      suitor.timer = 1e9;
      suitor.nextJeer = 1e9;
      s.update(DT, { ...NO_INPUT, right: i % 40 < 20, left: i % 40 >= 20 });
      died = s.deaths > 0;
    }
    expect(died).toBe(true);
  });

  it('the same beggar, shuffling hunched (ACTION held), is not', () => {
    const s = new Session(5);
    const suitor = ithaca(s).suitors[0];
    s.player.x = suitor.x - 52;
    s.player.y = 9 * 16 - 14;
    for (let i = 0; i < 240; i++) {
      suitor.dir = -1;
      suitor.timer = 1e9;
      suitor.nextJeer = 1e9;
      s.update(DT, { ...NO_INPUT, action: true, right: i % 40 < 20, left: i % 40 >= 20 });
    }
    expect(s.deaths).toBe(0);
  });

  it('suitors who look away do not mind a beggar who walks tall', () => {
    const s = new Session(5);
    const suitor = ithaca(s).suitors[0];
    s.player.x = suitor.x - 52;
    s.player.y = 9 * 16 - 14;
    for (let i = 0; i < 120; i++) {
      suitor.dir = 1; // looking the other way
      suitor.timer = 1e9;
      suitor.nextJeer = 1e9;
      s.update(DT, { ...NO_INPUT, left: i % 40 >= 20, right: i % 40 < 20 });
    }
    expect(s.deaths).toBe(0);
  });

  it('reaching the bow freezes the player and starts the trial', () => {
    const s = new Session(5);
    s.player.x = 108 * 16;
    s.player.y = 9 * 16 - 14;
    run(s, 3);
    expect(ithaca(s).bow).not.toBeNull();
    const x = s.player.x;
    run(s, 30, right);
    expect(Math.abs(s.player.x - x)).toBeLessThan(2); // the controls now belong to the bow
  });

  it('stringing the bow and shooting through the axes completes the act', () => {
    const s = new Session(5);
    s.player.x = 108 * 16;
    s.player.y = 9 * 16 - 14;
    run(s, 3);
    const events: SessionEvent[] = [];
    // Draw: hold ACTION until the tension is in the green zone, then let go.
    for (let i = 0; i < 200 && ithaca(s).bow!.tension < 0.8; i++) {
      events.push(...s.update(DT, { ...NO_INPUT, action: true }));
    }
    events.push(...s.update(DT, NO_INPUT));
    expect(ithaca(s).bow!.stage).toBe('aim');
    // Aim: loose when the marker crosses the rings.
    for (let i = 0; i < 60 * 20 && Math.abs(ithaca(s).bow!.aim()) > 0.03; i++) events.push(...s.update(DT, NO_INPUT));
    events.push(...s.update(DT, { ...NO_INPUT, jump: true, jumpPressed: true }));
    for (let i = 0; i < 60 * 5 && !s.finished; i++) events.push(...s.update(DT, NO_INPUT));
    expect(events).toContainEqual({ type: 'complete', act: 5, deaths: 0 });
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
