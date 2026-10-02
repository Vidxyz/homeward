import { AudioEngine } from './engine/audio';
import { Input } from './engine/input';
import { Renderer } from './engine/renderer';
import { ODYSSEUS } from './sprites';
import { ROMAN } from './story';
import { Session } from './session';
import { TILE, VIEW_H, VIEW_W } from './types';

export interface GameEvents {
  onDeath(deaths: number): void;
  /** `seconds` is the play time spent in the act just completed (pauses and menus excluded). */
  onActComplete(act: number, deaths: number, seconds: number): void;
}

const STEP = 1 / 60;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class Game {
  readonly input = new Input();
  readonly audio = new AudioEngine();
  private readonly renderer: Renderer;
  private session: Session;
  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private readonly detachInput: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly events: GameEvents,
  ) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported in this browser');
    this.renderer = new Renderer(ctx);
    this.session = new Session(1, 0);
    this.detachInput = this.input.attach(window, () => this.running);
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Loads an act for display without running it (menus and narration cards). */
  loadAct(act: number, deaths: number): void {
    this.session = new Session(act, deaths);
    this.acc = 0;
  }

  startAct(act: number, deaths: number): void {
    this.audio.stopMusic();
    this.session = new Session(act, deaths);
    this.acc = 0;
    this.last = 0;
    this.input.releaseAll();
    this.running = true;
    this.audio.startMusic(this.session.act.music);
  }

  pause(): void {
    this.running = false;
    this.audio.stopMusic();
    this.input.releaseAll();
  }

  resume(): void {
    this.last = 0;
    this.running = true;
    this.audio.startMusic(this.session.act.music);
  }

  /** Dev/test hook: advance the simulation synchronously (works in background tabs where rAF is throttled). */
  debugAdvance(frames: number): void {
    for (let i = 0; i < frames && this.running; i++) this.step();
    this.render(1);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.detachInput();
    this.audio.stopMusic();
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.25, (now - (this.last || now)) / 1000);
    this.last = now;
    if (this.running) {
      this.acc += dt;
      while (this.running && this.acc >= STEP) {
        this.step();
        this.acc -= STEP;
      }
    }
    this.render(this.running ? this.acc / STEP : 1);
  };

  private step(): void {
    for (const e of this.session.update(STEP, this.input.frame())) {
      if (e.type === 'sfx') this.audio.sfx(e.name);
      else if (e.type === 'death') this.events.onDeath(e.deaths);
      else if (e.type === 'complete') {
        this.running = false;
        this.audio.stopMusic();
        this.input.releaseAll();
        this.events.onActComplete(e.act, e.deaths, this.session.time);
      }
    }
  }

  private render(alpha: number): void {
    const s = this.session;
    const r = this.renderer;
    const p = s.act.palette;
    const camX = lerp(s.camera.px, s.camera.x, alpha);
    const camY = lerp(s.camera.py, s.camera.y, alpha);
    r.textVisible = this.running;
    r.begin(camX, camY);

    s.inst.drawBack(r, camX, camY);
    r.tiles(s.level, p, camX, camY, s.time);
    this.drawMarkers(r, s);
    this.drawPlayer(r, s, alpha);
    s.inst.drawFront(r, camX, camY, s.player);
    this.drawHud(r, s);
  }

  private drawMarkers(r: Renderer, s: Session): void {
    const p = s.act.palette;
    s.level.checkpoints.forEach((c, i) => {
      r.rect(c.x + 7, c.y, 2, TILE, '#cbbba0');
      r.rect(c.x + 9, c.y + 1, 7, 5, s.tracker.isReached(i) ? p.accent : '#777777');
    });
    const g = s.level.goal;
    const glow = 0.2 + 0.1 * Math.sin(s.time * 3);
    r.rect(g.x + 2, 0, g.w - 4, g.y + g.h, p.accent, glow);
    r.rect(g.x + g.w / 2 - 1, g.y, 2, g.h, '#ffffff', 0.7);
  }

  private drawPlayer(r: Renderer, s: Session, alpha: number): void {
    const p = s.act.palette;
    if (s.dying > 0 && s.deathAt) {
      const age = 0.7 - s.dying;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        r.rect(
          s.deathAt.x + 5 + Math.cos(a) * age * 70,
          s.deathAt.y + 7 + Math.sin(a) * age * 70 + 150 * age * age,
          2, 2, p.accent, Math.max(0, 1 - age / 0.7),
        );
      }
      return;
    }
    const b = s.player;
    if (s.inst.drawPlayer?.(r, b, alpha, s.time)) return;
    const x = lerp(b.px, b.x, alpha) - 1;
    const y = lerp(b.py, b.y, alpha) - 2;
    let frame = ODYSSEUS.idle;
    if (!b.onGround) frame = ODYSSEUS.runB;
    else if (Math.abs(b.vx) > 10) frame = Math.floor(s.time / 0.12) % 2 === 0 ? ODYSSEUS.runA : ODYSSEUS.runB;
    r.sprite(frame, x, y, b.facing < 0);
  }

  private drawHud(r: Renderer, s: Session): void {
    const p = s.act.palette;
    r.text(`DEATHS ${s.deaths}`, 6, VIEW_H - 6, '#ffffff', 1, 'left', 0.9);
    if (s.time > 0 && s.time < 3.5) {
      const a = Math.min(1, 3.5 - s.time);
      r.text(`ACT ${ROMAN[s.act.id - 1]}`, VIEW_W / 2, 52, p.accent, 2, 'center', a);
      r.text(s.act.name, VIEW_W / 2, 66, '#ffffff', 1, 'center', a);
    }
  }
}
