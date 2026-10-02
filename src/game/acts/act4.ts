import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import { streaks } from '../engine/fx';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_H, VIEW_W, overlaps, type InputState, type SfxName, type Vec } from '../types';
import { CrumblePlatform, type CrumbleSpec } from './strait/crumble';
import { logActive, logBox, spawnLog, updateLog, type Log } from './strait/debris';
import { chooseKind, planVolley, volleyEvery, warnTime } from './strait/strikes';
import { scrollSpeed, whirlpoolPull } from './strait/whirlpool';
import { finishPier, genPath, mulberry32 } from './pathGen';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[3];

const ACTIVE = 0.35;
const STRIKE_HALF_WIDTH = 10;
const LOGS_FROM = 0.65; // thrown wreckage starts this far through the act
const LOG_EVERY = 3.2;
const FOLLOW_AHEAD = 200; // the screen is never more than this far behind a player who runs ahead
const START_GRACE = 1.5; // at the start and after each respawn the screen holds still while you get moving

interface Layout {
  rows: string[];
  crumbles: CrumbleSpec[];
}

/**
 * The strait: narrow rock platforms over the sea. Some are cracked and crumble underfoot (they are removed from
 * the tile map and handled as `CrumblePlatform`s); some wide ones carry a spike to jump. Checkpoint platforms
 * are always solid and spike-free.
 */
export function layoutAct4(): Layout {
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
    minWidth: 3,
    maxWidth: 5,
    maxGap: (p) => (p < 0.3 ? 2 : 3),
    thickness: 2,
    seed: 44,
    checkpointEvery: 40,
  });

  const snapshot = b.toRows();
  const rng = mulberry32(404);
  const crumbles: CrumbleSpec[] = [];
  end.platforms.forEach((p, i) => {
    if (i < 2 || i >= end.platforms.length - 2) return;
    if (snapshot[p.row - 1]?.[p.col + 1] === 'C') return; // keep checkpoint platforms safe
    const progress = (p.col - 12) / 178;
    if (rng() < 0.25 + 0.35 * progress) {
      b.rect(p.col, p.row, p.width, 2, '.');
      crumbles.push({ col: p.col, row: p.row, width: p.width, thickness: 2 });
    } else if (p.width >= 5 && progress > 0.1 && rng() < 0.4) {
      // A spike to hop over. A full-speed jump over a short gap can land up to ~3 tiles in, so only put one on
      // the 4th tile, and only after a gap of 2+: the landing is then always clear of it.
      const prev = end.platforms[i - 1];
      const gap = p.col - (prev.col + prev.width);
      if (gap >= 2) b.put(p.col + 3, p.row - 1, '^');
    }
  });

  const pierEnd = finishPier(b, end.col, end.row);
  return { rows: b.toRows(pierEnd), crumbles };
}

export function buildAct4(): string[] {
  return layoutAct4().rows;
}

interface Strike {
  x: number;
  age: number;
  warn: number;
}

class StraitAct implements ActInstance {
  readonly world;
  private t = 0;
  private camX = 0;
  private strikes: Strike[] = [];
  private nextVolley = 2.2;
  private grace = START_GRACE;
  private logs: Log[] = [];
  private nextLog = LOG_EVERY;
  private readonly rng = mulberry32(99);
  private readonly maxCamX: number;
  private readonly crumbles: CrumblePlatform[];

  constructor(
    level: Level,
    specs: CrumbleSpec[],
  ) {
    this.crumbles = specs.map((s) => new CrumblePlatform(s));
    this.world = makeWorld(level, {
      solidOverride: (c, r) => this.crumbles.some((p) => p.solid && p.covers(c, r)),
    });
    this.maxCamX = level.cols * TILE - VIEW_W;
  }

  private progress(): number {
    return Math.min(1, this.camX / this.maxCamX);
  }

