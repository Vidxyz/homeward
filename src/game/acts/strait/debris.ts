import { VIEW_W, type Rect } from '../../types';

const LOG_W = 28;
const LOG_H = 8;
const LOG_SPEED = -120;
const WARN = 0.8;

/** A log thrown across the strait from the right. It is telegraphed first, then flies at the player's feet. */
export interface Log {
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  age: number;
  warn: number;
}

export function spawnLog(camX: number, playerFeetY: number): Log {
  return { x: camX + VIEW_W + 40, y: playerFeetY - LOG_H, vx: LOG_SPEED, w: LOG_W, h: LOG_H, age: 0, warn: WARN };
}

export function logActive(l: Log): boolean {
  return l.age >= l.warn;
}

export function updateLog(l: Log, dt: number): void {
  l.age += dt;
  if (logActive(l)) l.x += l.vx * dt;
}

export function logBox(l: Log): Rect | null {
  return logActive(l) ? { x: l.x, y: l.y, w: l.w, h: l.h } : null;
}
