import { TILE, VIEW_H, VIEW_W, type Rect } from '../types';

export class Camera {
  x = 0;
  y = 0;
  px = 0;
  py = 0;

  constructor(
    private readonly cols: number,
    private readonly rows: number,
  ) {}

  private clampX(x: number): number {
    return Math.max(0, Math.min(x, this.cols * TILE - VIEW_W));
  }

  private clampY(y: number): number {
    return Math.max(0, Math.min(y, this.rows * TILE - VIEW_H));
  }

  private targetX(b: Rect): number {
    return this.clampX(b.x + b.w / 2 - VIEW_W / 2);
  }

  private targetY(b: Rect): number {
    return this.clampY(b.y + b.h / 2 - VIEW_H / 2);
  }

  snapTo(b: Rect): void {
    this.x = this.px = this.targetX(b);
    this.y = this.py = this.targetY(b);
  }

  snapX(x: number): void {
    this.x = this.px = this.clampX(x);
  }

  follow(b: Rect): void {
    this.px = this.x;
    this.py = this.y;
    this.x += (this.targetX(b) - this.x) * 0.12;
    this.y += (this.targetY(b) - this.y) * 0.12;
  }

  setX(x: number): void {
    this.px = this.x;
    this.py = this.y;
    this.x = this.clampX(x);
  }
}
