'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Input } from '@/game/engine/input';
import { dpadDirection } from '@/game/touch';
import type { Key } from '@/game/types';

type GetInput = () => Input | null;

/**
 * Movement is one pad, not two buttons: a thumb can slide from left to right without lifting, the way you
 * would roll it across a d-pad. The pad captures the pointer so the thumb can drift outside it and keep working.
 */
function DPad({ getInput }: { getInput: GetInput }) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<'left' | 'right' | null>(null);
  const pointer = useRef<number | null>(null);
  const [dir, setDir] = useState<'left' | 'right' | null>(null);

  const apply = (next: 'left' | 'right' | null) => {
    if (next === current.current) return;
    current.current = next;
    setDir(next);
    const input = getInput();
    input?.set('left', next === 'left');
    input?.set('right', next === 'right');
  };

  const update = (e: ReactPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) apply(dpadDirection((e.clientX - r.left) / r.width));
  };

  const release = (e: ReactPointerEvent) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    apply(null);
  };

  return (
    <div
      ref={ref}
      className="touch-dpad"
      role="group"
      aria-label="Move left or right"
      onPointerDown={(e) => {
        e.preventDefault();
        pointer.current = e.pointerId;
        ref.current?.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`pad-half${dir === 'left' ? ' down' : ''}`}>◀</span>
      <span className={`pad-half${dir === 'right' ? ' down' : ''}`}>▶</span>
    </div>
  );
}

function ActionButton({ k, label, name, getInput }: { k: Key; label: string; name: string; getInput: GetInput }) {
  const [down, setDown] = useState(false);
  const set = (d: boolean) => {
    setDown(d);
    getInput()?.set(k, d);
  };
  return (
    <button
      className={`touch-btn${down ? ' down' : ''}`}
      aria-label={name}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** On-screen controls. Standard phone layout puts movement under the left thumb; `swapped` reverses the sides. */
export function TouchControls({ getInput, swapped }: { getInput: GetInput; swapped: boolean }) {
  return (
    <div className={`touch-controls${swapped ? ' swapped' : ''}`}>
      <DPad getInput={getInput} />
      <div className="touch-actions">
        <ActionButton k="action" label="B" name="Action" getInput={getInput} />
        <ActionButton k="jump" label="A" name="Jump" getInput={getInput} />
      </div>
    </div>
  );
}
