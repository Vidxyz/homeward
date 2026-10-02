export interface Entry {
  name: string;
  /** Total play time for the run, in seconds. */
  seconds: number;
  /** Lives lost over the whole run. */
  deaths: number;
  /** ISO date the run was finished. */
  date: string;
}

export type SortKey = 'time' | 'deaths';

export const BOARD_KEY = 'homeward.leaderboard.v1';
const MAX_ENTRIES = 200;
const NAME_MAX = 12;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** m:ss */
export function formatTime(seconds: number): string {
  const total = Math.floor(Math.max(0, seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return name === '' ? 'Anonymous' : name;
}

function compare(a: Entry, b: Entry, by: SortKey): number {
  const first = by === 'time' ? a.seconds - b.seconds : a.deaths - b.deaths;
  if (first !== 0) return first;
  const second = by === 'time' ? a.deaths - b.deaths : a.seconds - b.seconds;
  if (second !== 0) return second;
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

/** Best first: lower is better for both measures; the other measure breaks a tie, then the earlier run. */
export function ranked(list: Entry[], by: SortKey, limit = 10): Entry[] {
  return [...list].sort((a, b) => compare(a, b, by)).slice(0, limit);
}

export function rankOf(list: Entry[], entry: Entry, by: SortKey): number {
  return ranked(list, by, list.length).indexOf(entry) + 1;
}

export function addEntry(list: Entry[], entry: Entry): Entry[] {
  return [...list, entry].slice(-MAX_ENTRIES);
}

function parseEntry(v: unknown): Entry | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const { seconds, deaths } = o;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
  if (typeof deaths !== 'number' || !Number.isFinite(deaths) || deaths < 0) return null;
  return {
    name: cleanName(typeof o.name === 'string' ? o.name : ''),
    seconds,
    deaths: Math.floor(deaths),
    date: typeof o.date === 'string' ? o.date : '',
  };
}

export function loadBoard(storage: StorageLike | null = defaultStorage()): Entry[] {
  try {
    const raw = storage?.getItem(BOARD_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseEntry).filter((e): e is Entry => e !== null);
  } catch {
    return [];
  }
}

export function saveBoard(list: Entry[], storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(BOARD_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the board just is not remembered */
  }
}
