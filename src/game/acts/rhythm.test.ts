import { describe, expect, it } from 'vitest';
import { Rhythm } from './rhythm';

describe('Rhythm', () => {
  const r = new Rhythm(1.6, 0.16);

  it('has beats at multiples of the period', () => {
    expect(r.offset(0)).toBeCloseTo(0);
    expect(r.offset(1.6)).toBeCloseTo(0);
    expect(r.offset(3.2)).toBeCloseTo(0);
  });

  it('reports a negative offset just before a beat and positive just after', () => {
    expect(r.offset(1.5)).toBeCloseTo(-0.1);
    expect(r.offset(1.7)).toBeCloseTo(0.1);
  });

  it('accepts presses inside the window on either side of a beat', () => {
    expect(r.isOnBeat(1.5)).toBe(true);
    expect(r.isOnBeat(1.7)).toBe(true);
    expect(r.isOnBeat(1.6)).toBe(true);
  });

  it('rejects presses outside the window', () => {
    expect(r.isOnBeat(0.8)).toBe(false);
    expect(r.isOnBeat(1.35)).toBe(false);
  });
});
