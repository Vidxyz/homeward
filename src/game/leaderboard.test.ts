import { describe, expect, it } from 'vitest';
import { BOARD_KEY, addEntry, cleanName, formatTime, loadBoard, rankOf, ranked, saveBoard, type Entry } from './leaderboard';

const e = (name: string, seconds: number, deaths: number, date = '2026-10-02T10:00:00Z'): Entry => ({ name, seconds, deaths, date });

function memoryStorage(initial?: string) {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set(BOARD_KEY, initial);
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(754.9)).toBe('12:34');
    expect(formatTime(3600)).toBe('60:00');
  });
});

describe('cleanName', () => {
  it('trims, collapses spaces and limits the length', () => {
    expect(cleanName('  Odysseus   of  Ithaca and more  ')).toBe('Odysseus of');
    expect(cleanName('Penelope')).toBe('Penelope');
  });

  it('falls back to Anonymous for nothing', () => {
    expect(cleanName('')).toBe('Anonymous');
    expect(cleanName('   ')).toBe('Anonymous');
  });
});

describe('ranked', () => {
  const list = [e('a', 600, 5), e('b', 500, 9), e('c', 700, 2), e('d', 500, 3)];

  it('fastest first, with fewer deaths breaking a tie', () => {
    expect(ranked(list, 'time').map((x) => x.name)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('fewest deaths first, with the faster time breaking a tie', () => {
    expect(ranked(list, 'deaths').map((x) => x.name)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('honours the limit and does not change the original list', () => {
    expect(ranked(list, 'time', 2)).toHaveLength(2);
    expect(list.map((x) => x.name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('puts an earlier run ahead of an identical later one', () => {
    const l = [e('late', 500, 3, '2026-10-03T10:00:00Z'), e('early', 500, 3, '2026-10-02T10:00:00Z')];
    expect(ranked(l, 'time').map((x) => x.name)).toEqual(['early', 'late']);
  });
});

describe('rankOf', () => {
  it('gives the 1-based position of an entry in a view', () => {
    const a = e('a', 600, 5);
    const b = e('b', 500, 9);
    const list = [a, b];
    expect(rankOf(list, b, 'time')).toBe(1);
    expect(rankOf(list, a, 'time')).toBe(2);
    expect(rankOf(list, b, 'deaths')).toBe(2);
  });
});

describe('addEntry', () => {
  it('adds without changing the original', () => {
    const list = [e('a', 600, 5)];
    const next = addEntry(list, e('b', 500, 2));
    expect(next).toHaveLength(2);
    expect(list).toHaveLength(1);
  });

  it('keeps the list to a sensible size', () => {
    let list: Entry[] = [];
    for (let i = 0; i < 260; i++) list = addEntry(list, e(`p${i}`, 1000 + i, i));
    expect(list.length).toBeLessThanOrEqual(200);
    expect(list.some((x) => x.name === 'p259')).toBe(true); // the newest is kept
  });
});

describe('load and save', () => {
  it('round-trips a board', () => {
    const s = memoryStorage();
    saveBoard([e('a', 600, 5)], s);
    expect(loadBoard(s)).toEqual([e('a', 600, 5)]);
  });

  it('returns an empty board when nothing is stored, or when storage is broken or corrupt', () => {
    expect(loadBoard(memoryStorage())).toEqual([]);
    expect(loadBoard(memoryStorage('{nope'))).toEqual([]);
    expect(loadBoard(null)).toEqual([]);
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadBoard(broken)).toEqual([]);
    expect(() => saveBoard([e('a', 1, 0)], broken)).not.toThrow();
  });

  it('drops malformed entries and cleans the rest', () => {
    const raw = JSON.stringify([
      { name: 'ok', seconds: 100, deaths: 2, date: '2026-10-02T10:00:00Z' },
      { name: 'neg', seconds: -5, deaths: 2, date: 'x' },
      { name: 'nan', seconds: 'soon', deaths: 2, date: 'x' },
      'garbage',
      { name: '   ', seconds: 50, deaths: 0, date: 'y' },
    ]);
    const board = loadBoard(memoryStorage(raw));
    expect(board.map((x) => x.name)).toEqual(['ok', 'Anonymous']);
  });
});
