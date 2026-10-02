import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('reports held keys', () => {
    const i = new Input();
    i.set('left', true);
    expect(i.frame().left).toBe(true);
    expect(i.frame().left).toBe(true);
    i.set('left', false);
    expect(i.frame().left).toBe(false);
  });

  it('reports a press edge exactly once', () => {
    const i = new Input();
    i.set('jump', true);
    expect(i.frame().jumpPressed).toBe(true);
    expect(i.frame().jumpPressed).toBe(false);
    expect(i.frame().jump).toBe(true);
  });

  it('does not create a new edge while the key is already held', () => {
    const i = new Input();
    i.set('action', true);
    i.frame();
    i.set('action', true);
    expect(i.frame().actionPressed).toBe(false);
  });

  it('keeps an edge pending until a frame consumes it', () => {
    const i = new Input();
    i.set('jump', true);
    i.set('jump', false);
    expect(i.frame().jumpPressed).toBe(true);
  });

  it('releaseAll clears every held key', () => {
    const i = new Input();
    i.set('left', true);
    i.set('jump', true);
    i.releaseAll();
    const f = i.frame();
    expect(f.left).toBe(false);
    expect(f.jump).toBe(false);
  });
});
