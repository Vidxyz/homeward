export type BowStage = 'draw' | 'aim' | 'shot' | 'won';
export type BowEvent = 'strung' | 'weak' | 'slipped' | 'hit' | 'miss';

export const DRAW_RATE = 0.55; // tension per second while ACTION is held
export const GREEN_MIN = 0.72;
export const GREEN_MAX = 0.9;
const SLIP_AT = 1.0;
export const BASE_TOLERANCE = 0.12;
const MERCY = 0.04; // the target widens a little after each miss
const MAX_TOLERANCE = 0.32;
export const SHOT_TIME = 0.9;

/**
 * Odysseus strings the great bow, then shoots through twelve axe-heads. Stage 1: hold to draw and release in
 * the green. Stage 2: loose when the sweeping marker is lined up with the rings (0 = dead centre).
 */
export class BowGame {
  stage: BowStage = 'draw';
  tension = 0;
  misses = 0;
  message = 'HOLD ACTION TO DRAW';
  /** Marker position at the moment the arrow was loosed, and whether it went true; for drawing the shot. */
  shotAim = 0;
  shotHit = false;
  shotTimer = 0;
  private t = 0;
  private holding = false;
  private locked = false; // after a slip you must let go before drawing again

  /** The sweeping aim marker, roughly -1.25 to 1.25. */
  aim(): number {
    return 0.9 * Math.sin(this.t * 2.4) + 0.35 * Math.sin(this.t * 5.1 + 1.3);
  }

  get tolerance(): number {
    return Math.min(MAX_TOLERANCE, BASE_TOLERANCE + MERCY * this.misses);
  }

  update(dt: number, held: boolean, loose: boolean): BowEvent[] {
    this.t += dt;
    const events: BowEvent[] = [];

    if (this.stage === 'draw') {
      if (!held) this.locked = false;
      if (held && !this.locked) {
        this.holding = true;
        this.tension += DRAW_RATE * dt;
        if (this.tension >= SLIP_AT) {
          this.tension = 0;
          this.holding = false;
          this.locked = true;
          this.message = 'THE STRING SLIPS. TRY AGAIN';
          events.push('slipped');
        }
      } else if (this.holding) {
        this.holding = false;
        if (this.tension >= GREEN_MIN && this.tension <= GREEN_MAX) {
          this.stage = 'aim';
          this.message = 'PRESS JUMP TO LOOSE';
          events.push('strung');
        } else {
          this.message = this.tension < GREEN_MIN ? 'TOO WEAK. DRAW FURTHER' : 'TOO FAR. RELEASE SOONER';
          events.push('weak');
        }
        this.tension = 0;
      }
    } else if (this.stage === 'aim') {
      if (loose) {
        this.shotAim = this.aim();
        this.shotHit = Math.abs(this.shotAim) <= this.tolerance;
        this.shotTimer = SHOT_TIME;
        this.stage = 'shot';
        events.push(this.shotHit ? 'hit' : 'miss');
      }
    } else if (this.stage === 'shot') {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        if (this.shotHit) {
          this.stage = 'won';
          this.message = 'THROUGH ALL TWELVE';
        } else {
          this.misses++;
          this.stage = 'aim';
          this.message = 'MISSED. AGAIN';
        }
      }
    }
    return events;
  }
}
