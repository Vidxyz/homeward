export const SCROLL_START = 45;
export const SCROLL_END = 90; // about the player's own running speed: no room to dawdle at the end

/** How fast the strait scrolls (px/s), building steadily across the act. */
export function scrollSpeed(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return SCROLL_START + (SCROLL_END - SCROLL_START) * p;
}

export const PULL_RANGE = 140;
export const PULL_MAX = 75;

/** The whirlpool drags anything near its edge backwards (negative = leftwards, px/s), harder the closer. */
export function whirlpoolPull(distFromEdge: number): number {
  if (distFromEdge >= PULL_RANGE) return 0;
  return -PULL_MAX * (1 - Math.max(0, distFromEdge) / PULL_RANGE);
}
