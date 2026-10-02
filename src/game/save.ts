export interface SaveData {
  furthestAct: number;
  deaths: number;
  muted: boolean;
  /** The acts that have been started (their names are revealed on the act picker). Always includes Act 1. */
  seen: number[];
}

export const DEFAULT_SAVE: SaveData = { furthestAct: 1, deaths: 0, muted: false, seen: [1] };
export const SAVE_KEY = 'homeward.save.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, Math.floor(v)))
    : fallback;
}

function cleanSeen(v: unknown): number[] {
  const acts = Array.isArray(v) ? v : [];
  const set = new Set<number>([1]);
  for (const a of acts) if (typeof a === 'number' && Number.isInteger(a) && a >= 1 && a <= 5) set.add(a);
  return [...set].sort((x, y) => x - y);
}

export function loadSave(storage: StorageLike | null = defaultStorage()): SaveData {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      furthestAct: clampInt(p.furthestAct, 1, 5, 1),
      deaths: clampInt(p.deaths, 0, 1_000_000, 0),
      muted: p.muted === true,
      seen: cleanSeen(p.seen),
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(data: SaveData, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: the game still plays, it just doesn't save */
  }
}
