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
 * Starting at an act with the picker. Act I restarts the run (the "Continue" point is left alone). Anything
 * later is a partial run: it counts only what is played from there, so time and deaths start again, and it is
 * marked as not comparable with full runs.
 */
export function skipAhead(act: number): Partial<SaveData> {
  return { deaths: 0, runSeconds: 0, runValid: act === 1 };
}

/** Once the game is finished the counters reset, so replaying the last act from Continue is a fresh partial run. */
export function afterGameFinished(): Pick<SaveData, 'deaths' | 'runSeconds' | 'runValid'> {
  return { deaths: 0, runSeconds: 0, runValid: false };
}

/** The leaderboard entry for a run that has just been finished (act V included). Always offered; `full` says how fair it is. */
export function finishedRun(save: SaveData, name: string, lastActSeconds: number, now: Date): Entry {
  return {
    name: cleanName(name),
    seconds: save.runSeconds + lastActSeconds,
    deaths: save.deaths,
    date: now.toISOString(),
    full: save.runValid,
  };
}
