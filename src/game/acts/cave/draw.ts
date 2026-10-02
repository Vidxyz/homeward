import type { Renderer } from '../../engine/renderer';
import type { Palette } from '../../palettes';
import type { Cyclops } from './cyclops';
import type { Dog } from './dog';
import type { Faller } from './hazards';
import type { Giant } from './giants';
import { SHEEP_H, type Sheep } from './flock';
import { FLOOR_Y } from './layout';

export const CYCLOPS_RANGE = 150;
export const GIANT_RANGE = 110;

/** Polyphemus, a dark giant at the back of the cave. Sighted he shows a sight wedge; blinded he is bandaged. */
export function drawCyclops(r: Renderer, c: Cyclops, t: number, p: Palette, alert: number): void {
  const moving = c.mood !== 'pause' && c.mood !== 'stunned' && c.mood !== 'search';
  const sway = c.mood === 'stunned' ? Math.sin(t * 14) * 3 : 0;
  const bob = moving ? Math.sin(t * (c.mood === 'investigate' || c.mood === 'hunt' ? 8 : 4)) * 1.5 : 0;
  const x = c.x + sway;
  const top = FLOOR_Y - 96 + bob;
  const body = '#0b0605';
  r.rect(x - 20, top + 28, 40, 50, body); // torso
  r.rect(x - 14, top + 76, 12, 20, body); // legs
  r.rect(x + 2, top + 76, 12, 20, body);
  r.rect(x - 14, top + 4, 28, 26, body); // head
  r.rect(x - 28, top + 30, 10, 40, body); // arms
  r.rect(x + 18, top + 30, 10, 40, body);
  r.rect(x - c.dir * 34, top + 10, 8, 70, '#1a100b'); // club

  if (c.blind) {
    r.rect(x - 14, top + 12, 28, 6, '#d9d2c0'); // the bandage over his ruined eye
    r.rect(x + c.dir * 6 - 2, top + 13, 4, 4, '#8c1d1d');
  } else {
    r.circle(x + c.dir * 6, top + 16, 4, p.accent, true, 0.9 + 0.1 * Math.sin(t * 6));
    for (let d = 0; d < CYCLOPS_RANGE; d += 8) {
      const bx = c.dir > 0 ? x + d : x - d - 8;
      r.rect(bx, top + 14 + d * 0.45, 8, 6 + d * 0.3, p.accent, 0.05 + alert * 0.1);
    }
  }
}

export function drawSheep(r: Renderer, s: Sheep, t: number): void {
  const x = Math.round(s.x);
  const y = FLOOR_Y - SHEEP_H;
  const stepping = (s.moving || s.vx !== 0) && Math.floor(t * (s.vx !== 0 ? 10 : 6)) % 2 === 0 ? 1 : 0;
  r.rect(x + 2, y + 8, 2, 2 - stepping, '#2a2420'); // legs
  r.rect(x + 9, y + 8, 2, 2 - (1 - stepping), '#2a2420');
  r.rect(x, y + 1, 12, 7, '#e8e2d4'); // wool
  r.rect(x + 1, y, 10, 2, '#f5f1e6');
  r.rect(x + 3, y + 3, 2, 2, '#d3ccbb');
  r.rect(x + 7, y + 4, 2, 2, '#d3ccbb');
  const dir = s.vx !== 0 ? 1 : s.dir;
  const hx = dir > 0 ? x + 11 : x - 3; // head
  r.rect(hx, y + 2, 5, 5, '#2a2420');
  r.rect(hx + (dir > 0 ? 3 : 0), y + 3, 1, 1, '#e8e2d4');
  if (s.bleatFor > 0) r.worldText('BAA!', x + 7, y - 4, '#ffffff', 1, 'center', Math.min(1, s.bleatFor * 2));
}

