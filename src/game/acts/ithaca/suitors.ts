export const SUITOR_RANGE = 110;
export const JEERS = ['BEGGAR!', 'OUT, OLD MAN!', 'MORE WINE!', 'WHO LET HIM IN?', 'HA!'];

/** A suitor feasting in the hall, glancing about. */
export interface Suitor {
  x: number;
  dir: 1 | -1;
  timer: number;
  jeer: number;
  jeerText: string;
  nextJeer: number;
}

export function makeSuitor(x: number, rng: () => number): Suitor {
  return {
    x,
    dir: rng() < 0.5 ? 1 : -1,
    timer: 1.5 + rng() * 3,
    jeer: 0,
    jeerText: JEERS[0],
    nextJeer: 3 + rng() * 8,
  };
}

export function updateSuitor(s: Suitor, dt: number, rng: () => number): void {
  s.timer -= dt;
  if (s.timer <= 0) {
    s.dir = s.dir === 1 ? -1 : 1;
    s.timer = 1.5 + rng() * 3; // 1.5 to 4.5 s before the next glance
  }
  s.jeer = Math.max(0, s.jeer - dt);
  s.nextJeer -= dt;
  if (s.nextJeer <= 0) {
    s.nextJeer = 5 + rng() * 10;
    s.jeer = 1.4;
    s.jeerText = JEERS[Math.floor(rng() * JEERS.length)];
  }
}
