import { describe, expect, it } from 'vitest';
import { BARRIER_W, gapTop, gustPush, shipHitsBarrier, swellAt, type Barrier } from './sea';

const barrier: Barrier = { col: 10, baseY: 80, gapH: 3, amp: 30, speed: 1, phase: 0 };

describe('gapTop', () => {
  it('oscillates around its base position', () => {
    const ys = Array.from({ length: 200 }, (_, i) => gapTop(barrier, i * 0.1));
    expect(Math.min(...ys)).toBeLessThan(60);
    expect(Math.max(...ys)).toBeGreaterThan(100);
    expect(gapTop(barrier, 0)).toBeCloseTo(80);
  });

  it('never leaves the sea', () => {
    const wild: Barrier = { ...barrier, baseY: 10, amp: 500 };
    for (let t = 0; t < 20; t += 0.1) {
      const y = gapTop(wild, t);
      expect(y).toBeGreaterThanOrEqual(24);
      expect(y + wild.gapH * 16).toBeLessThanOrEqual(192 - 24);
    }
  });
});

describe('shipHitsBarrier', () => {
  const x0 = barrier.col * 16;
  it('is safe inside the gap and deadly above or below it', () => {
    const top = gapTop(barrier, 0); // 80
    expect(shipHitsBarrier({ x: x0, y: top + 4, w: 20, h: 12 }, barrier, 0)).toBe(false);
    expect(shipHitsBarrier({ x: x0, y: top - 6, w: 20, h: 12 }, barrier, 0)).toBe(true);
    expect(shipHitsBarrier({ x: x0, y: top + barrier.gapH * 16 - 6, w: 20, h: 12 }, barrier, 0)).toBe(true);
  });

  it('ignores a ship that is not alongside the barrier', () => {
    expect(shipHitsBarrier({ x: x0 - 30, y: 4, w: 20, h: 12 }, barrier, 0)).toBe(false);
    expect(shipHitsBarrier({ x: x0 + BARRIER_W, y: 4, w: 20, h: 12 }, barrier, 0)).toBe(false);
  });

  it('depends on time: a ship that fits now can be crushed once the gap has moved', () => {
    const ship = { x: x0, y: 84, w: 20, h: 12 };
    expect(shipHitsBarrier(ship, barrier, 0)).toBe(false);
    const later = Array.from({ length: 100 }, (_, i) => shipHitsBarrier(ship, barrier, i * 0.1));
    expect(later.some(Boolean)).toBe(true);
  });
});

describe('swellAt', () => {
  it('is deterministic and bounded', () => {
    expect(swellAt(123, 4.5)).toEqual(swellAt(123, 4.5));
    for (let i = 0; i < 500; i++) {
      const s = swellAt(i * 7, i * 0.37);
      expect(Math.abs(s.vy)).toBeLessThanOrEqual(32);
      expect(Math.abs(s.vx)).toBeLessThanOrEqual(6);
    }
  });

  it('does not repeat on a short period (layered, uneven current)', () => {
    for (const dt of [2, 5, 6.28, 10]) {
      let sum = 0;
      let n = 0;
      for (let t = 0; t < 60; t += 0.7) {
        sum += Math.abs(swellAt(500, t + dt).vy - swellAt(500, t).vy);
        n++;
      }
      expect(sum / n).toBeGreaterThan(4);
    }
  });
});

describe('gustPush', () => {
  it('rises smoothly to the peak and is zero outside the gust', () => {
    expect(gustPush(-0.1, 1.2, 40)).toBe(0);
    expect(gustPush(1.3, 1.2, 40)).toBe(0);
    expect(gustPush(0.6, 1.2, 40)).toBeCloseTo(40);
    expect(gustPush(0.3, 1.2, 40)).toBeLessThan(40);
    expect(gustPush(0.3, 1.2, 40)).toBeGreaterThan(0);
  });
});
