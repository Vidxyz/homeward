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
