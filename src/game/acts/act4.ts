import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import { streaks } from '../engine/fx';
import type { Body } from '../engine/physics';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_H, VIEW_W, type InputState, type Vec } from '../types';
import { finishPier, genPath, mulberry32 } from './pathGen';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[3];

const TELEGRAPH = 0.9;
const ACTIVE = 0.35;
const LIFETIME = 1.4;
const STRIKE_EVERY = 2.2;
const STRIKE_HALF_WIDTH = 10;

export function buildAct4(): string[] {
  const b = new LevelBuilder(220, 12);
  b.rect(0, 11, 220, 1, '~');
  b.rect(0, 8, 10, 4, '#');
  b.put(2, 7, 'S');
  const end = genPath(b, {
    startCol: 12,
    endCol: 190,
    startRow: 8,
    minRow: 6,
    maxRow: 9,
    minWidth: 4,
    maxWidth: 6,
    maxGap: (p) => (p < 0.5 ? 2 : 3),
    thickness: 2,
    seed: 44,
    checkpointEvery: 40,
  });
  const pierEnd = finishPier(b, end.col, end.row);
  return b.toRows(pierEnd);
}

interface Strike {
  x: number;
  age: number;
}

class StraitAct implements ActInstance {
  readonly world;
  private t = 0;
  private camX = 0;
  private scrolled = 0;
  private strikes: Strike[] = [];
  private nextStrike = STRIKE_EVERY;
  private rng = mulberry32(99);
  private readonly maxCamX: number;

  constructor(level: Level) {
    this.world = makeWorld(level);
    this.maxCamX = level.cols * TILE - VIEW_W;
  }

  update(dt: number, player: Body, _input: InputState): ActFrame {
    this.t += dt;
    this.scrolled += dt;
    const speed = 42 + Math.min(this.scrolled, 60) * 0.3;
    this.camX = Math.min(this.maxCamX, this.camX + speed * dt);

    // Clamp to the right edge of the screen.
    const maxX = this.camX + VIEW_W - player.w;
    if (player.x > maxX) {
      player.x = maxX;
      player.vx = Math.min(player.vx, 0);
    }

    this.nextStrike -= dt;
    if (this.nextStrike <= 0) {
      this.nextStrike = STRIKE_EVERY;
      const x = player.x + 24 + this.rng() * 48;
      this.strikes.push({ x: Math.min(this.camX + VIEW_W - 24, Math.max(this.camX + 40, x)), age: 0 });
    }

    let struck = false;
    for (const s of this.strikes) {
      s.age += dt;
      const active = s.age >= TELEGRAPH && s.age < TELEGRAPH + ACTIVE;
      if (active && player.x + player.w > s.x - STRIKE_HALF_WIDTH && player.x < s.x + STRIKE_HALF_WIDTH) {
        struck = true;
      }
    }
    this.strikes = this.strikes.filter((s) => s.age < LIFETIME);

    const caught = player.x + player.w < this.camX + 4;
    return { push: 0, kill: struck || caught, cameraX: this.camX };
  }

  reset(respawn: Vec): number | undefined {
    this.camX = Math.min(this.maxCamX, Math.max(0, respawn.x - 120));
    this.strikes = [];
    this.nextStrike = STRIKE_EVERY;
    this.scrolled = 0;
    return this.camX;
  }

  drawBack(r: Parameters<ActInstance['drawBack']>[0], camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 110, 16, 0.015, 0.2, camX, this.t, 0.8);
    r.ridge(palette.mid, 140, 10, 0.03, 0.45, camX, this.t, 1.4);
  }

  drawFront(r: Parameters<ActInstance['drawFront']>[0], _camX: number, _camY: number): void {
    for (const s of this.strikes) {
      if (s.age < TELEGRAPH) {
        const k = s.age / TELEGRAPH;
        r.rect(s.x - STRIKE_HALF_WIDTH, 0, STRIKE_HALF_WIDTH * 2, VIEW_H, palette.hazard, 0.08 + 0.22 * k);
        r.rect(s.x - STRIKE_HALF_WIDTH, 170, STRIKE_HALF_WIDTH * 2, 3, palette.hazard, 0.9);
      } else if (s.age < TELEGRAPH + ACTIVE) {
        r.rect(s.x - 6, 0, 12, 150, '#241c1c');
        r.rect(s.x - 12, 150, 24, 18, '#3d3535');
        r.rect(s.x - 8, 154, 3, 3, palette.accent);
        r.rect(s.x + 5, 154, 3, 3, palette.accent);
        for (let i = 0; i < 4; i++) r.rect(s.x - 10 + i * 6, 166, 3, 4, '#f2f2f2');
      }
    }

    // The whirlpool eats the left edge of the screen.
    for (let y = 0; y < VIEW_H; y += 4) {
      const w = 12 + Math.sin(this.t * 4 + y * 0.2) * 5 + Math.sin(this.t * 7 + y * 0.5) * 2;
      r.screenRect(0, y, w, 4, '#12090a');
      r.screenRect(w, y, 2, 4, palette.foam, 0.7);
    }
    streaks(r, this.t, { count: 28, color: palette.foam, vx: 90, vy: 0, len: 5, alpha: 0.3 });
  }
}

export const act4: ActModule = {
  id: 4,
  name: 'Scylla and Charybdis',
  intro: [
    'A narrow strait. Below, the whirlpool. Above, the six-headed hunger of Scylla.',
    'Do not stop. Do not look back.',
  ],
  palette,
  music: TRACKS[3],
  level: parseLevel(buildAct4()),
  create: (level) => new StraitAct(level),
};
