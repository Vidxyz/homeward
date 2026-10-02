import { VIEW_H, VIEW_W } from '../types';
import type { Renderer } from './renderer';

export interface StreakOptions {
  count: number;
  color: string;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
}

/** Cheap wrapping particles in screen space (rain, wind, embers). */
export function streaks(r: Renderer, t: number, o: StreakOptions): void {
  const horizontal = Math.abs(o.vx) > Math.abs(o.vy);
  for (let i = 0; i < o.count; i++) {
    const bx = (i * 97 + 13) % VIEW_W;
    const by = (i * 57 + 29) % VIEW_H;
    const x = (((bx + o.vx * t) % VIEW_W) + VIEW_W) % VIEW_W;
    const y = (((by + o.vy * t) % VIEW_H) + VIEW_H) % VIEW_H;
    r.screenRect(x, y, horizontal ? o.len : 1, horizontal ? 1 : o.len, o.color, o.alpha);
  }
}
