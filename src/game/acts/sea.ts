import { TILE, VIEW_H } from '../types';

/** A reef wall two tiles thick with a gap that slides up and down. */
export interface Barrier {
  col: number;
  /** Centre of the gap's top edge (px) the motion oscillates around. */
  baseY: number;
  /** Gap height in tiles. */
  gapH: number;
  /** Oscillation amplitude (px). */
  amp: number;
  /** Oscillation speed (rad/s). */
  speed: number;
  phase: number;
}

export const BARRIER_W = 2 * TILE;
const EDGE = 24; // the gap never gets closer than this to the top or bottom of the sea

/** Y (px) of the top of the gap at time t. */
export function gapTop(b: Barrier, t: number): number {
  const y = b.baseY + b.amp * Math.sin(b.speed * t + b.phase);
  return Math.min(VIEW_H - EDGE - b.gapH * TILE, Math.max(EDGE, y));
}

/** Does a ship hitbox hit the reef wall (anywhere but the gap) at time t? */
export function shipHitsBarrier(box: { x: number; y: number; w: number; h: number }, b: Barrier, t: number): boolean {
  const x0 = b.col * TILE;
  if (box.x + box.w <= x0 || box.x >= x0 + BARRIER_W) return false;
  const top = gapTop(b, t);
  return box.y < top || box.y + box.h > top + b.gapH * TILE;
}

/** The background current: three incommensurate waves, so it never visibly repeats. Velocities in px/s. */
export function swellAt(x: number, t: number): { vx: number; vy: number } {
  return {
    vy:
      14 * Math.sin(t * 1.1 + x * 0.012) +
      10 * Math.sin(t * 2.3 + x * 0.031 + 1.7) +
      8 * Math.sin(t * 0.37 + x * 0.005 + 4.1),
    vx: 6 * Math.sin(t * 0.8 + x * 0.02 + 2.2),
  };
}

/** The strength of a sudden gust `age` seconds into a gust lasting `duration`: a smooth swell and fade. */
export function gustPush(age: number, duration: number, strength: number): number {
  if (age < 0 || age > duration) return 0;
  return strength * Math.sin((Math.PI * age) / duration);
}
