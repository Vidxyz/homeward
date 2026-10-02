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
    const data = { furthestAct: 3, deaths: 12, muted: true, runSeconds: 321.5, runValid: true, touchMode: 'on' as const, touchSwap: true };
    writeSave(data, s);
    expect(loadSave(s)).toEqual(data);
  });

  it('falls back to defaults on corrupt JSON', () => {
    expect(loadSave(memoryStorage('{nope'))).toEqual(DEFAULT_SAVE);
  });

  it('clamps out-of-range values', () => {
    const s = memoryStorage(JSON.stringify({ furthestAct: 99, deaths: -5, muted: 'yes' }));
    expect(loadSave(s)).toEqual({ furthestAct: 5, deaths: 0, muted: false, runSeconds: 0, runValid: false, touchMode: 'auto', touchSwap: false });
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

describe('touch settings', () => {
  it('default to automatic buttons in the standard layout', () => {
    expect(DEFAULT_SAVE.touchMode).toBe('auto');
    expect(DEFAULT_SAVE.touchSwap).toBe(false);
  });

  it('an older save without them gets the defaults', () => {
    const loaded = loadSave(memoryStorage(JSON.stringify({ furthestAct: 2, deaths: 1, muted: false })));
    expect(loaded.touchMode).toBe('auto');
    expect(loaded.touchSwap).toBe(false);
  });

  it('ignores nonsense values', () => {
    const loaded = loadSave(memoryStorage(JSON.stringify({ touchMode: 'sideways', touchSwap: 'yes' })));
    expect(loaded.touchMode).toBe('auto');
    expect(loaded.touchSwap).toBe(false);
  });
});
