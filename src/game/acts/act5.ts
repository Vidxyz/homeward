import { parseLevel, type Level } from '../level';
import { TRACKS } from '../music';
import { PALETTES } from '../palettes';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import { makeWorld } from '../engine/world';
import { TILE, VIEW_W, overlaps, type InputState, type Rect, type SfxName, type Vec } from '../types';
import { BowGame, type BowEvent } from './ithaca/bow';
import { HALL_SCALE, HUNCH_SCALE, ROAD_SCALE, Stamina, Suspicion, looksSuspicious } from './ithaca/disguise';
import {
  drawArgos,
  drawBeggar,
  drawBowStage,
  drawHallBackdrop,
  drawSuitor,
  drawTable,
  drawTorch,
} from './ithaca/draw';
import { BOW_RACK_COL, FLOOR_Y, HALL_END, HALL_START, TABLES, buildIthacaRows } from './ithaca/layout';
import { SUITOR_RANGE, makeSuitor, updateSuitor, type Suitor } from './ithaca/suitors';
import { mulberry32 } from './pathGen';
import { canSee } from './stealth';
import type { ActFrame, ActInstance, ActModule } from './types';

const palette = PALETTES[4];

export { buildIthacaRows as buildAct5 };

const SFX_FOR: Record<BowEvent, SfxName> = {
  strung: 'perfect',
  weak: 'miss',
  slipped: 'miss',
  hit: 'perfect',
  miss: 'miss',
};

class IthacaAct implements ActInstance {
  readonly world;
  private t = 0;
  private readonly rng = mulberry32(5);
  private readonly suitors: Suitor[] = [];
  private readonly trees: number[] = [];
  private readonly torches: number[] = [];
  private readonly suspicion = new Suspicion();
  private readonly stamina = new Stamina();
  private argosX = 32 * TILE;
  private rack: Rect = { x: BOW_RACK_COL * TILE, y: 6 * TILE, w: TILE, h: 3 * TILE };
  private hunched = false;
  private seenNow = false;
  private bow: BowGame | null = null;
  private winTimer = 0;
  private hallHintAt = -1;
  private argosNear = false;
  private playerPos: Vec = { x: 0, y: 0 };

  constructor(private readonly level: Level) {
    this.world = makeWorld(level, {
      // The feasting tables are solid to walk into: hop them.
      solidOverride: (c, r) => r === 8 && TABLES.some((tb) => c >= tb.col && c < tb.col + tb.w),
    });
    for (const e of level.entities) {
      if (e.ch === 'u') this.suitors.push(makeSuitor(e.col * TILE + TILE / 2, this.rng));
      else if (e.ch === 't') this.trees.push(e.col);
      else if (e.ch === 'd') this.argosX = e.col * TILE;
    }
    for (let x = HALL_START * TILE + 40; x < HALL_END * TILE; x += 160) this.torches.push(x);
  }

  update(dt: number, player: Body, input: InputState): ActFrame {
    this.t += dt;
    const sfx: SfxName[] = [];
    const cx = player.x + player.w / 2;
    this.playerPos = { x: player.x, y: player.y };
    this.argosNear = Math.abs(cx - (this.argosX + 8)) < 44;

    // Walking pace: unhurried on the road; in the hall, hold ACTION to shuffle like a beggar.
    this.hunched = this.stamina.update(dt, input.action && this.bow === null);
    const inHall = player.x >= HALL_START * TILE - 8;
    player.speedScale = !inHall ? ROAD_SCALE : this.hunched ? HUNCH_SCALE : HALL_SCALE;
    if (inHall && this.hallHintAt < 0) this.hallHintAt = this.t;

    for (const s of this.suitors) updateSuitor(s, dt, this.rng);

    // The suitors only mind a beggar who does not act like one, and only when they can see him.
    let kill = false;
    if (inHall && this.bow === null) {
      const suspicious = looksSuspicious(Math.abs(player.vx), player.onGround, this.hunched);
      const target = { x: cx, y: player.y + player.h / 2 };
      const watched = this.suitors.some((s) =>
        canSee(this.world, { x: s.x, y: FLOOR_Y - 28 }, s.dir, target, SUITOR_RANGE, false),
      );
      this.seenNow = suspicious && watched;
      this.suspicion.update(dt, this.seenNow);
      kill = this.suspicion.blown;
    } else {
      this.seenNow = false;
      this.suspicion.update(dt, false);
    }

    // Reaching the bow starts the trial: the player is frozen while the minigame runs.
    if (this.bow === null && overlaps(player, this.rack)) this.bow = new BowGame();
    let complete = false;
    if (this.bow) {
      for (const e of this.bow.update(dt, input.action, input.jumpPressed)) sfx.push(SFX_FOR[e]);
      if (this.bow.stage === 'won') {
        this.winTimer += dt;
        if (this.winTimer > 1.8) complete = true;
      }
    }
    return { push: 0, kill, sfx, freeze: this.bow !== null, complete };
  }

