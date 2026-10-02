import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import { streaks } from '../engine/fx';
import type { Body } from '../engine/physics';
import { makeWorld } from '../engine/world';
import { VIEW_W, type InputState, type SfxName, type Vec } from '../types';
import { finishPier, genPath } from './pathGen';
import { Rhythm } from './rhythm';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[2];

const PERIOD = 1.6;
const WINDOW = 0.16;
const SURGE = 0.55;
const PROTECT = 1.3;
const BASE_PULL = -30;
const SURGE_PULL = -120;

export function buildAct3(): string[] {
  const b = new LevelBuilder(180, 12);
  b.rect(0, 11, 180, 1, '~');
  b.rect(0, 8, 10, 4, '#');
  b.put(2, 7, 'S');
  const end = genPath(b, {
    startCol: 12,
    endCol: 150,
    startRow: 8,
    minRow: 6,
    maxRow: 9,
    minWidth: 3,
    maxWidth: 5,
    maxGap: 2,
    thickness: 2,
    seed: 33,
    checkpointEvery: 30,
  });
  const pierEnd = finishPier(b, end.col, end.row);
  return b.toRows(pierEnd);
}

class SirensAct implements ActInstance {
  readonly world;
  private t = 0;
  private readonly rhythm = new Rhythm(PERIOD, WINDOW);
  private protectedUntil = 0;
  private lastBeat = -1;

  constructor(level: Level) {
    this.world = makeWorld(level);
  }

  update(dt: number, _player: Body, input: InputState): ActFrame {
    this.t += dt;
    const sfx: SfxName[] = [];

    const beat = Math.floor(this.t / PERIOD);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      sfx.push('beat');
    }

    if (input.actionPressed) {
      if (this.rhythm.isOnBeat(this.t)) {
        this.protectedUntil = this.t + PROTECT;
        sfx.push('perfect');
      } else {
        sfx.push('miss');
      }
    }

    const surging = this.t % PERIOD < SURGE;
    const steady = this.t < this.protectedUntil;
    const push = steady ? 0 : surging ? SURGE_PULL : BASE_PULL;
    return { push, kill: false, sfx };
  }

  reset(_respawn: Vec): number | undefined {
    this.protectedUntil = 0;
    return undefined;
  }

  drawBack(r: Parameters<ActInstance['drawBack']>[0], camX: number): void {
    r.sky(palette);
    r.circle(240 - camX * 0.02, 60, 26, palette.accent, true, 0.35);
    r.ridge(palette.far, 128, 6, 0.02, 0.2, camX, this.t, 1);
    r.ridge(palette.mid, 146, 7, 0.03, 0.4, camX, this.t, 1.6);
    // Distant singing rocks.
    for (let i = 0; i < 4; i++) {
      const x = 200 + i * 38 - camX * 0.1;
      r.screenRect(x, 112 - (i % 2) * 8, 10, 30, '#1a3a5c', 0.8);
    }
  }

  drawFront(r: Parameters<ActInstance['drawFront']>[0], _camX: number, _camY: number, player: Body): void {
    streaks(r, this.t, { count: 24, color: '#ffffff', vx: -70, vy: 0, len: 6, alpha: 0.25 });

    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const steady = this.t < this.protectedUntil;
    if (steady) {
      r.circle(cx, cy, 11, palette.accent, false, 0.9);
    } else {
      // The ring closes on the player exactly on the beat.
      const untilBeat = PERIOD - (this.t % PERIOD);
      r.circle(cx, cy, 8 + (untilBeat / PERIOD) * 34, '#ffffff', false, 0.85);
    }
    if (this.t < 10) {
      r.text('Press ACTION (X) as the ring closes', VIEW_W / 2, 30, '#ffffff', 7, 'center', Math.min(1, 10 - this.t));
    }
  }
}

export const act3: ActModule = {
  id: 3,
  name: 'The Sirens',
  intro: [
    'The sea turns gold. A song drifts over the water, and it knows your name.',
    'Keep your own time. Do not let their rhythm carry you away.',
  ],
  palette,
  music: TRACKS[2],
  level: parseLevel(buildAct3()),
  create: (level) => new SirensAct(level),
};
