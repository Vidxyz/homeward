import type { World } from '../../engine/world';
import { TILE, type SfxName } from '../../types';
import { resolveSheep, type Mover } from '../sheep';

export const SHEEP_W = 14;
export const SHEEP_H = 10;
const FLOOR_Y = 10 * TILE;
const GRAZE_SPEED = 14;
const ROAM = 64;

export interface Sheep {
  x: number;
  /** Horizontal velocity (px/s); non-zero only while stampeding. */
  vx: number;
  home: number;
  dir: 1 | -1;
  moving: boolean;
  timer: number;
  nextBleat: number;
  cooldown: number;
  bleatFor: number;
}

export type FlockMode = 'graze' | 'stampede';

/** The Cyclops's sheep. They graze about solid and noisy; when the Cyclops is blinded they stampede. */
export class Flock {
  mode: FlockMode = 'graze';
  readonly sheep: Sheep[];
  private startX = 0;
  private endX = 0;

  constructor(
    homes: number[],
    private readonly rng: () => number,
  ) {
    this.sheep = homes.map((home) => this.makeSheep(home, home));
  }

  private makeSheep(x: number, home: number): Sheep {
    return {
      x,
      vx: 0,
      home,
      dir: this.rng() < 0.5 ? 1 : -1,
      moving: false,
      timer: 0.5 + this.rng() * 2,
      nextBleat: 7 + this.rng() * 8,
      cooldown: 0,
      bleatFor: 0,
    };
  }

  /** Four tight clusters of four, each running right at its own speed, circling round to the start. */
  startStampede(startX: number, endX: number): void {
    this.mode = 'stampede';
    this.startX = startX;
    this.endX = endX;
    this.sheep.length = 0;
    const gap = (endX - startX) / 4;
    for (let k = 0; k < 4; k++) {
      const speed = 58 + this.rng() * 14;
      for (let j = 0; j < 4; j++) {
        const s = this.makeSheep(startX + k * gap + j * 22, startX);
        s.vx = speed + (this.rng() - 0.5) * 4;
        s.moving = true;
        this.sheep.push(s);
      }
    }
  }

  xs(): number[] {
    return this.sheep.map((s) => s.x);
  }

  /**
   * Moves the sheep and resolves the player against them. `onBleat(x)` is called when a sheep is bumped
   * by the player: that is the only bleat loud enough to alert the Cyclops.
   */
  update(dt: number, world: World, player: Mover, sfx: SfxName[], onBleat: (x: number) => void): void {
    for (const s of this.sheep) {
      s.cooldown = Math.max(0, s.cooldown - dt);
      s.bleatFor = Math.max(0, s.bleatFor - dt);
      s.nextBleat -= dt;

      if (this.mode === 'graze') {
        this.graze(s, dt, world);
        if (s.nextBleat <= 0) {
          s.nextBleat = 7 + this.rng() * 8;
          this.bleat(s, sfx); // idle bleating is just noise: it does not alert anyone
        }
      } else {
        s.x += s.vx * dt;
        if (s.x > this.endX) s.x = this.startX - this.rng() * 40;
        if (s.nextBleat <= 0) {
          s.nextBleat = 3 + this.rng() * 5;
          this.bleat(s, sfx);
        }
      }

      const contact = resolveSheep(player, { x: s.x, y: FLOOR_Y - SHEEP_H, w: SHEEP_W, h: SHEEP_H });
      if (contact === 'top' && s.vx !== 0) player.x += s.vx * dt; // ride the stampede
      if (contact !== 'none' && s.cooldown <= 0) {
        s.cooldown = 1.5;
        this.bleat(s, sfx);
        onBleat(s.x);
      }
    }
  }

  private bleat(s: Sheep, sfx: SfxName[]): void {
    s.bleatFor = 0.9;
    sfx.push('bleat');
  }

  private graze(s: Sheep, dt: number, world: World): void {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.moving = this.rng() < 0.6;
      if (s.moving) s.dir = this.rng() < 0.5 ? 1 : -1;
      s.timer = 1 + this.rng() * 2;
    }
    if (!s.moving) return;
    const nx = s.x + s.dir * GRAZE_SPEED * dt;
    const frontX = s.dir > 0 ? nx + SHEEP_W : nx;
    const frontCol = Math.floor(frontX / TILE);
    const blocked = world.solid(frontCol, 9) || !world.solid(frontCol, 10) || Math.abs(nx - s.home) > ROAM;
    if (blocked) s.dir = s.dir === 1 ? -1 : 1;
    else s.x = nx;
  }
}
