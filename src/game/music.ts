export interface Track {
  bpm: number;
  wave: OscillatorType;
  /** One entry per eighth note; 0 is a rest. Frequencies in Hz. */
  notes: number[];
  /** One entry per bar (8 eighth notes). */
  bass: number[];
}

const A2 = 110, C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196;
const A3 = 220, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392, A4 = 440;
const C5 = 523.25, D5 = 587.33, E5 = 659.25;

export const TRACKS: Track[] = [
  // 1 The Storm: low, rolling
  { bpm: 76, wave: 'triangle', notes: [A3, 0, C4, 0, E4, 0, D4, 0, A3, 0, G3, 0, E3, 0, 0, 0], bass: [A2, G3 / 2, A2, E3 / 2] },
  // 2 The Cyclops' Cave: sparse and uneasy
  { bpm: 60, wave: 'sine', notes: [A3, 0, 0, 0, 0, 0, C4, 0, 0, 0, 0, 0, B3, 0, 0, 0], bass: [A2, A2, C3, A2] },
  // 3 The Sirens: bright, circling
  { bpm: 88, wave: 'sine', notes: [E4, G4, A4, C5, A4, G4, E4, D4, E4, G4, A4, D5, C5, A4, G4, E4], bass: [C3, D3, E3, D3] },
  // 4 Scylla and Charybdis: urgent
  { bpm: 120, wave: 'square', notes: [A3, 0, A3, E3, A3, 0, C4, 0, A3, 0, A3, E3, G3, 0, E3, 0], bass: [A2, A2, G3 / 2, A2] },
  // 5 Ithaca: warm resolution
  { bpm: 66, wave: 'triangle', notes: [C4, 0, E4, 0, G4, 0, E4, 0, D4, 0, G4, 0, E5, 0, C5, 0], bass: [C3, G3 / 2, A2, E3 / 2] },
];
