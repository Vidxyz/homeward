import { TILE, type Rect, type Vec } from './types';

export interface EntitySpawn {
  ch: string;
  col: number;
  row: number;
}

export interface Level {
  cols: number;
  rows: number;
  tiles: string[];
  spawn: Vec;
  checkpoints: Vec[];
  goal: Rect;
  entities: EntitySpawn[];
}

const TILE_CHARS = '.#^~H';

export function parseLevel(input: string[]): Level {
  if (input.length === 0) throw new Error('level has no rows');
  const cols = Math.max(...input.map((r) => r.length));
  if (cols === 0) throw new Error('level has no columns');

  const tiles: string[] = [];
  const checkpoints: Vec[] = [];
  const entities: EntitySpawn[] = [];
  let spawn: Vec | null = null;
  let g: { c0: number; r0: number; c1: number; r1: number } | null = null;

  for (let row = 0; row < input.length; row++) {
    const raw = input[row];
    let out = '';
    for (let col = 0; col < cols; col++) {
      const ch = raw[col] ?? '.';
      if (ch === 'S') {
        if (spawn) throw new Error('level has more than one spawn (S)');
        spawn = { x: col * TILE, y: row * TILE };
        out += '.';
      } else if (ch === 'C') {
        checkpoints.push({ x: col * TILE, y: row * TILE });
        out += '.';
      } else if (ch === 'G') {
        g = g
          ? {
              c0: Math.min(g.c0, col),
              r0: Math.min(g.r0, row),
              c1: Math.max(g.c1, col),
              r1: Math.max(g.r1, row),
            }
          : { c0: col, r0: row, c1: col, r1: row };
        out += '.';
      } else if (TILE_CHARS.includes(ch)) {
        out += ch;
      } else if (/[A-Za-z]/.test(ch)) {
        entities.push({ ch, col, row });
        out += '.';
      } else {
        throw new Error(`unknown tile '${ch}' at column ${col}, row ${row}`);
      }
    }
    tiles.push(out);
  }

  if (!spawn) throw new Error('level has no spawn (S)');
  if (!g) throw new Error('level has no goal (G)');

  return {
    cols,
    rows: input.length,
    tiles,
    spawn,
    checkpoints,
    goal: {
      x: g.c0 * TILE,
      y: g.r0 * TILE,
      w: (g.c1 - g.c0 + 1) * TILE,
      h: (g.r1 - g.r0 + 1) * TILE,
    },
    entities,
  };
}

/** Left, right and top outside the level are solid walls; below is open (physics kills there). */
export function tileAt(level: Level, col: number, row: number): string {
  if (col < 0 || col >= level.cols || row < 0) return '#';
  if (row >= level.rows) return '.';
  return level.tiles[row][col];
}
