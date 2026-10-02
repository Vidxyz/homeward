import { isHeard } from './noise';

export const SNORE_RADIUS = 90;
export const AWAKE_TIME = 6;

/** A giant asleep on the cave floor; a loud noise nearby wakes him for a while. */
export interface Giant {
  x: number;
  awake: boolean;
  timer: number;
  dir: 1 | -1;
}

export function makeGiant(x: number): Giant {
  return { x, awake: false, timer: 0, dir: 1 };
}

/** Returns true on the tick the giant is woken. */
export function nudgeGiant(g: Giant, noiseX: number, radius: number): boolean {
  if (g.awake) return false;
  if (!isHeard(g.x, noiseX, Math.min(radius, SNORE_RADIUS))) return false;
  g.awake = true;
  g.timer = AWAKE_TIME;
  g.dir = noiseX >= g.x ? 1 : -1;
  return true;
}

export function updateGiant(g: Giant, dt: number): void {
  if (!g.awake) return;
  g.timer -= dt;
  if (g.timer <= 0) g.awake = false;
}
