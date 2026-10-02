import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../levelBuilder';
import { finishPier, gapCapForRise, genPath, mulberry32, type PathOptions } from './pathGen';

const base: PathOptions = {
  startCol: 12,
  endCol: 140,
  startRow: 8,
  minRow: 6,
  maxRow: 10,
  minWidth: 2,
  maxWidth: 4,
  maxGap: 3,
  seed: 5,
  checkpointEvery: 30,
  checkpointMaxRow: 8,
};

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('gapCapForRise', () => {
  it('shrinks the allowed gap as the climb gets steeper', () => {
    expect(gapCapForRise(0, 3)).toBe(3);
    expect(gapCapForRise(-2, 3)).toBe(3);
    expect(gapCapForRise(1, 3)).toBe(2);
    expect(gapCapForRise(2, 3)).toBe(1);
    expect(gapCapForRise(1, 1)).toBe(1);
  });
});

describe('genPath', () => {
  it('always produces reachable platform pairs', () => {
    for (const seed of [1, 2, 3, 11, 33, 44]) {
      const b = new LevelBuilder(200, 12);
      const { platforms } = genPath(b, { ...base, seed });
      expect(platforms[0].col).toBe(base.startCol);
      for (let i = 1; i < platforms.length; i++) {
        const prev = platforms[i - 1];
        const next = platforms[i];
        const gap = next.col - (prev.col + prev.width);
        const rise = prev.row - next.row;
        expect(rise).toBeLessThanOrEqual(2);
        expect(gap).toBeGreaterThanOrEqual(1);
        expect(gap).toBeLessThanOrEqual(gapCapForRise(rise, 3));
        expect(next.row).toBeGreaterThanOrEqual(6);
        expect(next.row).toBeLessThanOrEqual(10);
      }
    }
  });

  it('is deterministic for a seed and varies between seeds', () => {
    const run = (seed: number) => genPath(new LevelBuilder(200, 12), { ...base, seed }).platforms;
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('only places checkpoints on safe, wide-enough platforms', () => {
    const b = new LevelBuilder(200, 12);
    genPath(b, base);
    const rows = b.toRows();
    let found = 0;
    rows.forEach((line, r) => {
      [...line].forEach((ch, c) => {
        if (ch !== 'C') return;
        found++;
        expect(rows[r + 1][c]).toBe('#');
        expect(r + 1).toBeLessThanOrEqual(8);
      });
    });
    expect(found).toBeGreaterThan(0);
  });

  it('supports progress-dependent limits', () => {
    const b = new LevelBuilder(200, 12);
    const { platforms } = genPath(b, { ...base, maxRow: (p) => (p > 0.5 ? 7 : 10) });
    const late = platforms.filter((p) => p.col > 12 + (140 - 12) * 0.55);
    expect(late.length).toBeGreaterThan(0);
    late.forEach((p) => expect(p.row).toBeLessThanOrEqual(7));
  });
});

describe('finishPier', () => {
  it('builds a pier with a two-tall goal and returns its end column', () => {
    const b = new LevelBuilder(30, 12);
    const end = finishPier(b, 10, 8);
    expect(end).toBe(18);
    const rows = b.toRows();
    expect(rows[8].slice(10, 18)).toBe('########');
    expect(rows[11].slice(10, 18)).toBe('########');
    expect(rows[7][15]).toBe('G');
    expect(rows[6][15]).toBe('G');
  });
});
