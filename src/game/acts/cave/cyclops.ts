import type { SfxName } from '../../types';

export type CyclopsMood = 'walk' | 'pause' | 'investigate' | 'stunned' | 'hunt' | 'search';

export interface CyclopsBounds {
  min: number;
  max: number;
}

const HEARING = 520; // how far a loud noise carries to a sighted Cyclops
const INVESTIGATE_SPEED = 55;
const HUNT_SPEED = 125; // faster than the player can run, so being heard is dangerous
const STUN_TIME = 1.5;
const GRAB_RANGE = 24;

/**
 * Polyphemus. While sighted he paces erratically (walk, reverse, stop and look around) and goes to see
 * what made a loud noise. Once blinded he staggers about slowly and hunts by sound alone.
 */
export class Cyclops {
  dir: 1 | -1 = 1;
  mood: CyclopsMood = 'walk';
  blind = false;

  private timer = 3; // the first decision is a few seconds away
  private speed = 28;
  private scan = false;
  private scanTimer = 0;
  private target = 0;
  private stepTimer = 0;

  constructor(
    public x: number,
    private bounds: CyclopsBounds,
    private readonly rng: () => number,
  ) {}

  /** The player blinded him: he is thrown back to `x`, stunned, and from now on hunts by sound. */
  blindHim(x: number, bounds: CyclopsBounds): void {
    this.blind = true;
    this.bounds = bounds;
    this.x = Math.min(bounds.max, Math.max(bounds.min, x));
    this.mood = 'stunned';
    this.timer = STUN_TIME;
    this.scan = false;
  }

  /** A loud noise at world x. Sighted: he goes to look. Blind: he hunts it. Ignored if out of range. */
  hear(x: number, range = HEARING): void {
    if (Math.abs(x - this.x) > range) return;
    if (this.mood === 'stunned') return;
    this.mood = this.blind ? 'hunt' : 'investigate';
    this.target = x;
  }

  /** Blind and recovered: anyone right next to him is caught. */
  grabs(playerCx: number): boolean {
    return this.blind && this.mood !== 'stunned' && Math.abs(playerCx - this.x) <= GRAB_RANGE;
  }

  private startWalking(): void {
    // A blinded Cyclops lumbers on towards the exit more often than not, so he does not just fall behind.
    if (this.blind && this.rng() < 0.5) this.dir = 1;
    this.mood = 'walk';
    this.timer = 1 + this.rng() * 2.5;
    this.speed = this.blind ? 18 + this.rng() * 12 : 22 + this.rng() * 18;
  }

  /** Erratic behaviour: keep going, suddenly reverse, or stop for a moment. */
  private decide(): void {
    const r = this.rng();
    if (r < 0.4) {
      this.startWalking();
    } else if (r < 0.65) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.startWalking();
    } else {
      this.mood = 'pause';
      this.timer = 0.5 + this.rng() * 1.5;
      this.scan = !this.blind && this.rng() < 0.5; // only a sighted giant looks around
      this.scanTimer = 0.6;
    }
  }

  private move(dt: number, speed: number, sfx: SfxName[], stepEvery: number): void {
    this.x += this.dir * speed * dt;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      sfx.push('step');
      this.stepTimer = stepEvery;
    }
    if (this.x >= this.bounds.max || this.x <= this.bounds.min) {
      this.dir = this.x >= this.bounds.max ? -1 : 1;
      this.x = Math.min(this.bounds.max, Math.max(this.bounds.min, this.x));
      this.mood = 'pause';
      this.timer = 0.8;
      this.scan = false;
    }
  }

  update(dt: number, sfx: SfxName[]): void {
    switch (this.mood) {
      case 'stunned':
        this.timer -= dt;
        if (this.timer <= 0) this.startWalking();
        break;
      case 'walk':
        this.move(dt, this.speed, sfx, 1.1);
        this.timer -= dt;
        if (this.mood === 'walk' && this.timer <= 0) this.decide();
        break;
      case 'pause':
        this.timer -= dt;
        if (this.scan) {
          this.scanTimer -= dt;
          if (this.scanTimer <= 0) {
            this.dir = this.dir === 1 ? -1 : 1;
            this.scanTimer = 0.6;
          }
        }
        if (this.timer <= 0) this.startWalking();
        break;
      case 'investigate':
      case 'hunt': {
        this.dir = this.target >= this.x ? 1 : -1;
        this.move(dt, this.mood === 'hunt' ? HUNT_SPEED : INVESTIGATE_SPEED, sfx, 0.6);
        if ((this.mood === 'investigate' || this.mood === 'hunt') && Math.abs(this.target - this.x) < 20) {
          this.mood = 'search';
          this.timer = 2.5;
          this.scan = true;
          this.scanTimer = 0.8;
        }
        break;
      }
      case 'search':
        this.timer -= dt;
        this.scanTimer -= dt;
        if (this.scanTimer <= 0) {
          this.dir = this.dir === 1 ? -1 : 1;
          this.scanTimer = 0.8;
        }
        if (this.timer <= 0) this.startWalking();
        break;
    }
  }
}
