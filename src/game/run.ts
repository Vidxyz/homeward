import { cleanName, type Entry } from './leaderboard';
import type { SaveData } from './save';

/** Save changes for starting a fresh journey: it counts towards the leaderboard. */
export function startRun(): Pick<SaveData, 'furthestAct' | 'deaths' | 'runSeconds' | 'runValid'> {
  return { furthestAct: 1, deaths: 0, runSeconds: 0, runValid: true };
}

/** Add the play time of the act just completed to the run. */
export function afterActCompleted(save: SaveData, actSeconds: number): Pick<SaveData, 'runSeconds'> {
  return { runSeconds: save.runSeconds + actSeconds };
}

/**
 * Starting at an act with the picker. Act I is just a fresh run; anything later skips ahead, so the run
 * can no longer be compared with others and becomes practice.
 */
export function skipAhead(act: number): Pick<SaveData, 'runValid'> | ReturnType<typeof startRun> {
  return act === 1 ? startRun() : { runValid: false };
}

/** The leaderboard entry for a run that has just been finished (act V included), or null for a practice run. */
export function finishedRun(save: SaveData, name: string, lastActSeconds: number, now: Date): Entry | null {
  if (!save.runValid) return null;
  return {
    name: cleanName(name),
    seconds: save.runSeconds + lastActSeconds,
    deaths: save.deaths,
    date: now.toISOString(),
  };
}
