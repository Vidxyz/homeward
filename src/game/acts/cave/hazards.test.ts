import { describe, expect, it } from 'vitest';
import { brazierLit, fallerBox, litByBrazier, makeFaller, updateFaller } from './hazards';

describe('falling stalactite', () => {
  it('hangs until the player walks underneath, then shakes, falls and crashes once', () => {
    const f = makeFaller(500);
    expect(updateFaller(f, 0.1, 200)).toBeNull();
    expect(f.state).toBe('hanging');

    updateFaller(f, 0.016, 505); // the player is underneath
    expect(f.state).toBe('shaking');
    let crashes = 0;
    for (let i = 0; i < 300; i++) if (updateFaller(f, 0.016, 505) === 'crash') crashes++;
    expect(crashes).toBe(1);
    expect(f.state).toBe('fallen');
    expect(f.y + f.len).toBeCloseTo(160);
  });

  it('is only dangerous while it is falling', () => {
    const f = makeFaller(500);
    expect(fallerBox(f)).toBeNull();
    updateFaller(f, 0.016, 500);
    expect(fallerBox(f)).toBeNull(); // shaking: a warning, not yet a hazard
    for (let i = 0; i < 60; i++) updateFaller(f, 0.016, 500);
    const box = fallerBox(f);
    if (f.state === 'falling') expect(box).not.toBeNull();
    for (let i = 0; i < 300; i++) updateFaller(f, 0.016, 500);
    expect(fallerBox(f)).toBeNull(); // fallen: just rubble
  });
});

describe('braziers', () => {
  it('flare and dim over time', () => {
    const samples = Array.from({ length: 200 }, (_, i) => brazierLit(i * 0.1, 0));
    expect(samples.some(Boolean)).toBe(true);
    expect(samples.some((s) => !s)).toBe(true);
  });

  it('only light things within their radius while lit', () => {
    const lit = { x: 500, phase: Math.PI / 2 }; // sin(0.9*0 + pi/2) = 1: lit at t = 0
    expect(litByBrazier([lit], 0, 540)).toBe(true);
    expect(litByBrazier([lit], 0, 700)).toBe(false);
  });
});
