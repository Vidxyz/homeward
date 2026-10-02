import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_W, type InputState, type SfxName, type Vec } from '../types';
import { mulberry32 } from './pathGen';
import { resolveSheep } from './sheep';
import { canSee, isFullyInShadow } from './stealth';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[1];

const FLOOR_Y = 10 * TILE;
const PATROL_MIN = 8 * TILE;
const PATROL_MAX = 128 * TILE;
const RANGE = 150;
const SEEN_AFTER = 0.7;
const GRACE = 1.5;
const HEARING = 520; // how far a bleat carries
const INVESTIGATE_SPEED = 55;

const SHEEP_W = 14;
const SHEEP_H = 10;
const SHEEP_SPEED = 14;
const SHEEP_ROAM = 64;
const SHEEP_HOMES = [21, 32, 56, 66, 78, 100, 122].map((c) => c * TILE);

const SHADOW_COLS = [5, 16, 38, 60, 82, 104, 126, 148];
const CHECKPOINT_COLS = [36, 80, 124];
const STALAGMITES = [
  { col: 27, w: 2, h: 1 }, { col: 31, w: 1, h: 2 }, { col: 47, w: 2, h: 2 }, { col: 52, w: 1, h: 1 },
  { col: 69, w: 2, h: 1 }, { col: 73, w: 1, h: 2 }, { col: 91, w: 2, h: 2 }, { col: 96, w: 1, h: 1 },
  { col: 113, w: 2, h: 1 }, { col: 118, w: 1, h: 2 }, { col: 134, w: 2, h: 2 }, { col: 139, w: 1, h: 1 },
];
const STALACTITES = [20, 44, 68, 92, 116, 140];

export function buildAct2(): string[] {
  const b = new LevelBuilder(160, 12);
  b.rect(0, 10, 160, 2, '#'); // floor, top at row 10
  b.rect(0, 0, 160, 3, '#'); // ceiling
  for (const c of SHADOW_COLS) b.rect(c, 7, 3, 3, 'H');
  for (const s of STALAGMITES) b.rect(s.col, 10 - s.h, s.w, s.h, '#');
  for (const c of STALACTITES) b.put(c, 3, '#');
  b.put(2, 9, 'S');
  for (const c of CHECKPOINT_COLS) b.put(c, 9, 'C');
  b.put(156, 8, 'G');
  b.put(156, 9, 'G');
  return b.toRows();
}

type Mood = 'walk' | 'pause' | 'investigate';

interface Sheep {
  x: number;
  home: number;
  dir: 1 | -1;
  moving: boolean;
  timer: number;
  nextBleat: number;
  cooldown: number;
  bleatFor: number;
}

class CaveAct implements ActInstance {
  readonly world;
  private t = 0;
  private readonly rng = mulberry32(7);

  // Polyphemus
  private x = 30 * TILE;
  private dir: 1 | -1 = 1;
  private mood: Mood = 'walk';
  private timer = 3;
  private speed = 28;
  private scan = false;
  private scanTimer = 0;
  private target = 0;
  private stepTimer = 0;
  private alert = 0;
  private grace = GRACE;
  private hidden = false;
  private playerPos: Vec = { x: 0, y: 0 };

  private readonly sheep: Sheep[];

  constructor(private readonly level: Level) {
    this.world = makeWorld(level);
    this.sheep = SHEEP_HOMES.map((home) => ({
      x: home,
      home,
      dir: this.rng() < 0.5 ? 1 : -1,
      moving: false,
      timer: 0.5 + this.rng() * 2,
      nextBleat: 7 + this.rng() * 8,
      cooldown: 0,
      bleatFor: 0,
    }));
  }

  /** A loud noise at world x: if it carries far enough, the Cyclops goes to see what it was. */
  private hear(x: number): void {
    if (Math.abs(x - this.x) < HEARING) {
      this.mood = 'investigate';
      this.target = x;
    }
  }

  private bleat(s: Sheep, sfx: SfxName[]): void {
    s.bleatFor = 0.9;
    sfx.push('bleat');
    this.hear(s.x);
  }

  private startWalking(): void {
    this.mood = 'walk';
    this.timer = 1 + this.rng() * 2.5;
    this.speed = 22 + this.rng() * 18;
  }

