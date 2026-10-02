import type { Body } from '../../engine/physics';
import type { Renderer } from '../../engine/renderer';
import type { Palette } from '../../palettes';
import { ODYSSEUS } from '../../sprites';
import { VIEW_H, VIEW_W } from '../../types';
import { GREEN_MAX, GREEN_MIN, SHOT_TIME, type BowGame } from './bow';
import { FLOOR_Y, HALL_END, HALL_START } from './layout';
import { SUITOR_RANGE, type Suitor } from './suitors';
import { TILE } from '../../types';

const ROBES = ['#7a2e2e', '#2e4a7a', '#4a6a3a', '#7a5a2e', '#5a2e6a', '#2e6a6a'];

/** The hall's interior: a dim, warm space behind everything, with a rug down the middle. */
export function drawHallBackdrop(r: Renderer): void {
  const x0 = HALL_START * TILE;
  const w = (HALL_END - HALL_START) * TILE;
  r.rect(x0, 5 * TILE, w, 4 * TILE, '#2a1a14', 0.82);
  r.rect(x0, 5 * TILE, w, 3, '#3a2418');
  for (let x = x0 + 24; x < x0 + w; x += 96) {
    r.rect(x, 5 * TILE + 8, 20, 36, '#4a2e22'); // hanging tapestries
    r.rect(x + 3, 5 * TILE + 12, 14, 4, '#c9a24a');
    r.rect(x + 3, 5 * TILE + 22, 14, 3, '#c9a24a');
  }
}

export function drawTorch(r: Renderer, x: number, t: number): void {
  r.rect(x - 1, 5 * TILE + 44, 3, 12, '#4a3a32');
  const h = 6 + Math.round(Math.sin(t * 11 + x) * 2);
  r.rect(x - 3, 5 * TILE + 44 - h, 7, h, '#ff9f1c', 0.9);
  r.rect(x - 1, 5 * TILE + 44 - h + 2, 3, Math.max(2, h - 3), '#ffe08a', 0.9);
  r.circle(x, 5 * TILE + 38, 34, '#ff9f1c', true, 0.05);
}

export function drawTable(r: Renderer, col: number, w: number): void {
  const x = col * TILE;
  r.rect(x, FLOOR_Y - 16, w * TILE, 4, '#8a6a45'); // top
  r.rect(x, FLOOR_Y - 12, w * TILE, 2, '#5a3a1e');
  r.rect(x + 2, FLOOR_Y - 10, 3, 10, '#4a331f'); // legs
  r.rect(x + w * TILE - 5, FLOOR_Y - 10, 3, 10, '#4a331f');
  for (let i = 0; i < w; i++) {
    r.rect(x + i * TILE + 3, FLOOR_Y - 20, 5, 4, '#d8d0b8'); // plates
    r.rect(x + i * TILE + 10, FLOOR_Y - 22, 3, 6, '#c9a24a'); // goblets
  }
}

export function drawSuitor(r: Renderer, s: Suitor, index: number, t: number, p: Palette, watching: boolean): void {
  const robe = ROBES[index % ROBES.length];
  const x = Math.round(s.x);
  const sway = Math.sin(t * 1.5 + index) * 1;
  r.rect(x - 5, FLOOR_Y - 26 + sway, 10, 16, robe); // body, seated at the table
  r.rect(x - 4, FLOOR_Y - 10, 9, 10, '#3a2a22'); // stool and legs
  r.rect(x - 3, FLOOR_Y - 34 + sway, 7, 7, '#e0ac82'); // head
  r.rect(x - 3, FLOOR_Y - 35 + sway, 7, 3, '#3b2a1a'); // hair
  r.rect(x + s.dir * 2, FLOOR_Y - 32 + sway, 2, 2, '#1a1410'); // eye: shows which way he looks
  r.rect(x + s.dir * 7, FLOOR_Y - 22, 3, 5, '#c9a24a'); // goblet in hand
  if (watching) {
    // A faint cone shows where he is looking.
    for (let d = 8; d < SUITOR_RANGE; d += 8) {
      const bx = s.dir > 0 ? x + d : x - d - 8;
      r.rect(bx, FLOOR_Y - 34 + d * 0.35, 8, 4 + d * 0.22, p.accent, 0.05);
    }
  }
  if (s.jeer > 0) r.worldText(s.jeerText, x, FLOOR_Y - 42, '#ffd9a0', 1, 'center', Math.min(1, s.jeer * 2));
}

