import { LevelBuilder } from '../levelBuilder';
import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import { streaks } from '../engine/fx';
import { makeWorld } from '../engine/world';
import { VIEW_H, VIEW_W, type Vec } from '../types';
import { finishPier, genPath } from './pathGen';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[0];

export function buildAct1(): string[] {
  const b = new LevelBuilder(180, 12);
  b.rect(0, 8, 10, 4, '#'); // spawn pier: top at row 8, never submerged
  b.put(2, 7, 'S');
  const end = genPath(b, {
    startCol: 12,
    endCol: 150,
    startRow: 8,
    minRow: 6,
    maxRow: (p) => (p > 0.92 ? 8 : 10),
    minWidth: 2,
    maxWidth: 4,
    maxGap: (p) => (p < 0.4 ? 2 : 3),
    seed: 11,
    checkpointEvery: 36,
    checkpointMaxRow: 8,
  });
  const pierEnd = finishPier(b, end.col, end.row);
  return b.toRows(pierEnd);
}

class StormAct implements ActInstance {
  readonly world;
  private t = 0;

  constructor(level: Level) {
    this.world = makeWorld(level, { waterY: () => this.waterY() });
  }

  /** The tide rises and falls: rows 9-10 are periodically submerged, row 8 and above never are. */
  private waterY(): number {
    return 176 - 40 * (0.5 + 0.5 * Math.sin(this.t * 0.785));
  }

  update(dt: number): ActFrame {
    this.t += dt;
    return { push: 0, kill: false };
  }

  reset(_respawn: Vec): number | undefined {
    return undefined;
  }

  drawBack(r: Parameters<ActInstance['drawBack']>[0], camX: number): void {
    r.sky(palette);
    r.ridge(palette.far, 118, 10, 0.02, 0.2, camX, this.t, 1.2);
    r.ridge(palette.mid, 138, 8, 0.03, 0.4, camX, this.t, 1.8);
    const flash = Math.sin(this.t * 0.9) * Math.sin(this.t * 2.3 + 1);
    if (flash > 0.93) r.screenRect(0, 0, VIEW_W, VIEW_H, '#ffffff', 0.18);
  }

  drawFront(r: Parameters<ActInstance['drawFront']>[0], camX: number): void {
    const y = this.waterY();
    r.rect(camX - 2, y, VIEW_W + 4, VIEW_H, palette.water, 0.78);
    for (let i = 0; i < VIEW_W; i += 4) {
      r.rect(camX + i, y - 1 + Math.sin(this.t * 3 + i * 0.3) * 1.5, 4, 2, palette.foam, 0.8);
    }
    streaks(r, this.t, { count: 40, color: '#9fc3d1', vx: -30, vy: 300, len: 4, alpha: 0.45 });
  }
}

export const act1: ActModule = {
  id: 1,
  name: 'The Storm',
  intro: [
    'Ten years the war took. Ten more, the sea will take.',
    "Poseidon's storm has broken your ships. Only you and the wreckage remain.",
    'Reach the shore.',
  ],
  palette,
  music: TRACKS[0],
  level: parseLevel(buildAct1()),
  create: (level) => new StormAct(level),
};
