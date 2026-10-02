export const TILE = 16;
export const VIEW_W = 320;
export const VIEW_H = 192;

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Key = 'left' | 'right' | 'jump' | 'action';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  action: boolean;
  jumpPressed: boolean;
  actionPressed: boolean;
}

export const NO_INPUT: InputState = {
  left: false,
  right: false,
  jump: false,
  action: false,
  jumpPressed: false,
  actionPressed: false,
};

export type SfxName =
  | 'jump'
  | 'land'
  | 'death'
  | 'checkpoint'
  | 'win'
  | 'step'
  | 'beat'
  | 'perfect'
  | 'miss'
  | 'bleat'
  | 'thunder'
  | 'bark'
  | 'howl'
  | 'crash';

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