  update(dt: number, player: Body, _input: InputState): ActFrame {
    this.t += dt;
    const sfx: SfxName[] = [];
    const progress = this.progress();
    if (this.grace > 0) this.grace -= dt;
    else this.camX = Math.min(this.maxCamX, this.camX + scrollSpeed(progress) * dt);
    // Run ahead and the screen follows, so the right edge is never a wall you can get trapped against.
    this.camX = Math.min(this.maxCamX, Math.max(this.camX, player.x + player.w / 2 - FOLLOW_AHEAD));

    // The right edge of the screen is a wall.
    const maxX = this.camX + VIEW_W - player.w;
    if (player.x > maxX) {
      player.x = maxX;
      player.vx = Math.min(player.vx, 0);
    }

    // Cracked platforms start to give way once stood on.
    const feet = player.y + player.h;
    for (const c of this.crumbles) {
      const s = c.spec;
      const standing =
        player.onGround &&
        Math.abs(feet - s.row * TILE) < 2 &&
        player.x + player.w > s.col * TILE &&
        player.x < (s.col + s.width) * TILE;
      c.update(dt, standing);
    }

    // Scylla's volleys aim where you are going, and escalate into patterns.
    this.nextVolley -= dt;
    if (this.nextVolley <= 0) {
      this.nextVolley = volleyEvery(progress);
      const warn = warnTime(progress);
      const xs = planVolley(player.x + player.w / 2, player.vx, warn, chooseKind(progress, this.rng));
      for (const x of xs) {
        this.strikes.push({ x: Math.min(this.camX + VIEW_W - 16, Math.max(this.camX + 24, x)), age: 0, warn });
      }
    }

    let struck = false;
    for (const s of this.strikes) {
      const before = s.age;
      s.age += dt;
      if (before < s.warn && s.age >= s.warn) sfx.push('crash');
      const active = s.age >= s.warn && s.age < s.warn + ACTIVE;
      if (active && player.x + player.w > s.x - STRIKE_HALF_WIDTH && player.x < s.x + STRIKE_HALF_WIDTH) {
        struck = true;
      }
    }
    this.strikes = this.strikes.filter((s) => s.age < s.warn + ACTIVE + 0.2);

    // Late in the strait, Charybdis hurls wreckage along the rocks.
    let hit = false;
    if (progress > LOGS_FROM) {
      this.nextLog -= dt;
      if (this.nextLog <= 0) {
        this.nextLog = LOG_EVERY;
        this.logs.push(spawnLog(this.camX, feet));
      }
    }
    for (const l of this.logs) {
      updateLog(l, dt);
      const box = logBox(l);
      if (box && overlaps(player, box)) hit = true;
    }
    this.logs = this.logs.filter((l) => l.x + l.w > this.camX - 20);

    const dist = player.x - this.camX;
    const caught = this.grace <= 0 && player.x + player.w < this.camX + 4;
    const pull = this.grace > 0 ? 0 : whirlpoolPull(dist);
    return { push: pull, kill: struck || hit || caught, cameraX: this.camX, sfx };
  }

  reset(respawn: Vec): number | undefined {
    this.camX = Math.min(this.maxCamX, Math.max(0, respawn.x - 120));
    this.strikes = [];
    this.logs = [];
    this.nextVolley = 2.2;
    this.nextLog = LOG_EVERY;
    this.grace = START_GRACE;
    for (const c of this.crumbles) c.reset();
    return this.camX;
  }

