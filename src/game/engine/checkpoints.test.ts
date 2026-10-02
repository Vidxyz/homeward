import { describe, expect, it } from 'vitest';
import { CheckpointTracker } from './checkpoints';

const spawn = { x: 32, y: 128 };
const cps = [
  { x: 200, y: 128 },
  { x: 400, y: 128 },
];
const at = (c: { x: number; y: number }) => ({ x: c.x + 3, y: c.y + 2, w: 10, h: 14 });

describe('CheckpointTracker', () => {
  it('respawns at the spawn until a checkpoint is reached', () => {
    const t = new CheckpointTracker(spawn, cps);
    expect(t.respawn()).toEqual(spawn);
  });

  it('activates a checkpoint once and respawns there', () => {
    const t = new CheckpointTracker(spawn, cps);
    expect(t.update(at(cps[0]))).toBe(true);
    expect(t.update(at(cps[0]))).toBe(false);
    expect(t.respawn()).toEqual(cps[0]);
    expect(t.isReached(0)).toBe(true);
    expect(t.isReached(1)).toBe(false);
  });

  it('uses the most recently reached checkpoint and never goes backwards', () => {
    const t = new CheckpointTracker(spawn, cps);
    t.update(at(cps[0]));
    t.update(at(cps[1]));
    t.update(at(cps[0]));
    expect(t.respawn()).toEqual(cps[1]);
  });

  it('ignores a player who is far away', () => {
    const t = new CheckpointTracker(spawn, cps);
    expect(t.update({ x: 0, y: 0, w: 10, h: 14 })).toBe(false);
  });
});
