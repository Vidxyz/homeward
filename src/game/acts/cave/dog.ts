const SPEED = 36;
const SNIFF_RANGE = 54;
const CREEP_SNIFF_RANGE = 20;
const SNIFF_TIME = 0.5;
const BARK_COOLDOWN = 3.5;

/** A sheepdog that patrols and smells the player out, shadows or no shadows. */
export interface Dog {
  x: number;
  dir: 1 | -1;
  min: number;
  max: number;
  sniff: number;
  cooldown: number;
}

export function makeDog(x: number, min: number, max: number): Dog {
  return { x, dir: 1, min, max, sniff: 0, cooldown: 0 };
}

/** Returns 'bark' on the tick the dog gives the player away. */
export function updateDog(
  d: Dog,
  dt: number,
  player: { cx: number; onFloor: boolean },
  creeping: boolean,
): 'bark' | null {
  d.cooldown = Math.max(0, d.cooldown - dt);
  d.x += d.dir * SPEED * dt;
  if (d.x >= d.max) {
    d.x = d.max;
    d.dir = -1;
  } else if (d.x <= d.min) {
    d.x = d.min;
    d.dir = 1;
  }

  const range = creeping ? CREEP_SNIFF_RANGE : SNIFF_RANGE;
  if (player.onFloor && Math.abs(player.cx - d.x) <= range && d.cooldown <= 0) {
    d.sniff += dt;
    if (d.sniff >= SNIFF_TIME) {
      d.sniff = 0;
      d.cooldown = BARK_COOLDOWN;
      return 'bark';
    }
  } else {
    d.sniff = Math.max(0, d.sniff - dt);
  }
  return null;
}
