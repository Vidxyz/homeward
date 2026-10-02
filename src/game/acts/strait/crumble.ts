export interface CrumbleSpec {
  col: number;
  row: number;
  width: number;
  thickness: number;
}

export type CrumbleState = 'solid' | 'shaking' | 'fallen';

const SHAKE_TIME = 0.5;
const FALLEN_TIME = 3.5;

/** A platform that gives way shortly after it is stood on, and re-forms a few seconds later. */
export class CrumblePlatform {
  state: CrumbleState = 'solid';
  /** How far (px) the fallen slab has dropped, for drawing. */
  fall = 0;
  private timer = 0;

  constructor(readonly spec: CrumbleSpec) {}

  /** Standing on it only starts the countdown; jumping off does not stop it. */
  update(dt: number, standing: boolean): void {
    if (this.state === 'solid') {
      if (standing) {
        this.state = 'shaking';
        this.timer = SHAKE_TIME;
      }
    } else if (this.state === 'shaking') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'fallen';
        this.timer = FALLEN_TIME;
      }
    } else {
      this.timer -= dt;
      this.fall += 260 * dt;
      if (this.timer <= 0) this.reset();
    }
  }

  /** Still holds you up while shaking; only gone once fallen. */
  get solid(): boolean {
    return this.state !== 'fallen';
  }

  covers(col: number, row: number): boolean {
    const s = this.spec;
    return col >= s.col && col < s.col + s.width && row >= s.row && row < s.row + s.thickness;
  }

  reset(): void {
    this.state = 'solid';
    this.fall = 0;
    this.timer = 0;
  }
}