  reset(_respawn: Vec): number | undefined {
    this.suspicion.reset();
    this.stamina.reset();
    this.bow = null;
    this.winTimer = 0;
    return undefined;
  }

  drawPlayer(r: Renderer, b: Body, alpha: number): boolean {
    if (!this.hunched) return false;
    drawBeggar(r, b, alpha);
    return true;
  }

  drawBack(r: Renderer, camX: number): void {
    r.sky(palette);
    const rise = Math.min(1, this.t / 40);
    r.circle(250 + camX, 120 - rise * 60, 22, palette.accent, true, 0.55);
    r.ridge(palette.far, 120, 10, 0.012, 0.15, camX, 0);
    r.ridge(palette.mid, 138, 8, 0.02, 0.35, camX, 0);

    for (const col of this.trees) {
      const x = col * TILE;
      r.rect(x + 6, FLOOR_Y - 22, 4, 30, '#5c4d36');
      r.rect(x - 4, FLOOR_Y - 36, 24, 16, '#6b8f71');
      r.rect(x, FLOOR_Y - 42, 16, 8, '#7fa386');
    }
    drawArgos(r, this.argosX, this.t);

    drawHallBackdrop(r);
    for (const x of this.torches) drawTorch(r, x, this.t);
    this.suitors.forEach((s, i) => drawSuitor(r, s, i, this.t, palette, true));
    for (const tb of TABLES) drawTable(r, tb.col, tb.w);

    // The great bow, hung on its rack.
    const bx = BOW_RACK_COL * TILE + 8;
    r.rect(bx - 6, FLOOR_Y - 40, 12, 3, '#4a331f');
    r.rect(bx - 6, FLOOR_Y - 36, 12, 36, '#3a2a22', 0.6);
    for (let i = 0; i < 28; i++) r.rect(bx - 2 + Math.round(Math.sin((i / 27) * Math.PI) * 4), FLOOR_Y - 38 + i, 2, 1, '#8a6a45');
    r.rect(bx - 2, FLOOR_Y - 38, 1, 28, '#d8d0b8', 0.7);
    if (this.bow === null) r.circle(bx, FLOOR_Y - 24, 18, palette.accent, true, 0.1 + 0.05 * Math.sin(this.t * 4));
  }

  drawFront(r: Renderer): void {
    // Planks over the hall floor.
    r.rect(HALL_START * TILE, FLOOR_Y, (HALL_END - HALL_START) * TILE, 4, '#6b4a2f');
    r.rect(HALL_START * TILE, FLOOR_Y + 4, (HALL_END - HALL_START) * TILE, 1, '#4a331f');

    if (this.argosNear) r.worldText('ARGOS KNOWS YOU. HUSH.', this.argosX + 8, FLOOR_Y - 20, '#ffffff', 1, 'center', 0.95);

    const inHall = this.playerPos.x >= HALL_START * TILE - 8 && this.bow === null;
    if (inHall) {
      r.screenRect(8, 8, 60, 7, '#000000', 0.5);
      r.screenRect(9, 9, 58 * this.suspicion.value, 5, '#e63946');
      r.text('SUSPICION', 74, 15, '#ffffff', 1, 'left', 0.9);
      r.screenRect(8, 20, 60, 5, '#000000', 0.5);
      r.screenRect(9, 21, 58 * this.stamina.value, 3, this.stamina.exhausted ? '#e08a3a' : '#6fb7e8');
      r.text(this.stamina.exhausted ? 'RESTING' : 'STOOP', 74, 25, '#ffffff', 1, 'left', 0.8);
      if (this.hunched) r.worldText('...', this.playerPos.x + 5, this.playerPos.y - 8, '#c9b79c', 1, 'center', 0.8);
    }

    if (this.bow) {
      drawBowStage(r, this.bow, this.t);
      return;
    }
    if (this.t < 6) {
      r.text('Walk home.', VIEW_W / 2, 30, '#ffffff', 1, 'center', Math.min(1, 6 - this.t));
    } else if (this.hallHintAt >= 0 && this.t - this.hallHintAt < 9) {
      r.text('Hold ACTION to stoop when watched. It tires you.', VIEW_W / 2, 176, '#ffffff', 1, 'center', Math.min(1, 9 - (this.t - this.hallHintAt)));
    }
  }
}

export const act5: ActModule = {
  id: 5,
  name: 'Ithaca',
  intro: [
    'Twenty years. Ithaca rises out of the morning mist.',
    'Your hall is full of suitors, feasting on all you own. Go in as a beggar, and let no one doubt it.',
    'Then string the great bow.',
  ],
  palette,
  music: TRACKS[4],
  level: parseLevel(buildIthacaRows()),
  create: (level) => new IthacaAct(level),
};
