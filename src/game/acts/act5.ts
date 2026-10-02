import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import type { Body } from '../engine/physics';
import { makeWorld } from '../engine/world';
import { VIEW_W, type Vec } from '../types';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[4];

export function buildAct5(): string[] {
  const b = new LevelBuilder(100, 12);
  b.rect(0, 9, 100, 3, '#');
  b.put(2, 8, 'S');
  for (const [col, w] of [[22, 6], [40, 4], [58, 8]]) b.rect(col, 8, w, 1, '#');
  for (const col of [8, 15, 32, 47, 52, 70, 76, 84]) b.put(col, 8, 't');
  b.put(92, 8, 'd');
  b.put(96, 7, 'G');
  b.put(96, 8, 'G');
  return b.toRows();
}

class IthacaAct implements ActInstance {
  readonly world;
  private t = 0;

  constructor(private readonly level: Level) {
    this.world = makeWorld(level);
  }

  update(dt: number, player: Body): ActFrame {
    this.t += dt;
    player.speedScale = 0.7; // an unhurried walk home
    return { push: 0, kill: false };
  }

  reset(_respawn: Vec): number | undefined {
    return undefined;
  }

  drawBack(r: Parameters<ActInstance['drawBack']>[0], camX: number): void {
    r.sky(palette);
    const rise = Math.min(1, this.t / 40);
    r.circle(250 + camX, 120 - rise * 60, 22, palette.accent, true, 0.55);
    r.ridge(palette.far, 120, 10, 0.012, 0.15, camX, 0);
    r.ridge(palette.mid, 138, 8, 0.02, 0.35, camX, 0);

    for (const e of this.level.entities) {
      const x = e.col * 16;
      const y = e.row * 16;
      if (e.ch === 't') {
        r.rect(x + 6, y - 14, 4, 30, '#5c4d36');
        r.rect(x - 4, y - 28, 24, 16, '#6b8f71');
        r.rect(x, y - 34, 16, 8, '#7fa386');
      } else if (e.ch === 'd') {
        const wag = Math.sin(this.t * 10) * 2;
        r.rect(x, y + 6, 14, 6, '#8a6a45'); // body
        r.rect(x - 4, y + 2, 7, 6, '#8a6a45'); // head
        r.rect(x + 1, y + 12, 3, 4, '#8a6a45'); // legs
        r.rect(x + 10, y + 12, 3, 4, '#8a6a45');
        r.rect(x + 14, y + 4 + wag, 3, 2, '#8a6a45'); // tail
      }
    }
  }

  drawFront(r: Parameters<ActInstance['drawFront']>[0]): void {
    if (this.t < 8) {
      r.text('Walk home.', VIEW_W / 2, 30, '#ffffff', 8, 'center', Math.min(1, 8 - this.t));
    }
  }
}

export const act5: ActModule = {
  id: 5,
  name: 'Ithaca',
  intro: [
    'Twenty years. Ithaca rises out of the morning mist.',
    'The hardest part is over. Walk home.',
  ],
  palette,
  music: TRACKS[4],
  level: parseLevel(buildAct5()),
  create: (level) => new IthacaAct(level),
};
