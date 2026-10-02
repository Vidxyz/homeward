import type { SfxName } from '../types';
import type { Track } from '../music';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private track: Track | null = null;
  private step = 0;

  /** Must be called from a user gesture (a click or key press). */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(name: SfxName): void {
    switch (name) {
      case 'jump': this.tone(260, 0.14, 'square', 0.07, 520); break;
      case 'land': this.tone(120, 0.08, 'triangle', 0.08, 70); break;
      case 'death': this.tone(300, 0.5, 'sawtooth', 0.09, 50); break;
      case 'checkpoint':
        this.tone(523, 0.12, 'triangle', 0.08);
        this.tone(784, 0.2, 'triangle', 0.08, undefined, 0.1);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.09, undefined, i * 0.12));
        break;
      case 'step': this.tone(60, 0.25, 'sine', 0.12, 40); break;
      case 'beat': this.tone(90, 0.18, 'sine', 0.07, 60); break;
      case 'perfect':
        this.tone(660, 0.1, 'triangle', 0.08);
        this.tone(990, 0.18, 'triangle', 0.08, undefined, 0.07);
        break;
      case 'miss': this.tone(150, 0.12, 'square', 0.04, 100); break;
    }
  }

  startMusic(track: Track | null): void {
    this.stopMusic();
    this.track = track;
    if (!track) return;
    this.step = 0;
    this.timer = setInterval(() => this.tick(), 60000 / track.bpm / 2);
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  private tick(): void {
    const tr = this.track;
    if (!tr) return;
    const n = tr.notes[this.step % tr.notes.length];
    if (n) this.tone(n, 0.35, tr.wave, 0.035);
    if (this.step % 8 === 0) {
      const b = tr.bass[Math.floor(this.step / 8) % tr.bass.length];
      this.tone(b, 1.6, 'sine', 0.05);
    }
    this.step++;
  }
}
