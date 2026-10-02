import { describe, expect, it } from 'vitest';
import { makeDog, updateDog } from './dog';

const near = (x: number) => ({ cx: x, onFloor: true });

describe('sheepdog', () => {
  it('patrols back and forth inside its range', () => {
    const d = makeDog(500, 440, 560);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      updateDog(d, 1 / 60, { cx: 5000, onFloor: true }, false);
      min = Math.min(min, d.x);
      max = Math.max(max, d.x);
    }
    expect(min).toBeGreaterThanOrEqual(440);
    expect(max).toBeLessThanOrEqual(560);
    expect(max - min).toBeGreaterThan(60);
  });

  it('sniffs out a player who stays close, and barks', () => {
    const d = makeDog(500, 440, 560);
    let barked = false;
    for (let i = 0; i < 90 && !barked; i++) barked = updateDog(d, 1 / 60, near(d.x + 30), false) === 'bark';
    expect(barked).toBe(true);
  });

  it('does not notice a distant player', () => {
    const d = makeDog(500, 440, 560);
    let barked = false;
    for (let i = 0; i < 300; i++) if (updateDog(d, 1 / 60, near(d.x + 200), false) === 'bark') barked = true;
    expect(barked).toBe(false);
  });

  it('smells a creeping player only from much closer', () => {
    const creeping = makeDog(500, 500, 500);
    let barkedAt30 = false;
    for (let i = 0; i < 200; i++) if (updateDog(creeping, 1 / 60, near(530), true) === 'bark') barkedAt30 = true;
    expect(barkedAt30).toBe(false);

    const close = makeDog(500, 500, 500);
    let barkedAt10 = false;
    for (let i = 0; i < 200; i++) if (updateDog(close, 1 / 60, near(510), true) === 'bark') barkedAt10 = true;
    expect(barkedAt10).toBe(true);
  });

  it('does not bark again straight away', () => {
    const d = makeDog(500, 500, 500);
    let barks = 0;
    for (let i = 0; i < 60 * 2; i++) if (updateDog(d, 1 / 60, near(520), false) === 'bark') barks++;
    expect(barks).toBe(1);
  });
});
