import type { InputState, Key } from '../types';

const KEY_MAP: Record<string, Key> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyZ: 'jump',
  KeyX: 'action',
  KeyS: 'action',
  ArrowDown: 'action',
  ShiftLeft: 'action',
  ShiftRight: 'action',
};

export class Input {
  private held: Record<Key, boolean> = { left: false, right: false, jump: false, action: false };
  private jumpEdge = false;
  private actionEdge = false;

  set(key: Key, down: boolean): void {
    if (down && !this.held[key]) {
      if (key === 'jump') this.jumpEdge = true;
      if (key === 'action') this.actionEdge = true;
    }
    this.held[key] = down;
  }

  /** One snapshot per simulation tick; press edges are reported once, then cleared. */
  frame(): InputState {
    const s: InputState = {
      ...this.held,
      jumpPressed: this.jumpEdge,
      actionPressed: this.actionEdge,
    };
    this.jumpEdge = false;
    this.actionEdge = false;
    return s;
  }

  releaseAll(): void {
    (Object.keys(this.held) as Key[]).forEach((k) => this.set(k, false));
  }

  /** Keyboard bindings. Keys are only captured while `enabled()` is true so menus keep Space/Enter. */
  attach(target: Window, enabled: () => boolean = () => true): () => void {
    const down = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code];
      if (!k || !enabled()) return;
      e.preventDefault();
      if (!e.repeat) this.set(k, true);
    };
    const up = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code];
      if (!k) return;
      this.set(k, false);
    };
    const blur = () => this.releaseAll();
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    target.addEventListener('blur', blur);
    return () => {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    };
  }
}
