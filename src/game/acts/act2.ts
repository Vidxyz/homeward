import { LevelBuilder } from '../levelBuilder';
import { parseLevel, tileAt, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import type { Body } from '../engine/physics';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_W, type InputState, type SfxName, type Vec } from '../types';
import { canSee } from './stealth';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[1];

const FLOOR_Y = 10 * TILE;
const PATROL_MIN = 8 * TILE;
const PATROL_MAX = 128 * TILE;
const SPEED = 28;
const PAUSE = 1.5;
const RANGE = 150;
const SEEN_AFTER = 0.7;
const GRACE = 1.5;

const SHADOW_COLS = [16, 38, 60, 82, 104, 126, 148];
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

class CaveAct implements ActInstance {
  readonly world;
  private t = 0;
  private x = 30 * TILE;
  private dir: 1 | -1 = 1;
  private pause = 0;
  private alert = 0;
  private grace = GRACE;
  private stepTimer = 0;

  constructor(private readonly level: Level) {
    this.world = makeWorld(level);
  }

  private isHidden(player: Body, input: InputState): boolean {
    const col = Math.floor((player.x + player.w / 2) / TILE);
    const row = Math.floor((player.y + player.h / 2) / TILE);
    return input.action && tileAt(this.level, col, row) === 'H';
  }

  update(dt: number, player: Body, input: InputState): ActFrame {
    this.t += dt;
    this.grace = Math.max(0, this.grace - dt);
    const sfx: SfxName[] = [];

    if (this.pause > 0) {
      this.pause -= dt;
    } else {
      this.x += this.dir * SPEED * dt;
      if (this.x >= PATROL_MAX) {
        this.x = PATROL_MAX;
        this.dir = -1;
        this.pause = PAUSE;
      } else if (this.x <= PATROL_MIN) {
        this.x = PATROL_MIN;
        this.dir = 1;
        this.pause = PAUSE;
      }
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfx.push('step');
        this.stepTimer = 1.1;
      }
    }

    const eye = { x: this.x, y: FLOOR_Y - 84 };
    const target = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    const seen =
      this.grace <= 0 && canSee(this.world, eye, this.dir, target, RANGE, this.isHidden(player, input));
    this.alert = seen ? Math.min(1, this.alert + dt / SEEN_AFTER) : Math.max(0, this.alert - dt / 1.2);

    return { push: 0, kill: this.alert >= 1, sfx };
  }

  reset(_respawn: Vec): number | undefined {
    this.alert = 0;
    this.grace = GRACE;
    return undefined;
  }

  drawBack(r: Parameters<ActInstance['drawBack']>[0], camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 70, 14, 0.015, 0.15, camX, this.t, 0);
    r.ridge(palette.mid, 100, 12, 0.025, 0.35, camX, this.t, 0);

    // Polyphemus: a dark giant walking along the back of the cave.
    const bob = this.pause > 0 ? 0 : Math.sin(this.t * 4) * 1.5;
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

  drawFront(r: Parameters<ActInstance['drawFront']>[0], _camX: number, _camY: number): void {
    r.screenRect(8, 8, 60, 7, '#000000', 0.5);
    r.screenRect(9, 9, 58 * this.alert, 5, '#e63946');
    r.text('SEEN', 72, 15, '#ffffff', 6, 'left', 0.8);
    if (this.t < 9) {
      r.text('Hold ACTION (X) in the shadows to hide', VIEW_W / 2, 30, '#ffffff', 7, 'center', Math.min(1, 9 - this.t));
    }
  }
}

export const act2: ActModule = {
  id: 2,
  name: "The Cyclops' Cave",
  intro: [
    'A cave. A mountain of a man. One great eye.',
    'Stay in the shadows. Let him pass. Be nobody.',
  ],
  palette,
  music: TRACKS[1],
  level: parseLevel(buildAct2()),
  create: (level) => new CaveAct(level),
};
