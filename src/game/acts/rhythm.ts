export class Rhythm {
  constructor(
    readonly period: number,
    readonly window: number,
  ) {}

  /** Signed seconds to the nearest beat (beats fall at k * period). Negative = the beat is still coming. */
  offset(t: number): number {
    const m = ((t % this.period) + this.period) % this.period;
    return m <= this.period / 2 ? m : m - this.period;
  }

  isOnBeat(t: number): boolean {
    return Math.abs(this.offset(t)) <= this.window;
  }
}
