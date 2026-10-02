import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_W, overlaps, type InputState, type Rect, type SfxName, type Vec } from '../types';
import { Cyclops } from './cave/cyclops';
import { makeDog, updateDog, type Dog } from './cave/dog';
import {
  CYCLOPS_RANGE,
  GIANT_RANGE,
  drawBrazier,
  drawCyclops,
  drawDog,
  drawFaller,
  drawGiant,
  drawSheep,
  drawStake,
} from './cave/draw';
import { Flock } from './cave/flock';
import { makeGiant, nudgeGiant, updateGiant, type Giant } from './cave/giants';
import {
  fallerBox,
  litByBrazier,
  makeFaller,
  resetFaller,
  updateFaller,
  type Brazier,
  type Faller,
} from './cave/hazards';
import { DEN_COL, EXIT_COL, FLOOR_Y, PHASE2_START_COL, buildCaveRows } from './cave/layout';
import { CREEP_SCALE, NOISE_RADIUS, maskedByFlock, playerNoiseRadius } from './cave/noise';
import { mulberry32 } from './pathGen';
import { canSee, isHiddenInShadow } from './stealth';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[1];

const SEEN_AFTER = 0.7;
const GRACE = 1.5;
const CYCLOPS_START = 30 * TILE;
const SIGHTED_BOUNDS = { min: 8 * TILE, max: 92 * TILE };
const BLIND_START = 87 * TILE; // thrown back just a few steps from the den
const BLIND_BOUNDS = { min: 84 * TILE, max: 182 * TILE };
const SHEEP_HOMES = [16, 31, 48, 56, 64, 77, 87].map((c) => c * TILE);

export { buildCaveRows as buildAct2 };

interface Pulse {
  x: number;
  y: number;
  radius: number;
  masked: boolean;
  age: number;
}

type NoiseLabel = 'quiet' | 'noisy' | 'covered';

class CaveAct implements ActInstance {
  readonly world;
  private t = 0;
  private phase: 1 | 2 = 1;
  private phaseTime = 0;
  private readonly rng = mulberry32(7);

  private readonly cyclops: Cyclops;
  private readonly flock: Flock;
  private readonly dog: Dog;
  private readonly giants: Giant[] = [];
  private readonly fallers: Faller[] = [];
  private readonly braziers: Brazier[] = [];
  private readonly stake: Rect;

  private alert = 0;
  private grace = GRACE;
  private hidden = false;
  private noisyFor = 0;
  private noiseCooldown = 0;
  private bark = 0;
  private wasOnGround = true;
  private airTime = 0;
  private pulses: Pulse[] = [];
  private playerPos: Vec = { x: 0, y: 0 };
  private noiseLabel: NoiseLabel = 'quiet';

  constructor(private readonly level: Level) {
    this.world = makeWorld(level);
    this.cyclops = new Cyclops(CYCLOPS_START, SIGHTED_BOUNDS, this.rng);
    this.flock = new Flock(SHEEP_HOMES, this.rng);

    let dogCol = 44;
    let stakeMin = Infinity;
    let stakeMax = -Infinity;
    let stakeCol = DEN_COL;
    for (const e of level.entities) {
      const x = e.col * TILE + TILE / 2;
      if (e.ch === 'v') this.fallers.push(makeFaller(x));
      else if (e.ch === 'f') this.braziers.push({ x, phase: this.rng() * Math.PI * 2 });
      else if (e.ch === 'g') this.giants.push(makeGiant(x));
      else if (e.ch === 'd') dogCol = e.col;
      else if (e.ch === 'k') {
        stakeMin = Math.min(stakeMin, e.row);
        stakeMax = Math.max(stakeMax, e.row);
        stakeCol = e.col;
      }
    }
    this.dog = makeDog(dogCol * TILE, (dogCol - 2) * TILE, (dogCol + 16) * TILE);
    this.stake = { x: stakeCol * TILE, y: stakeMin * TILE, w: TILE, h: (stakeMax - stakeMin + 1) * TILE };
  }

