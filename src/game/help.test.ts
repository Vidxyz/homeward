import { describe, expect, it } from 'vitest';
import { ACTS } from './acts';
import { ACT_TIPS, CONTROLS, GENERAL_TIPS } from './help';

describe('how to play content', () => {
  it('has tips for every act, in order, with a name that matches the act', () => {
    expect(ACT_TIPS.map((a) => a.id)).toEqual(ACTS.map((a) => a.id));
    for (const a of ACT_TIPS) {
      expect(a.name).toBe(ACTS[a.id - 1].name);
      expect(a.tips.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no empty text anywhere', () => {
    const all = [
      ...GENERAL_TIPS,
      ...ACT_TIPS.flatMap((a) => a.tips),
      ...CONTROLS.flatMap((c) => [c.action, c.keys, c.touch]),
    ];
    for (const t of all) expect(t.trim().length).toBeGreaterThan(0);
  });

  it('lists the four controls (move, jump, action, pause)', () => {
    expect(CONTROLS.map((c) => c.action)).toEqual(['Move', 'Jump', 'Action', 'Pause']);
  });
});
