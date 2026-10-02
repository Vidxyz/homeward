export type VolleyKind = 'aimed' | 'pincer' | 'comb';

/** Seconds between Scylla's volleys, getting quicker as the act goes on (progress is 0..1). */
export function volleyEvery(progress: number): number {
  return 2.2 - 0.8 * Math.min(1, Math.max(0, progress));
}

/** How long a strike is telegraphed before it lands; shorter in the last stretch. */
export function warnTime(progress: number): number {
  return progress > 0.75 ? 0.55 : 0.9;
}

/** Early volleys are a single aimed head; later ones are patterns the player has to read. */
export function chooseKind(progress: number, rng: () => number): VolleyKind {
  if (progress < 0.2) return 'aimed';
  if (progress < 0.55) return rng() < 0.5 ? 'aimed' : 'pincer';
  const r = rng();
  if (r < 0.4) return 'comb';
  return r < 0.7 ? 'pincer' : 'aimed';
}

/**
 * World x positions of the heads in a volley. They aim where the player will be when the strike lands
 * (`playerX + playerVx * warn`), so standing still is no safer than running. A pincer flanks that spot and a
 * comb hits it with a head either side, so the safe lanes are between the heads.
 */
export function planVolley(playerX: number, playerVx: number, warn: number, kind: VolleyKind): number[] {
  const aim = playerX + playerVx * warn;
  if (kind === 'pincer') return [aim - 34, aim + 34];
  if (kind === 'comb') return [aim - 52, aim, aim + 52];
  return [aim];
}
