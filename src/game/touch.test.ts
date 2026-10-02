import { describe, expect, it } from 'vitest';
import { dpadDirection, nextTouchMode, touchVisible } from './touch';

describe('dpadDirection', () => {
  it('left of centre is left, right of centre is right', () => {
    expect(dpadDirection(0.05)).toBe('left');
    expect(dpadDirection(0.4)).toBe('left');
    expect(dpadDirection(0.6)).toBe('right');
    expect(dpadDirection(0.95)).toBe('right');
  });

  it('a small dead zone in the middle gives no direction', () => {
    expect(dpadDirection(0.5)).toBeNull();
    expect(dpadDirection(0.46)).toBeNull();
    expect(dpadDirection(0.54)).toBeNull();
  });

  it('a thumb that slides beyond the pad keeps pushing the nearest way', () => {
    expect(dpadDirection(-0.3)).toBe('left');
    expect(dpadDirection(1.4)).toBe('right');
  });
});

describe('touchVisible', () => {
  it('auto follows whether the device has a touch screen as its main pointer', () => {
    expect(touchVisible('auto', true)).toBe(true);
    expect(touchVisible('auto', false)).toBe(false);
  });

  it('on and off override the detection', () => {
    expect(touchVisible('on', false)).toBe(true);
    expect(touchVisible('off', true)).toBe(false);
  });
});

describe('nextTouchMode', () => {
  it('cycles auto, on, off and back', () => {
    expect(nextTouchMode('auto')).toBe('on');
    expect(nextTouchMode('on')).toBe('off');
    expect(nextTouchMode('off')).toBe('auto');
  });
});
