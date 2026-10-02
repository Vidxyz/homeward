import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVE, type SaveData } from './save';
import { finishedRun, afterActCompleted, startRun, skipAhead } from './run';

const save = (patch: Partial<SaveData> = {}): SaveData => ({ ...DEFAULT_SAVE, ...patch });

describe('run tracking', () => {
  it('a new run resets progress, deaths and time, and counts', () => {
    expect(startRun()).toEqual({ furthestAct: 1, deaths: 0, runSeconds: 0, runValid: true });
  });

  it('completing an act adds its play time to the run', () => {
    expect(afterActCompleted(save({ runSeconds: 100 }), 42.5)).toEqual({ runSeconds: 142.5 });
  });

  it('jumping ahead with the picker makes it a practice run', () => {
    expect(skipAhead(3)).toEqual({ runValid: false });
    expect(skipAhead(5)).toEqual({ runValid: false });
  });

  it('starting from Act I with the picker is a fresh run', () => {
    expect(skipAhead(1)).toEqual(startRun());
  });
});

describe('finishedRun', () => {
  it('turns a valid run into a leaderboard entry with the final time and deaths', () => {
    const entry = finishedRun(save({ runSeconds: 700, deaths: 6 }), 'Penelope', 12.5, new Date('2026-10-02T12:00:00Z'));
    expect(entry).toEqual({ name: 'Penelope', seconds: 712.5, deaths: 6, date: '2026-10-02T12:00:00.000Z' });
  });

  it('cleans the name', () => {
    expect(finishedRun(save(), '   ', 10, new Date())!.name).toBe('Anonymous');
  });

  it('gives nothing for a practice run', () => {
    expect(finishedRun(save({ runValid: false }), 'X', 10, new Date())).toBeNull();
  });
});
