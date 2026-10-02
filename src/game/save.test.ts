import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVE, SAVE_KEY, loadSave, writeSave } from './save';

function memoryStorage(initial?: string) {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set(SAVE_KEY, initial);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('save', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSave(memoryStorage())).toEqual(DEFAULT_SAVE);
  });

  it('round-trips data', () => {
    const s = memoryStorage();
    writeSave({ furthestAct: 3, deaths: 12, muted: true, runSeconds: 321.5, runValid: true }, s);
    expect(loadSave(s)).toEqual({ furthestAct: 3, deaths: 12, muted: true, runSeconds: 321.5, runValid: true });
  });

  it('falls back to defaults on corrupt JSON', () => {
    expect(loadSave(memoryStorage('{nope'))).toEqual(DEFAULT_SAVE);
  });

  it('clamps out-of-range values', () => {
    const s = memoryStorage(JSON.stringify({ furthestAct: 99, deaths: -5, muted: 'yes' }));
    expect(loadSave(s)).toEqual({ furthestAct: 5, deaths: 0, muted: false, runSeconds: 0, runValid: false });
  });

  it('treats a save from before runs were timed as a practice journey', () => {
    const s = memoryStorage(JSON.stringify({ furthestAct: 3, deaths: 4, muted: false }));
    const loaded = loadSave(s);
    expect(loaded.runValid).toBe(false);
    expect(loaded.runSeconds).toBe(0);
  });

  it('a fresh game starts a valid run', () => {
    expect(DEFAULT_SAVE.runValid).toBe(true);
    expect(DEFAULT_SAVE.runSeconds).toBe(0);
  });

  it('never throws when storage is blocked', () => {
    expect(loadSave(broken)).toEqual(DEFAULT_SAVE);
    expect(() => writeSave(DEFAULT_SAVE, broken)).not.toThrow();
  });

  it('never throws when there is no storage at all', () => {
    expect(loadSave(null)).toEqual(DEFAULT_SAVE);
    expect(() => writeSave(DEFAULT_SAVE, null)).not.toThrow();
  });
});
