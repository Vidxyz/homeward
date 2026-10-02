/** Above this speed (px/s) a "beggar" in plain view looks like a man with a purpose. */
export const WALK_SPEED_LIMIT = 55;
/** The player's speed multiplier on the road, in the hall, and while hunched over like a beggar. */
export const ROAD_SCALE = 0.7;
export const HALL_SCALE = 0.8;
export const HUNCH_SCALE = 0.45;

/**
 * Would a watcher who can see the player be suspicious of this? A hunched shuffle never is. Walking tall
 * at normal pace, running, or jumping is.
 */
export function looksSuspicious(speed: number, onGround: boolean, hunched: boolean): boolean {
  if (hunched) return false;
  return speed > WALK_SPEED_LIMIT || !onGround;
}

/** How close the suitors are to seeing through the disguise (0..1). Fills fast, drains slowly. */
export class Suspicion {
  value = 0;

  update(dt: number, seen: boolean): void {
    this.value = seen ? Math.min(1, this.value + dt / 1.0) : Math.max(0, this.value - dt / 1.5);
  }

  get blown(): boolean {
    return this.value >= 1;
  }

  reset(): void {
    this.value = 0;
  }
}
