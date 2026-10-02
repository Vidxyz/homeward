/** Holding ACTION slows the player to a creep, which is silent and low enough to stay hidden in shadow. */
export const CREEP_SCALE = 0.4;

/** How far (px) different things the player does can be heard. */
export const NOISE_RADIUS = { run: 150, jump: 170, land: 190 } as const;

export interface MoveSample {
  /** Horizontal speed in px/s. */
  speed: number;
  onGround: boolean;
  jumped: boolean;
  landed: boolean;
}

/** The loudness (as a hearing radius in px) of what the player did this tick; 0 means silent. */
export function playerNoiseRadius(m: MoveSample): number {
  if (m.landed) return NOISE_RADIUS.land;
  if (m.jumped) return NOISE_RADIUS.jump;
  if (m.onGround && m.speed > 50) return NOISE_RADIUS.run;
  return 0;
}

export function isHeard(listenerX: number, noiseX: number, radius: number): boolean {
  return radius > 0 && Math.abs(listenerX - noiseX) <= radius;
}

/** Sheep close by drown out the player's noise. */
export function maskedByFlock(playerX: number, sheepXs: number[], within = 40): boolean {
  return sheepXs.some((x) => Math.abs(x - playerX) <= within);
}