  /** Erratic behaviour: keep going, suddenly reverse, or stop and look around. */
  private decide(): void {
    const r = this.rng();
    if (r < 0.4) {
      this.startWalking();
    } else if (r < 0.65) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.startWalking();
    } else {
      this.mood = 'pause';
      this.timer = 0.5 + this.rng() * 1.5;
      this.scan = this.rng() < 0.5;
      this.scanTimer = 0.6;
    }
  }

  private moveCyclops(dt: number, speed: number, sfx: SfxName[], stepEvery: number): void {
    this.x += this.dir * speed * dt;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      sfx.push('step');
      this.stepTimer = stepEvery;
    }
    if (this.x >= PATROL_MAX || this.x <= PATROL_MIN) {
      this.dir = this.x >= PATROL_MAX ? -1 : 1;
      this.x = Math.min(PATROL_MAX, Math.max(PATROL_MIN, this.x));
      this.mood = 'pause';
      this.timer = 0.8;
      this.scan = false;
    }
  }

  private updateCyclops(dt: number, sfx: SfxName[]): void {
    if (this.mood === 'walk') {
      this.moveCyclops(dt, this.speed, sfx, 1.1);
      this.timer -= dt;
      if (this.mood === 'walk' && this.timer <= 0) this.decide();
    } else if (this.mood === 'pause') {
      this.timer -= dt;
      if (this.scan) {
        this.scanTimer -= dt;
        if (this.scanTimer <= 0) {
          this.dir = this.dir === 1 ? -1 : 1;
          this.scanTimer = 0.6;
        }
      }
      if (this.timer <= 0) this.startWalking();
    } else {
      this.dir = this.target >= this.x ? 1 : -1;
      this.moveCyclops(dt, INVESTIGATE_SPEED, sfx, 0.6);
      if (this.mood === 'investigate' && Math.abs(this.target - this.x) < 20) {
        this.mood = 'pause';
        this.timer = 2;
        this.scan = true;
        this.scanTimer = 0.5;
      }
    }
  }

  private updateSheep(dt: number, player: Body, sfx: SfxName[]): void {
    for (const s of this.sheep) {
      s.timer -= dt;
      s.cooldown = Math.max(0, s.cooldown - dt);
      s.bleatFor = Math.max(0, s.bleatFor - dt);
      s.nextBleat -= dt;

      if (s.timer <= 0) {
        s.moving = this.rng() < 0.6;
        if (s.moving) s.dir = this.rng() < 0.5 ? 1 : -1;
        s.timer = 1 + this.rng() * 2;
      }
      if (s.moving) {
        const nx = s.x + s.dir * SHEEP_SPEED * dt;
        const frontX = s.dir > 0 ? nx + SHEEP_W : nx;
        const blocked = this.world.solid(Math.floor(frontX / TILE), 9) || Math.abs(nx - s.home) > SHEEP_ROAM;
        if (blocked) s.dir = s.dir === 1 ? -1 : 1;
        else s.x = nx;
      }
      if (s.nextBleat <= 0) {
        s.nextBleat = 7 + this.rng() * 8;
        this.bleat(s, sfx);
      }

      // Sheep are solid. Bumping or landing on one makes it bleat, and the Cyclops hears.
      const contact = resolveSheep(player, { x: s.x, y: FLOOR_Y - SHEEP_H, w: SHEEP_W, h: SHEEP_H });
      if (contact !== 'none' && s.cooldown <= 0) {
        s.cooldown = 1.5;
        this.bleat(s, sfx);
      }
    }
  }

  update(dt: number, player: Body, _input: InputState): ActFrame {
    this.t += dt;
    this.grace = Math.max(0, this.grace - dt);
    const sfx: SfxName[] = [];

    this.updateCyclops(dt, sfx);
    this.updateSheep(dt, player, sfx);
    this.playerPos = { x: player.x, y: player.y };

    const eye = { x: this.x, y: FLOOR_Y - 84 };
    const target = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    this.hidden = isFullyInShadow(this.level, player);
    const seen = this.grace <= 0 && canSee(this.world, eye, this.dir, target, RANGE, this.hidden);
    this.alert = seen ? Math.min(1, this.alert + dt / SEEN_AFTER) : Math.max(0, this.alert - dt / 1.2);

    return { push: 0, kill: this.alert >= 1, sfx };
  }

  reset(_respawn: Vec): number | undefined {
    this.alert = 0;
    this.grace = GRACE;
    return undefined;
  }

  drawBack(r: Renderer, camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 70, 14, 0.015, 0.15, camX, this.t, 0);
    r.ridge(palette.mid, 100, 12, 0.025, 0.35, camX, this.t, 0);

    // Polyphemus: a dark giant walking along the back of the cave.
    const moving = this.mood !== 'pause';
    const bob = moving ? Math.sin(this.t * (this.mood === 'investigate' ? 8 : 4)) * 1.5 : 0;
    const x = this.x;
    const top = FLOOR_Y - 96 + bob;
    const body = '#0b0605';
    r.rect(x - 20, top + 28, 40, 50, body); // torso
    r.rect(x - 14, top + 76, 12, 20, body); // legs
    r.rect(x + 2, top + 76, 12, 20, body);
    r.rect(x - 14, top + 4, 28, 26, body); // head
    r.rect(x - 28, top + 30, 10, 40, body); // arms
    r.rect(x + 18, top + 30, 10, 40, body);
    r.rect(x - this.dir * 34, top + 10, 8, 70, '#1a100b'); // club
    r.circle(x + this.dir * 6, top + 16, 4, palette.accent, true, 0.9 + 0.1 * Math.sin(this.t * 6));

    // Faint sight wedge so the player can read where he is looking.
    for (let d = 0; d < RANGE; d += 8) {
      const bx = this.dir > 0 ? x + d : x - d - 8;
      r.rect(bx, top + 14 + d * 0.45, 8, 6 + d * 0.3, palette.accent, 0.05 + this.alert * 0.1);
    }
  }

  private drawSheep(r: Renderer, s: Sheep): void {
    const x = Math.round(s.x);
    const y = FLOOR_Y - SHEEP_H;
    const step = s.moving && Math.floor(this.t * 6) % 2 === 0 ? 1 : 0;
    r.rect(x + 2, y + 8, 2, 2 - step, '#2a2420'); // legs
    r.rect(x + 9, y + 8, 2, 2 - (1 - step), '#2a2420');
    r.rect(x, y + 1, 12, 7, '#e8e2d4'); // wool
    r.rect(x + 1, y, 10, 2, '#f5f1e6');
    r.rect(x + 3, y + 3, 2, 2, '#d3ccbb');
    r.rect(x + 7, y + 4, 2, 2, '#d3ccbb');
    const hx = s.dir > 0 ? x + 11 : x - 3; // head
    r.rect(hx, y + 2, 5, 5, '#2a2420');
    r.rect(hx + (s.dir > 0 ? 3 : 0), y + 3, 1, 1, '#e8e2d4');
    if (s.bleatFor > 0) r.worldText('BAA!', x + 7, y - 4, '#ffffff', 1, 'center', Math.min(1, s.bleatFor * 2));
  }

  drawFront(r: Renderer, camX: number): void {
    for (const s of this.sheep) this.drawSheep(r, s);

    if (this.mood === 'investigate') {
      r.worldText('!', this.x, FLOOR_Y - 106, palette.accent, 2, 'center');
    }
    if (this.hidden) r.worldText('HIDDEN', this.playerPos.x + 5, this.playerPos.y - 6, '#9fe3a8', 1, 'center', 0.9);

    r.screenRect(8, 8, 60, 7, '#000000', 0.5);
    r.screenRect(9, 9, 58 * this.alert, 5, '#e63946');
    r.text('SEEN', 74, 15, '#ffffff', 1, 'left', 0.9);

    if (this.t < 7) {
      r.text('Stand fully inside a shadow to hide', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 7 - this.t));
    } else if (this.t < 14) {
      r.text('Sheep bleat when bumped. He hears it.', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 14 - this.t));
    }
    void camX;
  }
}

export const act2: ActModule = {
  id: 2,
  name: "The Cyclops' Cave",
  intro: [
    'A cave. A mountain of a man. One great eye.',
    'He paces without pattern, and his flock is loud. Slip into the shadows. Be nobody.',
  ],
  palette,
  music: TRACKS[1],
  level: parseLevel(buildAct2()),
  create: (level) => new CaveAct(level),
};
