import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import { streaks } from '../engine/fx';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_H, VIEW_W, type InputState, type SfxName, type Vec } from '../types';
import { mulberry32 } from './pathGen';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[0];

const SHIP_W = 24;
const SHIP_H = 12;
const MAX_VX = 80;
const MAX_VY = 70;
const ACCEL = 400;

const BOLT_EVERY = 2.8;
const BOLT_WARN = 1.0;
const BOLT_FLASH = 0.25;
const BOLT_RADIUS = 22;

/**
 * A sea chart: rows of reef (`#`) with a gap the ship must find, loose rocks in the open water between,
 * checkpoint buoys (`C`) inside some gaps, and a shore at the far end (`G` column, then land).
 */
export function buildAct1(): string[] {
  const b = new LevelBuilder(220, 12);
  const rng = mulberry32(11);
  b.put(3, 6, 'S');

  let gapRow = 5;
  let n = 0;
  for (let col = 16; col < 176; col += 9 + Math.floor(rng() * 3)) {
    const progress = (col - 16) / 160;
    const gapH = progress < 0.35 ? 4 : 3;
    gapRow = Math.min(11 - gapH, Math.max(1, gapRow + Math.floor(rng() * 9) - 4));
    for (let r = 0; r < 12; r++) if (r < gapRow || r >= gapRow + gapH) b.rect(col, r, 2, 1, '#');
    // A buoy gate on the interior rows of the gap, so a respawn always has clear water on both sides.
    if (n % 3 === 2) for (let r = gapRow + 1; r <= gapRow + gapH - 2; r++) b.put(col - 2, r, 'C');
    // Loose rocks in the open water just past the reef, kept out of the lane the gap opens onto.
    const loose = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < loose; i++) {
      const rr = 1 + Math.floor(rng() * 10);
      if (rr >= gapRow - 1 && rr <= gapRow + gapH) continue;
      b.rect(col + 4 + Math.floor(rng() * 2), rr, 1 + Math.floor(rng() * 2), 1, '#');
    }
    n++;
  }

  for (let r = 0; r < 12; r++) b.put(197, r, 'G');
  b.rect(198, 0, 22, 12, '#'); // the shore
  return b.toRows();
}

interface Bolt {
  x: number;
  y: number;
  age: number;
  thundered: boolean;
}

