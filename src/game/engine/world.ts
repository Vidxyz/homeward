import { tileAt, type Level } from '../level';

export interface World {
  level: Level;
  cols: number;
  rows: number;
  solid(col: number, row: number): boolean;
  deadly(col: number, row: number): boolean;
  /** Y (px) of the water surface; anything with its feet below it dies. Infinity = no water line. */
  waterY(): number;
}

export interface WorldHooks {
  waterY?: () => number;
  /** Extra solid cells that come and go (crumbling platforms). Added to the tile solids. */
  solidOverride?: (col: number, row: number) => boolean;
}

export function makeWorld(level: Level, hooks: WorldHooks = {}): World {
  return {
    level,
    cols: level.cols,
    rows: level.rows,
    solid: (c, r) => tileAt(level, c, r) === '#' || (hooks.solidOverride?.(c, r) ?? false),
    deadly: (c, r) => {
      const ch = tileAt(level, c, r);
      return ch === '^' || ch === '~';
    },
    waterY: hooks.waterY ?? (() => Infinity),
  };
}