/** Old Argos, who knows his master. */
export function drawArgos(r: Renderer, x: number, t: number): void {
  const y = FLOOR_Y - 9;
  r.rect(x, y + 3, 16, 5, '#8a6a45');
  r.rect(x + 14, y + 1, 6, 5, '#8a6a45'); // head
  r.rect(x + 18, y + 2, 1, 1, '#ffffff');
  r.rect(x + 2, y + 8, 2, 2, '#6b4a2f');
  r.rect(x + 11, y + 8, 2, 2, '#6b4a2f');
  r.rect(x - 4, y + 1 + Math.sin(t * 9) * 2, 5, 2, '#8a6a45'); // thumping tail
}

/** The beggar's disguise: hunched under a cloak, leaning on a staff. */
export function drawBeggar(r: Renderer, b: Body, alpha: number): void {
  const x = b.px + (b.x - b.px) * alpha - 1;
  const y = b.py + (b.y - b.py) * alpha - 2 + 3;
  const flip = b.facing < 0;
  r.sprite(ODYSSEUS.idle, x, y, flip);
  r.rect(x + 1, y + 5, 10, 11, '#5b4636'); // cloak
  r.rect(x + 3, y, 6, 5, '#5b4636'); // hood
  r.rect(x + (flip ? -1 : 12), y + 4, 1, 14, '#8a6a45'); // staff
}

/** The great bow: a full-screen panel with the stringing meter, then the twelve axes. */
export function drawBowStage(r: Renderer, g: BowGame, t: number): void {
  r.screenRect(0, 0, VIEW_W, VIEW_H, '#000000', 0.45);
  r.screenRect(30, 26, 260, 140, '#241810', 0.96);
  r.screenRect(30, 26, 260, 2, '#c9a24a');
  r.screenRect(30, 164, 260, 2, '#c9a24a');
  r.text('THE GREAT BOW', VIEW_W / 2, 44, '#ffd166', 2, 'center');

  if (g.stage === 'draw') {
    // The bow, bending as tension builds.
    const bend = Math.round(g.tension * 10);
    for (let i = 0; i < 30; i++) {
      const dx = Math.round(Math.sin((i / 29) * Math.PI) * (10 - bend * 0.4));
      r.screenRect(76 + dx, 62 + i * 2, 3, 2, '#8a6a45');
    }
    r.screenRect(78 - bend * 0.6 + 8, 62, 1, 60, '#d8d0b8'); // string
    // Tension meter with the green zone.
    const mx = 110;
    const mw = 150;
    r.screenRect(mx, 88, mw, 12, '#000000', 0.6);
    r.screenRect(mx + mw * GREEN_MIN, 88, mw * (GREEN_MAX - GREEN_MIN), 12, '#3fae5a', 0.8);
    r.screenRect(mx, 88, mw * Math.min(1, g.tension), 12, '#ffd166', 0.9);
    r.screenRect(mx - 1, 87, mw + 2, 1, '#c9a24a');
    r.screenRect(mx - 1, 100, mw + 2, 1, '#c9a24a');
    r.text('DRAW', mx, 84, '#ffffff', 1, 'left', 0.8);
    r.text('RELEASE IN THE GREEN', mx + mw, 114, '#9fe3a8', 1, 'right', 0.9);
  } else {
    // Twelve axe-heads, each with a ring to shoot through, in a line.
    const ringY = 100;
    for (let i = 0; i < 12; i++) {
      const ax = 108 + i * 14;
      r.screenRect(ax - 1, ringY - 20, 3, 40, '#6a5648'); // handle
      r.screenRect(ax - 3, ringY - 22, 7, 5, '#b8b8b8'); // head
      r.circle(ax, ringY, 4, '#ffd166', false, 0.9);
    }
    const span = 44; // px of marker travel per 1.0 of aim
    // The target band: dead centre, widening after misses.
    r.screenRect(60, ringY - g.tolerance * span, 215, g.tolerance * span * 2, '#3fae5a', 0.22);
    const my = ringY + g.aim() * span;
    if (g.stage === 'aim') {
      r.screenRect(62, my - 1, 8, 3, '#ffffff');
      r.screenRect(70, my - 3, 3, 7, '#ffffff');
      r.screenRect(72, my - 1, 150, 1, '#ffffff', 0.25);
    } else {
      // The arrow in flight: through all twelve, or stopped by the first axe.
      const progress = 1 - Math.max(0, g.shotTimer) / SHOT_TIME;
      const travel = g.shotHit ? progress : Math.min(progress, 0.2); // a miss is stopped by the first axe
      const ay = ringY + g.shotAim * span;
      const ax = 62 + travel * 215;
      r.screenRect(ax - 20, ay, 22, 2, '#d8d0b8');
      r.screenRect(ax + 2, ay - 1, 3, 4, '#b8b8b8');
    }
  }
  const msg = g.message;
  r.text(msg, VIEW_W / 2, 150, g.stage === 'won' ? '#9fe3a8' : '#ffffff', 1, 'center', 0.5 + 0.5 * Math.abs(Math.sin(t * 3)));
}
