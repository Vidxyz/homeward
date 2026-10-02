import { describe, expect, it } from 'vitest';
import { Session, type SessionEvent } from './session';
import { NO_INPUT, type InputState } from './types';

const DT = 1 / 60;
const right: InputState = { ...NO_INPUT, right: true };

function run(s: Session, frames: number, inp: InputState = NO_INPUT): SessionEvent[] {
  const all: SessionEvent[] = [];
  for (let i = 0; i < frames; i++) all.push(...s.update(DT, inp));
  return all;
}

describe('Session (Act 1)', () => {
  it('starts on the spawn pier and survives idling', () => {
    const s = new Session(1);
    run(s, 600);
    expect(s.deaths).toBe(0);
    expect(s.player.onGround).toBe(true);
  });

  it('counts a death, then respawns at the spawn', () => {
    const s = new Session(1);
    const spawnX = s.level.spawn.x + 3;
    for (let i = 0; i < 400 && s.deaths === 0; i++) s.update(DT, right);
    expect(s.deaths).toBe(1);
    run(s, 60);
    expect(Math.abs(s.player.x - spawnX)).toBeLessThan(2);
    expect(s.dying).toBeLessThanOrEqual(0);
  });

  it('emits a checkpoint sound and respawns there afterwards', () => {
    const s = new Session(1);
    const cp = s.level.checkpoints[0];
    s.player.x = cp.x + 3;
    s.player.y = cp.y + 2;
    const events = run(s, 2);
    expect(events).toContainEqual({ type: 'sfx', name: 'checkpoint' });

    s.player.y = 500;
    run(s, 90);
    expect(s.deaths).toBe(1);
    expect(Math.abs(s.player.x - (cp.x + 3))).toBeLessThan(2);
  });

  it('completes the act when the goal is reached and then stops updating', () => {
    const s = new Session(1);
    s.player.x = s.level.goal.x;
    s.player.y = s.level.goal.y;
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

  it('does not kill a player hiding in a shadow with ACTION held', () => {
    const s = new Session(2);
    s.player.x = 38 * 16 + 20; // inside the shadow zone at col 38-40
    s.player.y = 10 * 16 - 14;
    run(s, 400, { ...NO_INPUT, action: true });
    expect(s.deaths).toBe(0);
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