  private blindTheCyclops(sfx: SfxName[]): void {
    this.phase = 2;
    this.phaseTime = 0;
    this.alert = 0;
    this.cyclops.blindHim(BLIND_START, BLIND_BOUNDS);
    this.flock.startStampede(PHASE2_START_COL * TILE, (EXIT_COL - 2) * TILE);
    sfx.push('howl');
  }

  update(dt: number, player: Body, input: InputState): ActFrame {
    this.t += dt;
    this.phaseTime += dt;
    this.grace = Math.max(0, this.grace - dt);
    this.bark = Math.max(0, this.bark - dt);
    this.noiseCooldown = Math.max(0, this.noiseCooldown - dt);
    this.noisyFor = Math.max(0, this.noisyFor - dt);
    const sfx: SfxName[] = [];

    player.speedScale = input.action ? CREEP_SCALE : 1; // ACTION = creep

    // What the player's movement sounds like this tick.
    const jumped = this.wasOnGround && !player.onGround && player.vy < -100;
    const landed = !this.wasOnGround && player.onGround && this.airTime > 0.2;
    this.airTime = player.onGround ? 0 : this.airTime + dt;
    this.wasOnGround = player.onGround;
    const speed = Math.abs(player.vx);
    let radius = playerNoiseRadius({ speed, onGround: player.onGround, jumped, landed });
    if (radius === NOISE_RADIUS.run) {
      if (this.noiseCooldown > 0) radius = 0;
      else this.noiseCooldown = 0.4;
    }
    const cx = player.x + player.w / 2;
    this.playerPos = { x: player.x, y: player.y };
    const masked = this.phase === 2 && maskedByFlock(cx, this.flock.xs());
    if (radius > 0) {
      this.noisyFor = 0.6;
      this.pulses.push({ x: cx, y: player.y + player.h / 2, radius, masked, age: 0 });
    }
    this.noiseLabel = this.noisyFor > 0 ? (masked ? 'covered' : 'noisy') : 'quiet';
    this.pulses = this.pulses.filter((p) => (p.age += dt) < 0.45);

    // Falling stalactites: loud, and deadly while they fall.
    let crushed = false;
    for (const f of this.fallers) {
      if (updateFaller(f, dt, cx) === 'crash') {
        sfx.push('crash');
        this.cyclops.hear(f.x, 320);
        for (const g of this.giants) if (this.phase === 1) nudgeGiant(g, f.x, NOISE_RADIUS.land);
      }
      const box = fallerBox(f);
      if (box && overlaps(player, box)) crushed = true;
    }

    this.cyclops.update(dt, sfx);

    if (this.phase === 1) {
      this.flock.update(dt, this.world, player, sfx, (x) => this.cyclops.hear(x));

      const bark = updateDog(this.dog, dt, { cx, onFloor: player.onGround }, input.action);
      if (bark === 'bark') {
        sfx.push('bark');
        this.bark = 0.8;
        this.cyclops.hear(this.dog.x);
      }

      for (const g of this.giants) {
        if (radius > 0 && nudgeGiant(g, cx, radius)) {
          sfx.push('howl');
          this.cyclops.hear(g.x);
        }
        updateGiant(g, dt);
      }

      const lit = litByBrazier(this.braziers, this.t, cx);
      this.hidden = isHiddenInShadow(this.level, player, speed, lit);
      const target = { x: cx, y: player.y + player.h / 2 };
      const seenByCyclops = canSee(
        this.world,
        { x: this.cyclops.x, y: FLOOR_Y - 84 },
        this.cyclops.dir,
        target,
        CYCLOPS_RANGE,
        this.hidden,
      );
      const seenByGiant = this.giants.some(
        (g) => g.awake && canSee(this.world, { x: g.x, y: FLOOR_Y - 58 }, g.dir, target, GIANT_RANGE, this.hidden),
      );
      const seen = this.grace <= 0 && (seenByCyclops || seenByGiant);
      this.alert = seen ? Math.min(1, this.alert + dt / SEEN_AFTER) : Math.max(0, this.alert - dt / 1.2);

      if (overlaps(player, this.stake)) this.blindTheCyclops(sfx);
    } else {
      this.hidden = false;
      this.flock.update(dt, this.world, player, sfx, (x) => this.cyclops.hear(x, 260));
      if (radius > 0 && !masked) this.cyclops.hear(cx, radius);
    }

    const grabbed = this.phase === 2 && this.grace <= 0 && this.cyclops.grabs(cx);
    return { push: 0, kill: this.alert >= 1 || crushed || grabbed, sfx };
  }

