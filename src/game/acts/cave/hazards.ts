import type { Rect } from '../../types';

const CEILING_Y = 48; // underside of the cave ceiling (row 3)
const FLOOR_Y = 160;
const TRIGGER = 22; // how close (px) the player has to be underneath to set it off
const SHAKE_TIME = 0.7;
const GRAVITY = 700;

export type FallState = 'hanging' | 'shaking' | 'falling' | 'fallen';

/** A stalactite that works loose when someone walks beneath it. */
export interface Faller {
  x: number;
  len: number;
  y: number;
  vy: number;
  state: FallState;
  timer: number;
}

export function makeFaller(x: number, len = 28): Faller {
  return { x, len, y: CEILING_Y, vy: 0, state: 'hanging', timer: 0 };
}

export function resetFaller(f: Faller): void {
  f.y = CEILING_Y;
  f.vy = 0;
  f.state = 'hanging';
  f.timer = 0;
}

/** Advances the stalactite; returns 'crash' on the tick it hits the floor. */
export function updateFaller(f: Faller, dt: number, playerX: number): 'crash' | null {
  if (f.state === 'hanging') {
    if (Math.abs(playerX - f.x) < TRIGGER) {
      f.state = 'shaking';
      f.timer = SHAKE_TIME;
    }
  } else if (f.state === 'shaking') {
    f.timer -= dt;
    if (f.timer <= 0) f.state = 'falling';
  } else if (f.state === 'falling') {
    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y + f.len >= FLOOR_Y) {
      f.y = FLOOR_Y - f.len;
      f.state = 'fallen';
      return 'crash';
    }
  }
  return null;
}

/** The deadly area while it is falling; null otherwise. */
export function fallerBox(f: Faller): Rect | null {
  return f.state === 'falling' ? { x: f.x - 5, y: f.y, w: 10, h: f.len } : null;
}

/** Braziers flare and dim; while flared they light up the area around them. */
export function brazierLit(t: number, phase: number): boolean {
  return Math.sin(t * 0.9 + phase) > 0.1;
}

export interface Brazier {
  x: number;
  phase: number;
}

export function litByBrazier(braziers: Brazier[], t: number, x: number, radius = 80): boolean {
  return braziers.some((b) => brazierLit(t, b.phase) && Math.abs(b.x - x) <= radius);
}
