import { ACTS } from './acts';
import type { ActInstance, ActModule } from './acts/types';
import { Camera } from './engine/camera';
import { CheckpointTracker } from './engine/checkpoints';
import { bodyAt, stepBody, type Body } from './engine/physics';
import type { Level } from './level';
import { NO_INPUT, overlaps, type InputState, type SfxName, type Vec } from './types';

export type SessionEvent =
  | { type: 'sfx'; name: SfxName }
  | { type: 'death'; deaths: number }
  | { type: 'complete'; act: number; deaths: number };

const DEATH_DELAY = 0.7;

/** DOM-free gameplay state: one act, one player, one run. */
export class Session {
  readonly act: ActModule;
  readonly level: Level;
  readonly inst: ActInstance;
  readonly camera: Camera;
  readonly tracker: CheckpointTracker;
  player: Body;
  deaths: number;
  time = 0;
  dying = 0;
  deathAt: Vec | null = null;
  finished = false;

  constructor(actNumber: number, deaths = 0) {
    const act = ACTS[actNumber - 1];
    if (!act) throw new Error(`unknown act ${actNumber}`);
    this.act = act;
    this.level = act.level;
    this.inst = act.create(act.level);
    this.camera = new Camera(this.level.cols, this.level.rows);
    this.tracker = new CheckpointTracker(this.level.spawn, this.level.checkpoints);
    this.deaths = deaths;
    this.player = bodyAt(this.level.spawn);
    this.placeCamera(this.inst.reset(this.level.spawn));
  }

  private placeCamera(scrollX: number | undefined): void {
    if (scrollX !== undefined) this.camera.snapX(scrollX);
    else this.camera.snapTo(this.player);
  }

  update(dt: number, input: InputState): SessionEvent[] {
    const events: SessionEvent[] = [];
    if (this.finished) return events;
    this.time += dt;

    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.respawn();
      return events;
    }

    const frame = this.inst.update(dt, this.player, input);
    frame.sfx?.forEach((name) => events.push({ type: 'sfx', name }));

    let died: boolean;
    if (this.inst.drive) {
      died = this.inst.drive(dt, this.player, input).died;
    } else {
      const res = stepBody(this.player, frame.freeze ? NO_INPUT : input, this.inst.world, dt, frame.push);
      died = res.died;
      if (res.jumped) events.push({ type: 'sfx', name: 'jump' });
      if (res.landed) events.push({ type: 'sfx', name: 'land' });
    }

    if (frame.cameraX !== undefined) this.camera.setX(frame.cameraX);
    else this.camera.follow(this.player);

    if (frame.kill || died) {
      this.deaths++;
      this.dying = DEATH_DELAY;
      this.deathAt = { x: this.player.x, y: Math.min(this.player.y, this.level.rows * 16 - 8) };
      events.push({ type: 'sfx', name: 'death' }, { type: 'death', deaths: this.deaths });
      return events;
    }

    if (this.tracker.update(this.player)) events.push({ type: 'sfx', name: 'checkpoint' });

    if (frame.complete || overlaps(this.player, this.level.goal)) {
      this.finished = true;
      events.push(
        { type: 'sfx', name: 'win' },
        { type: 'complete', act: this.act.id, deaths: this.deaths },
      );
    }
    return events;
  }

  private respawn(): void {
    const pos = this.tracker.respawn();
    this.player = bodyAt(pos);
    this.placeCamera(this.inst.reset(pos));
    this.deathAt = null;
  }
}
