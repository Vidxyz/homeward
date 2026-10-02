import type { Level } from '../level';
import type { Palette } from '../palettes';
import type { Track } from '../music';
import type { Body } from '../engine/physics';
import type { Renderer } from '../engine/renderer';
import type { World } from '../engine/world';
import type { InputState, SfxName, Vec } from '../types';

export interface ActFrame {
  /** Extra horizontal velocity (px/s) applied this tick: currents, song pull. */
  push: number;
  /** True if the act itself killed the player this tick (seen, caught, struck). */
  kill: boolean;
  /** Set by auto-scrolling acts to drive the camera. */
  cameraX?: number;
  sfx?: SfxName[];
}

export interface ActInstance {
  readonly world: World;
  update(dt: number, player: Body, input: InputState): ActFrame;
  /** Called on (re)spawn. Returns a camera X for auto-scrolling acts. */
  reset(respawn: Vec): number | undefined;
  drawBack(r: Renderer, camX: number, camY: number): void;
  drawFront(r: Renderer, camX: number, camY: number, player: Body): void;
}

export interface ActModule {
  id: number;
  name: string;
  intro: string[];
  palette: Palette;
  music: Track;
  level: Level;
  create(level: Level): ActInstance;
}
