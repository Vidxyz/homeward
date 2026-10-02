import { describe, expect, it } from 'vitest';
import { NOISE_RADIUS, isHeard, maskedByFlock, playerNoiseRadius } from './noise';

describe('playerNoiseRadius', () => {
  it('is silent when standing still or creeping', () => {
    expect(playerNoiseRadius({ speed: 0, onGround: true, jumped: false, landed: false })).toBe(0);
    expect(playerNoiseRadius({ speed: 36, onGround: true, jumped: false, landed: false })).toBe(0);
  });

  it('is loud when running on the ground', () => {
    expect(playerNoiseRadius({ speed: 90, onGround: true, jumped: false, landed: false })).toBe(NOISE_RADIUS.run);
  });

  it('is louder when jumping, and loudest when landing', () => {
    const jump = playerNoiseRadius({ speed: 0, onGround: false, jumped: true, landed: false });
    const land = playerNoiseRadius({ speed: 0, onGround: true, jumped: false, landed: true });
    expect(jump).toBe(NOISE_RADIUS.jump);
    expect(land).toBe(NOISE_RADIUS.land);
    expect(jump).toBeGreaterThan(NOISE_RADIUS.run);
    expect(land).toBeGreaterThan(jump);
  });

  it('is silent while airborne without a jump or landing event', () => {
    expect(playerNoiseRadius({ speed: 90, onGround: false, jumped: false, landed: false })).toBe(0);
  });
});

describe('isHeard', () => {
  it('is true inside the radius and false outside it or for silence', () => {
    expect(isHeard(100, 200, 150)).toBe(true);
    expect(isHeard(100, 300, 150)).toBe(false);
    expect(isHeard(100, 100, 0)).toBe(false);
  });
});

describe('maskedByFlock', () => {
  it('masks the player when a sheep is close enough', () => {
    expect(maskedByFlock(500, [300, 520, 900])).toBe(true);
    expect(maskedByFlock(500, [300, 900])).toBe(false);
    expect(maskedByFlock(500, [])).toBe(false);
  });
});
