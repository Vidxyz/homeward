import type { LevelBuilder } from '../levelBuilder';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Platform {
  col: number;
  row: number;
  width: number;
}

type Param = number | ((progress: number) => number);

export interface PathOptions {
  startCol: number;
  endCol: number;
  startRow: number;
  minRow: Param;
  maxRow: Param;
  minWidth: number;
  maxWidth: number;
  maxGap: Param;
  thickness?: number;
  seed: number;
  checkpointEvery?: number;
  checkpointMaxRow?: number;
}

export interface PathResult {
  /** Column where the next platform would start (use it for the finishing pier). */
  col: number;
  row: number;
  platforms: Platform[];
}

const val = (p: Param, progress: number): number => (typeof p === 'function' ? p(progress) : p);

/** Largest gap (tiles) that is always jumpable after climbing `rise` tiles (negative = dropping). */
export function gapCapForRise(rise: number, cap: number): number {
  if (rise >= 2) return Math.min(cap, 1);
  if (rise === 1) return Math.min(cap, 2);
  return Math.min(cap, 3);
}

/** Lays a left-to-right chain of platforms that is always traversable by a jump. */
export function genPath(b: LevelBuilder, o: PathOptions): PathResult {
  const rng = mulberry32(o.seed);
  const thickness = o.thickness ?? 1;
  const span = Math.max(1, o.endCol - o.startCol);
  const platforms: Platform[] = [];
  let col = o.startCol;
  let row = o.startRow;
  let sinceCheckpoint = 0;

  while (col < o.endCol) {
    const progress = (col - o.startCol) / span;
    const width = o.minWidth + Math.floor(rng() * (o.maxWidth - o.minWidth + 1));
    b.rect(col, row, width, thickness, '#');
    platforms.push({ col, row, width });

    if (
      o.checkpointEvery !== undefined &&
      sinceCheckpoint >= o.checkpointEvery &&
      width >= 3 &&
      row <= (o.checkpointMaxRow ?? Infinity)
    ) {
      b.put(col + 1, row - 1, 'C');
      sinceCheckpoint = 0;
    }

    const lo = val(o.minRow, progress);
    const hi = val(o.maxRow, progress);
    const nextRow = Math.min(hi, Math.max(lo, row + Math.floor(rng() * 4) - 2));
    const rise = row - nextRow;
    const cap = gapCapForRise(rise, val(o.maxGap, progress));
    const gap = 1 + Math.floor(rng() * Math.max(1, cap));

    sinceCheckpoint += width + gap;
    col += width + gap;
    row = nextRow;
  }
  return { col, row, platforms };
}

/** Builds the finishing pier (solid down to the bottom) with a two-tall goal. Returns its end column. */
export function finishPier(b: LevelBuilder, col: number, row: number, length = 8): number {
  b.rect(col, row, length, b.rows - row, '#');
  b.put(col + length - 3, row - 1, 'G');
  b.put(col + length - 3, row - 2, 'G');
  return col + length;
}