function approach(v: number, target: number, delta: number): number {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

class StormAct implements ActInstance {
  readonly world;
  private t = 0;
  private bolts: Bolt[] = [];
  private nextBolt = 4;
  private readonly rng = mulberry32(21);
  private readonly landX: number;

  constructor(private readonly level: Level) {
    this.world = makeWorld(level);
    this.landX = level.goal.x + TILE;
  }

  update(dt: number, player: Body): ActFrame {
    this.t += dt;
    player.w = SHIP_W;
    player.h = SHIP_H;
    const sfx: SfxName[] = [];

    // Lightning starts once the ship is out of the opening bay.
    this.nextBolt -= dt;
    if (this.nextBolt <= 0 && player.x > 20 * TILE) {
      this.nextBolt = BOLT_EVERY;
      this.bolts.push({ x: player.x + 40 + this.rng() * 90, y: 20 + this.rng() * 150, age: 0, thundered: false });
    }

    let struck = false;
    for (const bolt of this.bolts) {
      bolt.age += dt;
      if (bolt.age >= BOLT_WARN && !bolt.thundered) {
        bolt.thundered = true;
        sfx.push('thunder');
      }
      if (bolt.age >= BOLT_WARN && bolt.age < BOLT_WARN + BOLT_FLASH) {
        const dx = player.x + player.w / 2 - bolt.x;
        const dy = player.y + player.h / 2 - bolt.y;
        if (Math.hypot(dx, dy) < BOLT_RADIUS) struck = true;
      }
    }
    this.bolts = this.bolts.filter((bolt) => bolt.age < BOLT_WARN + BOLT_FLASH + 0.2);
    return { push: 0, kill: struck, sfx };
  }

  /** Sailing: free movement in four directions (Up = jump key, Down = action key), shoved by the swell. */
  drive(dt: number, player: Body, input: InputState): { died: boolean } {
    player.px = player.x;
    player.py = player.y;
    const tx = (Number(input.right) - Number(input.left)) * MAX_VX;
    const swell = Math.sin(this.t * 1.1 + player.x * 0.012) * 14;
    const ty = (Number(input.action) - Number(input.jump)) * MAX_VY + swell;
    player.vx = approach(player.vx, tx, ACCEL * dt);
    player.vy = approach(player.vy, ty, ACCEL * dt);
    if (input.right) player.facing = 1;
    player.onGround = false;

    player.x = Math.max(0, player.x + player.vx * dt);
    let died = this.hitsRock(player);
    player.y = Math.min(VIEW_H - 4 - player.h, Math.max(4, player.y + player.vy * dt));
    died = died || this.hitsRock(player);
    return { died };
  }

  private hitsRock(b: Body): boolean {
    const c0 = Math.floor((b.x + 3) / TILE);
    const c1 = Math.floor((b.x + b.w - 3) / TILE);
    const r0 = Math.floor((b.y + 2) / TILE);
    const r1 = Math.floor((b.y + b.h - 2) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.world.solid(c, r)) return true;
    return false;
  }

  reset(_respawn: Vec): number | undefined {
    this.bolts = [];
    this.nextBolt = 3;
    return undefined;
  }

  drawPlayer(r: Renderer, b: Body, alpha: number, time: number): boolean {
    const x = Math.round(b.px + (b.x - b.px) * alpha);
    const y = Math.round(b.py + (b.y - b.py) * alpha + Math.sin(time * 5));
    r.rect(x - 12, y + 9, 12, 2, palette.foam, 0.45); // wake
    r.rect(x - 20, y + 10, 8, 1, palette.foam, 0.25);
    r.rect(x, y + 6, 24, 5, '#5a3a1e'); // hull
    r.rect(x, y + 6, 24, 1, '#8a6a45');
    r.rect(x + 2, y + 11, 20, 1, '#3a2412');
    r.rect(x + 24, y + 7, 2, 3, '#5a3a1e'); // prow
    r.rect(x + 11, y - 4, 2, 10, '#3a2412'); // mast
    r.rect(x + 13, y - 3, 9, 8, '#efe6d0'); // sail
    r.rect(x + 13, y, 9, 2, '#b3342b');
    r.rect(x + 5, y + 2, 3, 3, '#e0ac82'); // Odysseus at the steering oar
    r.rect(x + 5, y + 5, 3, 2, '#b3342b');
    const oar = Math.floor(time * 6) % 2;
    r.rect(x + 4 + oar * 6, y + 11, 1, 3, '#3a2412'); // oars
    r.rect(x + 14 + oar * 6, y + 11, 1, 3, '#3a2412');
    return true;
  }

  drawBack(r: Renderer, camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 30, 5, 0.03, 0.5, camX, this.t, 1.5);
    r.ridge(palette.mid, 80, 6, 0.04, 0.8, camX, this.t, 1.9);
    r.ridge(palette.far, 130, 6, 0.035, 1.0, camX, this.t, 1.3);
    streaks(r, this.t, { count: 50, color: palette.foam, vx: -45, vy: 0, len: 8, alpha: 0.22 });
  }

  drawFront(r: Renderer, camX: number, camY: number): void {
    // Surf on the reef edges.
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(this.level.cols - 1, Math.floor((camX + VIEW_W) / TILE));
    for (let row = 0; row < this.level.rows; row++) {
      for (let c = c0; c <= c1; c++) {
        if (this.world.solid(c, row) && c * TILE < this.landX) {
          if (!this.world.solid(c - 1, row)) r.rect(c * TILE - 1, row * TILE, 1, TILE, palette.foam, 0.5);
          if (!this.world.solid(c + 1, row)) r.rect(c * TILE + TILE, row * TILE, 1, TILE, palette.foam, 0.5);
        }
      }
    }

    // The shore.
    r.rect(this.landX, 0, VIEW_W + 64, VIEW_H, '#d8c28a');
    r.rect(this.landX - 4 + Math.sin(this.t * 2) * 2, 0, 4, VIEW_H, palette.foam, 0.8);
    r.rect(this.landX + 40, 96, 4, 52, '#6b4a2f');
    r.rect(this.landX + 26, 88, 32, 6, '#4e8f4a');
    r.rect(this.landX + 32, 82, 20, 6, '#5fa85a');

    // Lightning: a shrinking warning ring, then the strike.
    for (const bolt of this.bolts) {
      if (bolt.age < BOLT_WARN) {
        const k = bolt.age / BOLT_WARN;
        r.circle(bolt.x, bolt.y, BOLT_RADIUS + (1 - k) * 22, '#ff6b6b', false, 0.4 + 0.5 * k);
        r.circle(bolt.x, bolt.y, 2, '#ff6b6b', true, 0.8);
      } else if (bolt.age < BOLT_WARN + BOLT_FLASH) {
        r.rect(bolt.x - 1, 0, 3, bolt.y, '#ffffff');
        r.rect(bolt.x - 5, bolt.y - 3, 11, 6, '#fff6c2');
        r.circle(bolt.x, bolt.y, BOLT_RADIUS, '#fff6c2', true, 0.35);
        r.screenRect(0, 0, VIEW_W, VIEW_H, '#ffffff', 0.14);
      }
    }
    streaks(r, this.t, { count: 40, color: '#9fc3d1', vx: -30, vy: 300, len: 4, alpha: 0.4 });

    if (this.t < 9) {
      r.text('Arrows steer the ship. Find the gaps in the reef.', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 9 - this.t));
    }
  }
}

export const act1: ActModule = {
  id: 1,
  name: 'The Storm',
  intro: [
    'Ten years the war took. Ten more, the sea will take.',
    "Poseidon's storm has scattered your fleet. One ship remains, and the reefs are everywhere.",
    'Steer for the shore.',
  ],
  palette,
  music: TRACKS[0],
  level: parseLevel(buildAct1()),
  create: (level) => new StormAct(level),
};
