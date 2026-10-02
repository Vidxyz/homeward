export const SPRINT_SCALE = 1.35; // speed multiplier while sprinting
export const WINDED_SCALE = 0.7; // and while winded
export const DRAIN_TIME = 2.2; // seconds of sprinting from full
export const RECOVER_TIME = 3.5; // seconds to refill from empty
export const WINDED_TIME = 1.5; // how long running dry slows you down

/** A sprint with a price: running it dry leaves you winded, slower than normal, for a moment. */
export class Sprint {
  value = 1;
  private windedFor = 0;

  get winded(): boolean {
    return this.windedFor > 0;
  }

  /** Pass whether the sprint button is held; returns the speed multiplier for this tick. */
  update(dt: number, wantsSprint: boolean): number {
    if (this.windedFor > 0) {
      this.windedFor -= dt;
      return WINDED_SCALE;
    }
    if (wantsSprint && this.value > 0) {
      this.value = Math.max(0, this.value - dt / DRAIN_TIME);
      if (this.value <= 0) this.windedFor = WINDED_TIME;
      return SPRINT_SCALE;
    }
    this.value = Math.min(1, this.value + dt / RECOVER_TIME);
    return 1;
  }

  reset(): void {
    this.value = 1;
    this.windedFor = 0;
  }
}
