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
    writeSave({ furthestAct: 3, deaths: 12, muted: true, seen: [1, 2, 3] }, s);
    expect(loadSave(s)).toEqual({ furthestAct: 3, deaths: 12, muted: true, seen: [1, 2, 3] });
  });

  it('falls back to defaults on corrupt JSON', () => {
    expect(loadSave(memoryStorage('{nope'))).toEqual(DEFAULT_SAVE);
  });

  it('clamps out-of-range values', () => {
    const s = memoryStorage(JSON.stringify({ furthestAct: 99, deaths: -5, muted: 'yes' }));
    expect(loadSave(s)).toEqual({ furthestAct: 5, deaths: 0, muted: false, seen: [1] });
  });

  it('cleans the list of started acts: always Act 1, only real acts, no duplicates, sorted', () => {
    const s = memoryStorage(JSON.stringify({ seen: [4, 4, 'x', 9, 2, 0] }));
    expect(loadSave(s).seen).toEqual([1, 2, 4]);
    expect(loadSave(memoryStorage(JSON.stringify({ seen: 'nope' }))).seen).toEqual([1]);
  });

  it('upgrades an older save that has no list of started acts', () => {
    const s = memoryStorage(JSON.stringify({ furthestAct: 3, deaths: 2, muted: false }));
    expect(loadSave(s).seen).toEqual([1]);
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
