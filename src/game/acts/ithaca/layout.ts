import { LevelBuilder } from '../../levelBuilder';
import { TILE } from '../../types';

export const LEVEL_COLS = 118;
export const FLOOR_Y = 9 * TILE; // top of the ground
export const HALL_START = 36;
export const HALL_END = 112;
export const BOW_RACK_COL = 108;
export const EXIT_COL = 116;

export const SUITOR_COLS = [44, 52, 57, 66, 71, 80, 85, 93, 99];
/** Low feasting tables: a tile high, so they must be hopped. Not tiles: the act makes them solid itself. */
export const TABLES = [
  { col: 46, w: 3 },
  { col: 59, w: 2 },
  { col: 73, w: 3 },
  { col: 87, w: 2 },
  { col: 95, w: 3 },
];
const TREE_COLS = [6, 12, 20, 27];
const CHECKPOINT_COLS = [34, 62, 102];
const ROAD_STEP = { col: 16, w: 3 };

/**
 * Ithaca. Cols 0-35: the road home, with Argos at the gate (`d`). Cols 36-111: the hall (a roofed section)
 * full of suitors (`u`) and tables. `b` is the great bow on its rack. The exit light (`G`) lies behind the
 * back wall: the act is won by stringing the bow, not by walking there.
 */
export function buildIthacaRows(): string[] {
  const b = new LevelBuilder(LEVEL_COLS, 12);
  b.rect(0, 9, LEVEL_COLS, 3, '#'); // ground
  b.rect(HALL_START, 0, HALL_END - HALL_START + 2, 5, '#'); // the hall's roof
  b.rect(HALL_END, 0, 2, 9, '#'); // the back wall
  b.rect(ROAD_STEP.col, 8, ROAD_STEP.w, 1, '#');
  for (const c of TREE_COLS) b.put(c, 8, 't');
  b.put(32, 8, 'd');
  for (const c of SUITOR_COLS) b.put(c, 8, 'u');
  b.put(BOW_RACK_COL, 8, 'b');
  b.put(2, 8, 'S');
  for (const c of CHECKPOINT_COLS) b.put(c, 8, 'C');
  b.put(EXIT_COL, 7, 'G');
  b.put(EXIT_COL, 8, 'G');
  return b.toRows();
}
