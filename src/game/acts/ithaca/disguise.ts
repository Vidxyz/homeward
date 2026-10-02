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

export const STOOP_DRAIN = 8; // seconds of stooping from full
export const STOOP_RECOVER = 4; // seconds to refill from empty while standing

/** An old man's back: stooping tires it, and an exhausted one has to stand up straight for a while. */
export class Stamina {
  value = 1;
  exhausted = false;

  /** Pass whether the player wants to stoop; returns whether they actually are. */
  update(dt: number, wantsStoop: boolean): boolean {
    const stooping = wantsStoop && !this.exhausted && this.value > 0;
    if (stooping) {
      this.value = Math.max(0, this.value - dt / STOOP_DRAIN);
      if (this.value <= 0) this.exhausted = true;
    } else {
      this.value = Math.min(1, this.value + dt / STOOP_RECOVER);
      if (this.exhausted && this.value >= 0.35) this.exhausted = false;
    }
    return stooping;
  }

  reset(): void {
    this.value = 1;
    this.exhausted = false;
  }
}