  drawBack(r: Renderer, camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 110, 16, 0.015, 0.2, camX, this.t, 0.8);
    r.ridge(palette.mid, 140, 10, 0.03, 0.45, camX, this.t, 1.4);
    for (const c of this.crumbles) this.drawCrumble(r, c);
  }

  private drawCrumble(r: Renderer, c: CrumblePlatform): void {
    if (c.fall > 70) return;
    const s = c.spec;
    const shake = c.state === 'shaking' ? Math.sin(this.t * 70) * 1.2 : 0;
    const x = s.col * TILE + shake;
    const y = s.row * TILE + c.fall;
    const w = s.width * TILE;
    const alpha = c.state === 'fallen' ? Math.max(0, 1 - c.fall / 70) : 1;
    r.rect(x, y, w, s.thickness * TILE, palette.solid, alpha);
    r.rect(x, y, w, 3, palette.solidTop, alpha);
    r.rect(x, y + s.thickness * TILE - 2, w, 2, palette.solidDark, alpha);
    // cracks, so it reads as unreliable rock
    for (let i = 0; i < s.width; i++) {
      r.rect(x + i * TILE + 5, y + 5, 1, 9, palette.solidDark, alpha);
      r.rect(x + i * TILE + 6, y + 10, 4, 1, palette.solidDark, alpha);
    }
  }

  drawFront(r: Renderer, camX: number): void {
    for (const s of this.strikes) {
      if (s.age < s.warn) {
        const k = s.age / s.warn;
        r.rect(s.x - STRIKE_HALF_WIDTH, 0, STRIKE_HALF_WIDTH * 2, VIEW_H, palette.hazard, 0.08 + 0.22 * k);
        r.rect(s.x - STRIKE_HALF_WIDTH, 170, STRIKE_HALF_WIDTH * 2, 3, palette.hazard, 0.9);
      } else if (s.age < s.warn + ACTIVE) {
        r.rect(s.x - 6, 0, 12, 150, '#241c1c');
        r.rect(s.x - 12, 150, 24, 18, '#3d3535');
        r.rect(s.x - 8, 154, 3, 3, palette.accent);
        r.rect(s.x + 5, 154, 3, 3, palette.accent);
        for (let i = 0; i < 4; i++) r.rect(s.x - 10 + i * 6, 166, 3, 4, '#f2f2f2');
      }
    }

    // Thrown wreckage: a warning chevron at the right edge, then the log.
    for (const l of this.logs) {
      if (!logActive(l)) {
        const blink = Math.floor(l.age * 10) % 2 === 0 ? 0.9 : 0.4;
        const y = l.y - camX * 0; // y is in world space, but the strait never scrolls vertically
        for (let k = 0; k < 6; k++) {
          r.screenRect(VIEW_W - 14 + k, y + 4 - k, 2, 2, palette.hazard, blink);
          r.screenRect(VIEW_W - 14 + k, y + 4 + k, 2, 2, palette.hazard, blink);
        }
      } else {
        r.rect(l.x, l.y, l.w, l.h, '#5a3a1e');
        r.rect(l.x, l.y, l.w, 2, '#8a6a45');
        r.rect(l.x + l.w - 4, l.y + 2, 3, l.h - 4, '#3a2412');
      }
    }

    // The whirlpool eats the left edge of the screen, and drags at anything close.
    for (let y = 0; y < VIEW_H; y += 4) {
      const w = 12 + Math.sin(this.t * 4 + y * 0.2) * 5 + Math.sin(this.t * 7 + y * 0.5) * 2;
      r.screenRect(0, y, w, 4, '#12090a');
      r.screenRect(w, y, 2, 4, palette.foam, 0.7);
    }
    streaks(r, this.t, { count: 28, color: palette.foam, vx: 90, vy: 0, len: 5, alpha: 0.3 });
    streaks(r, this.t, { count: 16, color: palette.foam, vx: -140, vy: 0, len: 7, alpha: 0.25 }); // the drag

    if (this.t < 5) r.text('Scylla aims ahead. Stay on the move.', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 5 - this.t));
    else if (this.t < 10) r.text('Cracked rock crumbles underfoot.', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 10 - this.t));
  }
}

const layout = layoutAct4();

export const act4: ActModule = {
  id: 4,
  name: 'Scylla and Charybdis',
  intro: [
    'A narrow strait. Below, the whirlpool. Above, the six-headed hunger of Scylla.',
    'She aims where you are going, and the cracked rock will not hold you. Do not stop. Do not look back.',
  ],
  palette,
  music: TRACKS[3],
  level: parseLevel(layout.rows),
  create: (level) => new StraitAct(level, layout.crumbles),
};
