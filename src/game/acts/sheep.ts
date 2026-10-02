export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Mover extends Box {
  vx: number;
  vy: number;
  onGround: boolean;
}

export type SheepContact = 'none' | 'top' | 'side';

/**
 * Treats a sheep as a small solid obstacle. A player coming down onto its back stands on it ('top');
 * otherwise the player is pushed out sideways ('side'). Mutates the player.
 */
export function resolveSheep(p: Mover, sheep: Box): SheepContact {
  const ox = Math.min(p.x + p.w, sheep.x + sheep.w) - Math.max(p.x, sheep.x);
  const oy = Math.min(p.y + p.h, sheep.y + sheep.h) - Math.max(p.y, sheep.y);
  if (ox <= 0 || oy <= 0) return 'none';

  const above = p.y + p.h / 2 < sheep.y + sheep.h / 2;
  if (above && oy < ox) {
    p.y = sheep.y - p.h;
    p.vy = 0;
    p.onGround = true;
    return 'top';
  }
  p.x = p.x + p.w / 2 < sheep.x + sheep.w / 2 ? sheep.x - p.w : sheep.x + sheep.w;
  p.vx = 0;
  return 'side';
}
