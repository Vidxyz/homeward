import { TILE, overlaps, type Rect, type Vec } from '../types';

export class CheckpointTracker {
  private current: Vec;
  private readonly reached = new Set<number>();

  constructor(
    spawn: Vec,
    private readonly checkpoints: Vec[],
  ) {
    this.current = { ...spawn };
  }

  /** Returns true when a new checkpoint was reached on this call. */
  update(player: Rect): boolean {
    let fresh = false;
    this.checkpoints.forEach((c, i) => {
      if (this.reached.has(i)) return;
      const zone: Rect = { x: c.x - TILE / 2, y: c.y - TILE, w: TILE * 2, h: TILE * 2 };
      if (overlaps(player, zone)) {
        this.reached.add(i);
        this.current = { ...c };
        fresh = true;
      }
    });
    return fresh;
  }

  respawn(): Vec {
    return { ...this.current };
  }

  isReached(i: number): boolean {
    return this.reached.has(i);
  }
}
