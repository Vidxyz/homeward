import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVE, type SaveData } from './save';
import { afterActCompleted, afterGameFinished, finishedRun, startRun, skipAhead } from './run';

const save = (patch: Partial<SaveData> = {}): SaveData => ({ ...DEFAULT_SAVE, ...patch });

describe('run tracking', () => {
  it('a new run resets progress, deaths and time, and counts', () => {
    expect(startRun()).toEqual({ furthestAct: 1, deaths: 0, runSeconds: 0, runValid: true });
  });

  it('completing an act adds its play time to the run', () => {
    expect(afterActCompleted(save({ runSeconds: 100 }), 42.5)).toEqual({ runSeconds: 142.5 });
  });

  it('jumping ahead with the picker starts a partial run that counts only what you play from there', () => {
    expect(skipAhead(3)).toEqual({ deaths: 0, runSeconds: 0, runValid: false });
    expect(skipAhead(5)).toEqual({ deaths: 0, runSeconds: 0, runValid: false });
  });

  it('after the game is finished the counters reset, so replaying the last act is a fresh partial run', () => {
    expect(afterGameFinished()).toEqual({ deaths: 0, runSeconds: 0, runValid: false });
  });

  it('starting from Act I with the picker restarts the run without touching the Continue point', () => {
    expect(skipAhead(1)).toEqual({ deaths: 0, runSeconds: 0, runValid: true });
  });
});

describe('finishedRun', () => {
  it('turns a valid run into a leaderboard entry with the final time and deaths', () => {
    const entry = finishedRun(save({ runSeconds: 700, deaths: 6 }), 'Penelope', 12.5, new Date('2026-10-02T12:00:00Z'));
    expect(entry).toEqual({ name: 'Penelope', seconds: 712.5, deaths: 6, date: '2026-10-02T12:00:00.000Z', full: true });
  });

  it('cleans the name', () => {
    expect(finishedRun(save(), '   ', 10, new Date())!.name).toBe('Anonymous');
  });

  it('marks a run that skipped ahead as partial, but still gives an entry to save', () => {
    const entry = finishedRun(save({ runValid: false, runSeconds: 30, deaths: 1 }), 'X', 10, new Date())!;
    expect(entry.full).toBe(false);
    expect(entry.seconds).toBe(40);
    expect(entry.deaths).toBe(1);
  });

  it('marks a run from the start as full', () => {
    expect(finishedRun(save(), 'X', 10, new Date())!.full).toBe(true);
  });
});
