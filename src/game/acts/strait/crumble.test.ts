import { describe, expect, it } from 'vitest';
import { CrumblePlatform } from './crumble';

const spec = { col: 10, row: 8, width: 4, thickness: 2 };

describe('CrumblePlatform', () => {
  it('stays solid when nobody stands on it', () => {
    const p = new CrumblePlatform(spec);
    for (let i = 0; i < 300; i++) p.update(1 / 60, false);
    expect(p.state).toBe('solid');
    expect(p.solid).toBe(true);
  });

  it('shakes when stood on, stays solid while shaking, then falls away', () => {
    const p = new CrumblePlatform(spec);
    p.update(1 / 60, true);
    expect(p.state).toBe('shaking');
    expect(p.solid).toBe(true);
    for (let i = 0; i < 20; i++) p.update(1 / 60, true);
    expect(p.solid).toBe(true); // still within the warning
    for (let i = 0; i < 20; i++) p.update(1 / 60, false);
    expect(p.state).toBe('fallen');
    expect(p.solid).toBe(false);
  });

  it('keeps crumbling even if the player jumps off', () => {
    const p = new CrumblePlatform(spec);
    p.update(1 / 60, true);
    for (let i = 0; i < 60; i++) p.update(1 / 60, false);
    expect(p.state).toBe('fallen');
  });

  it('re-forms after a few seconds', () => {
    const p = new CrumblePlatform(spec);
    p.update(1 / 60, true);
    for (let i = 0; i < 60 * 8; i++) p.update(1 / 60, false);
    expect(p.state).toBe('solid');
    expect(p.fall).toBe(0);
  });

  it('covers exactly its own tiles', () => {
    const p = new CrumblePlatform(spec);
    expect(p.covers(10, 8)).toBe(true);
    expect(p.covers(13, 9)).toBe(true);
    expect(p.covers(14, 8)).toBe(false);
    expect(p.covers(10, 10)).toBe(false);
  });

  it('reset makes it solid again at once', () => {
    const p = new CrumblePlatform(spec);
    p.update(1 / 60, true);
    for (let i = 0; i < 60; i++) p.update(1 / 60, false);
    p.reset();
    expect(p.solid).toBe(true);
    expect(p.state).toBe('solid');
  });
});
