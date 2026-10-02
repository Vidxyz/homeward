import type { World } from '../engine/world';
import { tileAt, type Level } from '../level';
import { TILE, type Vec } from '../types';

/** True when no solid tile lies on the segment between `a` and `b`. */
export function lineOfSight(world: World, a: Vec, b: Vec): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / 4);
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    if (world.solid(Math.floor((a.x + dx * f) / TILE), Math.floor((a.y + dy * f) / TILE))) return false;
  }
  return true;
}

/** A watcher looking along `dir` (1 = right, -1 = left) sees `target` within `range` px, unless hidden or blocked. */
export function canSee(
  world: World,
  eye: Vec,
  dir: 1 | -1,
  target: Vec,
  range: number,
  hidden: boolean,
): boolean {
  if (hidden) return false;
  const dx = target.x - eye.x;
  if (Math.sign(dx) !== dir) return false;
  if (Math.abs(dx) > range) return false;
  return lineOfSight(world, eye, target);
}

/** True when the whole body lies inside shadow (`H`) tiles, so the watcher cannot see it. */
export function isFullyInShadow(level: Level, b: { x: number; y: number; w: number; h: number }): boolean {
  const row = Math.floor((b.y + b.h / 2) / TILE);
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - 0.001) / TILE);
  for (let c = left; c <= right; c++) if (tileAt(level, c, row) !== 'H') return false;
  return true;
}
