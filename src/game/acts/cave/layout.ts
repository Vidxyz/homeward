import { LevelBuilder } from '../../levelBuilder';
import { TILE } from '../../types';

export const LEVEL_COLS = 190;
export const FLOOR_ROW = 10;
export const FLOOR_Y = FLOOR_ROW * TILE;

/** Where the stake lies in the Cyclops's den: the end of phase 1. */
export const DEN_COL = 89;
/** Phase 2 (the escape) runs from the den to the exit. */
export const PHASE2_START_COL = 94;
export const EXIT_COL = 186;

const SHADOW_COLS = [5, 16, 38, 58, 70, 80];
const PITS = [24, 33]; // three tiles wide each
const CHECKPOINT_COLS = [22, 37, 78, 91, 138];
const STALAGMITES = [
  // phase 1
  { col: 20, w: 2, h: 1 }, { col: 29, w: 1, h: 1 }, { col: 41, w: 1, h: 2 },
  { col: 72, w: 2, h: 1 }, { col: 84, w: 1, h: 2 },
  // phase 2
  { col: 100, w: 1, h: 1 }, { col: 106, w: 2, h: 2 }, { col: 112, w: 1, h: 1 }, { col: 121, w: 2, h: 1 },
  { col: 128, w: 1, h: 2 }, { col: 135, w: 1, h: 1 }, { col: 142, w: 2, h: 2 }, { col: 150, w: 1, h: 1 },
  { col: 158, w: 2, h: 1 }, { col: 166, w: 1, h: 2 }, { col: 174, w: 1, h: 1 },
];
const STALACTITES = [20, 44, 68, 92, 116, 140, 164]; // decorative: one tile, never fall
const FALLERS = [46, 50, 54, 61, 104, 116, 125, 133, 146, 155, 164, 172]; // 'v': drop when walked under
const BRAZIERS = [63, 75]; // 'f'
const GIANTS = [13, 66]; // 'g': sleeping on the floor
const DOG_COL = 44; // 'd'

/**
 * The cave as ASCII. `H` shadow, `S` spawn, `C` checkpoint, `G` exit, and entity letters:
 * `k` the stake, `f` brazier, `v` loose stalactite, `g` sleeping giant, `d` the dog.
 * The two pits are gaps in the floor.
 */
export function buildCaveRows(): string[] {
  const b = new LevelBuilder(LEVEL_COLS, 12);
  b.rect(0, FLOOR_ROW, LEVEL_COLS, 2, '#'); // floor
  b.rect(0, 0, LEVEL_COLS, 3, '#'); // ceiling
  for (const c of PITS) b.rect(c, FLOOR_ROW, 3, 2, '.');
  for (const c of SHADOW_COLS) b.rect(c, 7, 3, 3, 'H');
  for (const s of STALAGMITES) b.rect(s.col, FLOOR_ROW - s.h, s.w, s.h, '#');
  for (const c of STALACTITES) b.put(c, 3, '#');
  for (const c of FALLERS) b.put(c, 3, 'v');
  for (const c of BRAZIERS) b.put(c, 9, 'f');
  for (const c of GIANTS) b.put(c, 9, 'g');
  b.put(DOG_COL, 9, 'd');
  b.put(2, 9, 'S');
  for (const c of CHECKPOINT_COLS) b.put(c, 9, 'C');
  b.rect(DEN_COL, 6, 1, 4, 'k'); // tall, so it cannot be jumped over
  b.put(EXIT_COL, 8, 'G');
  b.put(EXIT_COL, 9, 'G');
  return b.toRows();
}