  reset(_respawn: Vec): number | undefined {
    this.alert = 0;
    this.grace = GRACE;
    this.hidden = false;
    this.pulses = [];
    this.wasOnGround = true;
    this.airTime = 0;
    for (const f of this.fallers) resetFaller(f);
    for (const g of this.giants) g.awake = false;
    if (this.phase === 2) {
      this.phaseTime = 0;
      this.cyclops.blindHim(BLIND_START, BLIND_BOUNDS);
      this.flock.startStampede(PHASE2_START_COL * TILE, (EXIT_COL - 2) * TILE);
    }
    return undefined;
  }

  drawBack(r: Renderer, camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 70, 14, 0.015, 0.15, camX, this.t, 0);
    r.ridge(palette.mid, 100, 12, 0.025, 0.35, camX, this.t, 0);

    for (const g of this.giants) drawGiant(r, g, this.t, palette);
    for (const b of this.braziers) drawBrazier(r, b.x, litByBrazier([b], this.t, b.x, 1), this.t, palette);
    drawCyclops(r, this.cyclops, this.t, palette, this.alert);
    if (this.phase === 1) drawStake(r, this.stake.x + TILE / 2, this.stake.y, this.t, palette);
  }

  drawFront(r: Renderer): void {
    for (const f of this.fallers) drawFaller(r, f, this.t);
    for (const s of this.flock.sheep) drawSheep(r, s, this.t);
    if (this.phase === 1) drawDog(r, this.dog, this.t, this.bark > 0);

    if (this.cyclops.mood === 'investigate' || this.cyclops.mood === 'hunt') {
      r.worldText('!', this.cyclops.x, FLOOR_Y - 106, palette.accent, 2, 'center');
    }
    if (this.hidden) r.worldText('HIDDEN', this.playerPos.x + 5, this.playerPos.y - 6, '#9fe3a8', 1, 'center', 0.9);

    // Noise rings: how far what you just did can be heard.
    for (const p of this.pulses) {
      const k = p.age / 0.45;
      r.circle(p.x, p.y, p.radius * (0.3 + 0.7 * k), p.masked ? '#8ac7ff' : '#ffffff', false, 0.35 * (1 - k));
    }

    // HUD.
    if (this.phase === 1) {
      r.screenRect(8, 8, 60, 7, '#000000', 0.5);
      r.screenRect(9, 9, 58 * this.alert, 5, '#e63946');
      r.text('SEEN', 74, 15, '#ffffff', 1, 'left', 0.9);
    }
    const colour = this.noiseLabel === 'noisy' ? '#ff8a80' : this.noiseLabel === 'covered' ? '#8ac7ff' : '#9fe3a8';
    r.text(this.noiseLabel.toUpperCase(), 9, 27, colour, 1, 'left', 0.95);

    const hint = this.hint();
    if (hint) r.text(hint.text, VIEW_W / 2, 176, '#ffffff', 1, 'center', Math.min(1, hint.fade));
  }

  private hint(): { text: string; fade: number } | null {
    const s = this.phaseTime;
    if (this.phase === 2) {
      return s < 8 ? { text: 'He hunts by sound. Creep. Stay near the sheep.', fade: 8 - s } : null;
    }
    if (s < 6) return { text: 'Hold ACTION to creep. Shadows need you still.', fade: 6 - s };
    if (s < 12) return { text: 'Dogs, sheep and falling rock are loud.', fade: 12 - s };
    if (s < 18) return { text: 'Creep to his den. Take the stake.', fade: 18 - s };
    return null;
  }
}

export const act2: ActModule = {
  id: 2,
  name: "The Cyclops' Cave",
  intro: [
    'A cave. A mountain of a man. One great eye.',
    'His flock is loud, his dog is keen, and the roof is loose. Creep to his den and take the stake.',
    'Then run. He will be blind, and he will be listening.',
  ],
  palette,
  music: TRACKS[1],
  level: parseLevel(buildCaveRows()),
  create: (level) => new CaveAct(level),
};
