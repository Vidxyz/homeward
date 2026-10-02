import { tileAt, type Level } from '../level';
import type { Palette } from '../palettes';
import { SPRITE_COLORS } from '../sprites';
import { GLYPH_H, GLYPH_W, glyph, textWidth } from './font';
import { TILE, VIEW_H, VIEW_W } from '../types';

export class Renderer {
  private ox = 0;
  private oy = 0;
  /** Canvas text is hidden while HTML overlays (menus, narration, pause) are up. */
  textVisible = true;

  constructor(readonly ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }

  /** Sets the camera for subsequent world-space calls. */
  begin(camX: number, camY: number): void {
    this.ox = -Math.round(camX);
    this.oy = -Math.round(camY);
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    this.screenRect(x + this.ox, y + this.oy, w, h, color, alpha);
  }

  screenRect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
    c.globalAlpha = 1;
  }

  circle(x: number, y: number, radius: number, color: string, fill = false, alpha = 1): void {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(Math.round(x + this.ox), Math.round(y + this.oy), radius, 0, Math.PI * 2);
    if (fill) {
      c.fillStyle = color;
      c.fill();
    } else {
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  /** Crisp pixel-font text in screen space. `y` is the baseline; `scale` is a whole number. */
  text(
    str: string,
    x: number,
    y: number,
    color: string,
    scale = 1,
    align: 'left' | 'center' | 'right' = 'left',
    alpha = 1,
  ): void {
    if (!this.textVisible) return;
    const s = str.toUpperCase();
    const w = textWidth(s, scale);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const top = y - GLYPH_H * scale;
    this.drawGlyphs(s, x0 + scale, top + scale, '#000000', alpha * 0.6, scale);
    this.drawGlyphs(s, x0, top, color, alpha, scale);
  }

  /** Like `text`, but positioned in world space. */
  worldText(
    str: string,
    x: number,
    y: number,
    color: string,
    scale = 1,
    align: 'left' | 'center' | 'right' = 'left',
    alpha = 1,
  ): void {
    this.text(str, x + this.ox, y + this.oy, color, scale, align, alpha);
  }

  private drawGlyphs(s: string, x: number, y: number, color: string, alpha: number, scale: number): void {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.fillStyle = color;
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const ch of s) {
      const g = glyph(ch);
      if (g) {
        for (let j = 0; j < g.length; j++) {
          for (let i = 0; i < GLYPH_W; i++) {
            if (g[j][i] === '#') c.fillRect(cx + i * scale, cy + j * scale, scale, scale);
          }
        }
      }
      cx += (GLYPH_W + 1) * scale;
    }
    c.globalAlpha = 1;
  }

  sky(p: Palette): void {
    const g = this.ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(1, p.skyBottom);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** A parallax silhouette (waves or hills) in screen space. */
  ridge(
    color: string,
    baseY: number,
    amp: number,
    freq: number,
    parallax: number,
    camX: number,
    t: number,
    speed = 0,
  ): void {
    const c = this.ctx;
    c.fillStyle = color;
    for (let sx = 0; sx < VIEW_W; sx += 2) {
      const wx = sx + camX * parallax;
      const y = Math.round(
        baseY + Math.sin(wx * freq + t * speed) * amp + Math.sin(wx * freq * 2.3 + 1.7) * amp * 0.4,
      );
      c.fillRect(sx, y, 2, VIEW_H - y);
    }
  }

  tiles(level: Level, p: Palette, camX: number, camY: number, t: number): void {
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(level.cols - 1, Math.floor((camX + VIEW_W) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(level.rows - 1, Math.floor((camY + VIEW_H) / TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = level.tiles[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (ch === '#') {
          this.rect(x, y, TILE, TILE, p.solid);
          if (tileAt(level, c, r - 1) !== '#') this.rect(x, y, TILE, 3, p.solidTop);
          else if ((c * 7 + r * 13) % 5 === 0) this.rect(x + 4, y + 5, 3, 2, p.solidDark);
          if (tileAt(level, c, r + 1) !== '#') this.rect(x, y + TILE - 2, TILE, 2, p.solidDark);
        } else if (ch === '^') {
          for (let i = 0; i < 3; i++) {
            this.rect(x + i * 5 + 1, y + 12, 5, 4, p.hazard);
            this.rect(x + i * 5 + 2, y + 8, 3, 4, p.hazard);
            this.rect(x + i * 5 + 3, y + 5, 1, 3, p.hazard);
          }
        } else if (ch === '~') {
          this.rect(x, y, TILE, TILE, p.water);
          if (tileAt(level, c, r - 1) !== '~') {
            this.rect(x, y + 1 + Math.round(Math.sin(t * 3 + c)), TILE, 2, p.foam, 0.8);
          }
        } else if (ch === 'H') {
          this.rect(x, y, TILE, TILE, p.shadow, 0.55);
        }
      }
    }
  }

  /** Draws a character-grid sprite with its top-left at (x, y) in world space. */
  sprite(frame: readonly string[], x: number, y: number, flip = false): void {
    const w = frame[0].length;
    for (let j = 0; j < frame.length; j++) {
      for (let i = 0; i < w; i++) {
        const col = SPRITE_COLORS[frame[j][i]];
        if (!col) continue;
        this.rect(x + (flip ? w - 1 - i : i), y + j, 1, 1, col);
      }
    }
  }
}
