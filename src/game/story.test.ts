import { describe, expect, it } from 'vitest';
import { actLabel } from './story';

const names = ['The Storm', "The Cyclops' Cave", 'The Sirens', 'Scylla and Charybdis', 'Ithaca'];

describe('actLabel', () => {
  it('shows the name of an act you have started', () => {
    expect(actLabel(1, [1], names)).toBe('I · The Storm');
    expect(actLabel(3, [1, 3], names)).toBe('III · The Sirens');
  });

  it('hides the name of an act you have not started, even if you skipped past it', () => {
    expect(actLabel(2, [1], names)).toBe('II · ???');
    expect(actLabel(2, [1, 5], names)).toBe('II · ???');
    expect(actLabel(5, [1, 5], names)).toBe('V · Ithaca');
  });
});
