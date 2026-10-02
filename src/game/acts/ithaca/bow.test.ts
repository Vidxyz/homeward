import { describe, expect, it } from 'vitest';
import { BowGame, GREEN_MAX, GREEN_MIN, SHOT_TIME } from './bow';

const DT = 1 / 60;

/** Holds ACTION for `seconds`, then releases. Returns the events seen. */
function drawFor(g: BowGame, seconds: number) {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...g.update(DT, true, false));
  events.push(...g.update(DT, false, false));
  return events;
}

/** Advances until the aim marker is within `within` of the centre, so a shot there is a certain hit. */
function waitForCentre(g: BowGame, within = 0.03) {
  for (let i = 0; i < 60 * 30; i++) {
    if (Math.abs(g.aim()) <= within) return;
    g.update(DT, false, false);
  }
  throw new Error('the marker never crossed the centre');
}

/** Advances until the marker is far from the centre, so a shot is a certain miss. */
function waitForEdge(g: BowGame) {
  for (let i = 0; i < 60 * 30; i++) {
    if (Math.abs(g.aim()) >= 0.9) return;
    g.update(DT, false, false);
  }
  throw new Error('the marker never reached the edge');
}

function strung(): BowGame {
  const g = new BowGame();
  drawFor(g, ((GREEN_MIN + GREEN_MAX) / 2) / 0.55);
  expect(g.stage).toBe('aim');
  return g;
}

describe('stringing the bow', () => {
  it('has a green zone that is fairly narrow, and centred in the meter\'s upper part', () => {
    expect(GREEN_MAX - GREEN_MIN).toBeCloseTo(0.14);
    expect((GREEN_MIN + GREEN_MAX) / 2).toBeCloseTo(0.81);
  });

  it('releasing inside the green zone strings it', () => {
    const g = new BowGame();
    const events = drawFor(g, ((GREEN_MIN + GREEN_MAX) / 2) / 0.55);
    expect(events).toContain('strung');
    expect(g.stage).toBe('aim');
  });

  it('releasing too early is too weak, and you try again', () => {
    const g = new BowGame();
    const events = drawFor(g, 0.4);
    expect(events).toContain('weak');
    expect(g.stage).toBe('draw');
    expect(g.tension).toBe(0);
  });

  it('holding on too long makes the string slip', () => {
    const g = new BowGame();
    const events: string[] = [];
    for (let i = 0; i < 60 * 5; i++) events.push(...g.update(DT, true, false));
    expect(events).toContain('slipped');
    expect(g.stage).toBe('draw');
  });
});

describe('the twelve axes', () => {
  it('a shot with the marker on the rings goes through and wins', () => {
    const g = strung();
    waitForCentre(g);
    const events = g.update(DT, false, true);
    expect(events).toContain('hit');
    expect(g.stage).toBe('shot');
    for (let t = 0; t < SHOT_TIME + 0.1; t += DT) g.update(DT, false, false);
    expect(g.stage).toBe('won');
  });

  it('a shot well off the rings misses and you may try again', () => {
    const g = strung();
    waitForEdge(g);
    const events = g.update(DT, false, true);
    expect(events).toContain('miss');
    for (let t = 0; t < SHOT_TIME + 0.1; t += DT) g.update(DT, false, false);
    expect(g.stage).toBe('aim');
    expect(g.misses).toBe(1);
  });

  it('each miss makes the target a little more forgiving, up to a limit', () => {
    const g = strung();
    const base = g.tolerance;
    for (let i = 0; i < 3; i++) {
      waitForEdge(g);
      g.update(DT, false, true);
      for (let t = 0; t < SHOT_TIME + 0.1; t += DT) g.update(DT, false, false);
    }
    expect(g.tolerance).toBeGreaterThan(base);
    for (let i = 0; i < 20; i++) {
      waitForEdge(g);
      g.update(DT, false, true);
      for (let t = 0; t < SHOT_TIME + 0.1; t += DT) g.update(DT, false, false);
    }
    expect(g.tolerance).toBeLessThanOrEqual(0.33);
  });

  it('cannot loose before the bow is strung', () => {
    const g = new BowGame();
    expect(g.update(DT, false, true)).toEqual([]);
    expect(g.stage).toBe('draw');
  });

  it('the marker is deterministic, sweeps both ways, and does not repeat trivially', () => {
    const a = new BowGame();
    const b = new BowGame();
    const samples: number[] = [];
    for (let i = 0; i < 600; i++) {
      a.update(DT, false, false);
      b.update(DT, false, false);
      expect(a.aim()).toBe(b.aim());
      samples.push(a.aim());
    }
    expect(Math.min(...samples)).toBeLessThan(-0.5);
    expect(Math.max(...samples)).toBeGreaterThan(0.5);
  });
});
