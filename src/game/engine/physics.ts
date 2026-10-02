import { TILE, type InputState, type Vec } from '../types';
import type { World } from './world';

export const PHYS = {
  gravity: 900,
  maxFall: 360,
  speed: 90,
  accelGround: 1100,
  accelAir: 700,
  jumpV: -300,
  airJumpV: -270, // an extra jump in mid-air is a little weaker than the first
  jumpCutV: -110,
  coyote: 0.1,
  buffer: 0.1,
} as const;

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  coyote: number;
  buffer: number;
  speedScale: number;
  /** How many extra jumps in mid-air this body may make before it lands (0 = none). Set by the act. */
  maxAirJumps: number;
  /** Extra jumps used since last standing on something. */
  airJumps: number;
  /** Seconds since the last mid-air jump, for drawing a puff. */
  airJumpAge: number;
  /** Position at the start of the last step; used for render interpolation. */
  px: number;
  py: number;
}

export interface StepResult {
  died: boolean;
  jumped: boolean;
  landed: boolean;
  /** True on the tick of a mid-air jump (which also counts as `jumped`). */
  airJumped: boolean;
}

/** A 10x14 body standing on the tile whose top-left corner is `pos`. */
export function bodyAt(pos: Vec): Body {
  const w = 10;
  const h = 14;
  const x = pos.x + (TILE - w) / 2;
  const y = pos.y + TILE - h;
  return {
    x, y, w, h,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    coyote: 0,
    buffer: 0,
    speedScale: 1,
    maxAirJumps: 0,
    airJumps: 0,
    airJumpAge: 99,
    px: x,
    py: y,
  };
}

const EPS = 0.001;

function approach(v: number, target: number, delta: number): number {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

function overlapsSolid(b: Body, w: World): boolean {
  const c0 = Math.floor(b.x / TILE);
  const c1 = Math.floor((b.x + b.w - EPS) / TILE);
  const r0 = Math.floor(b.y / TILE);
  const r1 = Math.floor((b.y + b.h - EPS) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (w.solid(c, r)) return true;
  return false;
}

/** Hazards use a slightly smaller box so near-misses feel fair. */
function overlapsDeadly(b: Body, w: World): boolean {
  const c0 = Math.floor((b.x + 2) / TILE);
  const c1 = Math.floor((b.x + b.w - 2 - EPS) / TILE);
  const r0 = Math.floor((b.y + 3) / TILE);
  const r1 = Math.floor((b.y + b.h - 1 - EPS) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (w.deadly(c, r)) return true;
  return false;
}

export function stepBody(
  b: Body,
  inp: Pick<InputState, 'left' | 'right' | 'jump' | 'jumpPressed'>,
  w: World,
  dt: number,
  push = 0,
): StepResult {
  b.px = b.x;
  b.py = b.y;
  b.airJumpAge += dt;

  const dir = Number(inp.right) - Number(inp.left);
  if (dir !== 0) b.facing = dir > 0 ? 1 : -1;
  const accel = (b.onGround ? PHYS.accelGround : PHYS.accelAir) * dt;
  b.vx = approach(b.vx, dir * PHYS.speed * b.speedScale, accel);

  b.coyote = b.onGround ? PHYS.coyote : Math.max(0, b.coyote - dt);
  b.buffer = inp.jumpPressed ? PHYS.buffer : Math.max(0, b.buffer - dt);

  let jumped = false;
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = PHYS.jumpV;
    b.buffer = 0;
    b.coyote = 0;
    b.onGround = false;
    jumped = true;
  }
  let airJumped = false;
  if (!jumped && inp.jumpPressed && !b.onGround && b.coyote <= 0 && b.airJumps < b.maxAirJumps) {
    b.vy = PHYS.airJumpV;
    b.airJumps++;
    b.airJumpAge = 0;
    b.buffer = 0;
    jumped = true;
    airJumped = true;
  }
  if (!inp.jump && b.vy < PHYS.jumpCutV) b.vy = PHYS.jumpCutV;
  b.vy = Math.min(b.vy + PHYS.gravity * dt, PHYS.maxFall);

  const dx = (b.vx + push) * dt;
  b.x += dx;
  if (dx !== 0 && overlapsSolid(b, w)) {
    if (dx > 0) b.x = Math.floor((b.x + b.w - EPS) / TILE) * TILE - b.w;
    else b.x = (Math.floor(b.x / TILE) + 1) * TILE;
    b.vx = 0;
  }

  const wasGround = b.onGround;
  b.onGround = false;
  const dy = b.vy * dt;
  b.y += dy;
  if (dy !== 0 && overlapsSolid(b, w)) {
    if (dy > 0) {
      b.y = Math.floor((b.y + b.h - EPS) / TILE) * TILE - b.h;
      b.onGround = true;
    } else {
      b.y = (Math.floor(b.y / TILE) + 1) * TILE;
    }
    b.vy = 0;
  }

  if (b.onGround) b.airJumps = 0;

  const died = overlapsDeadly(b, w) || b.y > w.rows * TILE || b.y + b.h > w.waterY();
  return { died, jumped, landed: !wasGround && b.onGround, airJumped };
}