export function drawDog(r: Renderer, d: Dog, t: number, barking: boolean): void {
  const x = Math.round(d.x);
  const y = FLOOR_Y - 9;
  const trot = Math.floor(t * 8) % 2;
  r.rect(x, y + 2, 14, 5, '#6b4a2f'); // body
  r.rect(x + (d.dir > 0 ? 12 : -4), y, 6, 5, '#6b4a2f'); // head
  r.rect(x + (d.dir > 0 ? 17 : -4), y + 1, 1, 1, '#ffffff');
  r.rect(x + 1 + trot, y + 7, 2, 2, '#4a331f'); // legs
  r.rect(x + 10 - trot, y + 7, 2, 2, '#4a331f');
  r.rect(x + (d.dir > 0 ? -3 : 14), y + 1 + Math.sin(t * 12), 3, 2, '#6b4a2f'); // tail
  if (barking) r.worldText('WOOF!', x + 7, y - 4, '#ffd166', 1, 'center');
}

/** A sleeping giant lies along the floor; an awake one stands and watches. */
export function drawGiant(r: Renderer, g: Giant, t: number, p: Palette): void {
  const x = g.x;
  const body = '#0e0807';
  if (!g.awake) {
    r.rect(x - 28, FLOOR_Y - 16, 56, 16, body);
    r.rect(x - 34, FLOOR_Y - 20, 12, 14, body); // head
    r.worldText('Z', x - 30, FLOOR_Y - 26 - Math.abs(Math.sin(t * 1.5)) * 6, '#ffffff', 1, 'center', 0.7);
    return;
  }
  const top = FLOOR_Y - 70;
  r.rect(x - 14, top + 20, 28, 36, body);
  r.rect(x - 10, top + 54, 8, 16, body);
  r.rect(x + 2, top + 54, 8, 16, body);
  r.rect(x - 9, top + 4, 18, 18, body);
  r.circle(x + g.dir * 4, top + 12, 3, p.accent, true, 0.9);
  for (let d = 0; d < GIANT_RANGE; d += 8) {
    const bx = g.dir > 0 ? x + d : x - d - 8;
    r.rect(bx, top + 12 + d * 0.5, 8, 5 + d * 0.3, p.accent, 0.06);
  }
}

export function drawBrazier(r: Renderer, x: number, lit: boolean, t: number, p: Palette): void {
  r.rect(x - 6, FLOOR_Y - 6, 12, 6, '#2a1d17'); // bowl
  r.rect(x - 8, FLOOR_Y - 8, 16, 2, '#4a3a32');
  const flare = lit ? 1 : 0.3;
  const h = Math.round((6 + Math.sin(t * 11) * 2) * (lit ? 2 : 1));
  r.rect(x - 4, FLOOR_Y - 8 - h, 8, h, '#ff9f1c', 0.9);
  r.rect(x - 2, FLOOR_Y - 8 - h + 2, 4, Math.max(2, h - 3), '#ffe08a', 0.9);
  if (lit) r.circle(x, FLOOR_Y - 14, 80, p.accent, true, 0.08 + 0.03 * Math.sin(t * 7));
  void flare;
}

export function drawFaller(r: Renderer, f: Faller, t: number): void {
  if (f.state === 'fallen') {
    r.rect(f.x - 7, FLOOR_Y - 4, 14, 4, '#5a4a40'); // rubble
    r.rect(f.x - 3, FLOOR_Y - 7, 6, 3, '#6a5648');
    return;
  }
  const shake = f.state === 'shaking' ? Math.sin(t * 60) * 1.5 : 0;
  const x = f.x + shake;
  for (let i = 0; i < f.len; i += 4) {
    const w = Math.max(2, 10 - Math.round((i / f.len) * 8));
    r.rect(x - w / 2, f.y + i, w, 4, '#6a5648');
  }
  if (f.state === 'shaking') r.rect(f.x - 5, FLOOR_Y - 3, 10, 3, '#ff6b6b', 0.5); // warning on the floor
}

/** The sharpened stake (and a wine-skin) in the den, glowing so it can be found. */
export function drawStake(r: Renderer, x: number, topY: number, t: number, p: Palette): void {
  const glow = 0.25 + 0.15 * Math.sin(t * 4);
  r.circle(x, topY + 40, 22, p.accent, true, glow);
  r.rect(x - 1, topY + 12, 3, 44, '#c8b08a'); // shaft
  r.rect(x, topY + 6, 1, 6, '#e8e0d0'); // charred tip
  r.rect(x + 7, FLOOR_Y - 12, 8, 12, '#7a2e2e'); // wine-skin
  r.rect(x + 9, FLOOR_Y - 15, 4, 3, '#5a1f1f');
}
