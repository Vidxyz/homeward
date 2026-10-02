export type TouchMode = 'auto' | 'on' | 'off';

/** Which way a thumb at `relX` (0 = left edge of the pad, 1 = right edge) is pushing. There is a small dead zone in the middle. */
export function dpadDirection(relX: number): 'left' | 'right' | null {
  if (relX < 0.45) return 'left';
  if (relX > 0.55) return 'right';
  return null;
}

/** Whether the on-screen buttons should show: forced on or off, or (auto) when the main pointer is a finger. */
export function touchVisible(mode: TouchMode, coarsePointer: boolean): boolean {
  return mode === 'on' || (mode === 'auto' && coarsePointer);
}

export function nextTouchMode(mode: TouchMode): TouchMode {
  return mode === 'auto' ? 'on' : mode === 'on' ? 'off' : 'auto';
}
