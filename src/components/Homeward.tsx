'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ACTS } from '@/game/acts';
import type { Input } from '@/game/engine/input';
import { Game } from '@/game/game';
import { DEFAULT_SAVE, loadSave, writeSave, type SaveData } from '@/game/save';
import { ENDING_LINES, ROMAN } from '@/game/story';
import type { Key } from '@/game/types';

type Screen = 'title' | 'narration' | 'playing' | 'paused' | 'ending';

/** Set NEXT_PUBLIC_DEBUG=1 (or `pnpm dev:debug`) to get a jump-to-act panel on the title screen. */
const DEBUG_ENABLED = ['1', 'true'].includes(process.env.NEXT_PUBLIC_DEBUG ?? '');

function TouchButton({ k, label, getInput }: { k: Key; label: string; getInput: () => Input | null }) {
  const press = (down: boolean) => (e: ReactPointerEvent) => {
    e.preventDefault();
    getInput()?.set(k, down);
  };
  return (
    <button
      className={`touch touch-${k}`}
      aria-label={label}
      onPointerDown={press(true)}
      onPointerUp={press(false)}
      onPointerCancel={press(false)}
      onPointerLeave={press(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function Homeward() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const saveRef = useRef<SaveData>({ ...DEFAULT_SAVE });
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const [act, setAct] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [furthest, setFurthest] = useState(1);
  const [muted, setMuted] = useState(false);
  const [debugOn, setDebugOn] = useState(false);

  const persist = useCallback((patch: Partial<SaveData>) => {
    saveRef.current = { ...saveRef.current, ...patch };
    writeSave(saveRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const save = loadSave();
    saveRef.current = save;
    setFurthest(save.furthestAct);
    setDeaths(save.deaths);
    setMuted(save.muted);

    const game = new Game(canvas, {
      onDeath: (d) => {
        setDeaths(d);
        persist({ deaths: d });
      },
      onActComplete: (a, d) => {
        setDeaths(d);
        if (a >= ACTS.length) {
          persist({ deaths: d });
          setScreen('ending');
        } else {
          const next = Math.max(saveRef.current.furthestAct, a + 1);
          persist({ deaths: d, furthestAct: next });
          setFurthest(next);
          setAct(a + 1);
          setScreen('narration');
        }
      },
    });
    game.audio.setMuted(save.muted);
    gameRef.current = game;
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __homeward?: Game }).__homeward = game; // dev-only hook for scripted playtests
    }
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [persist]);

  // Show the upcoming act behind the narration card.
  useEffect(() => {
    if (screen === 'narration') gameRef.current?.loadAct(act, saveRef.current.deaths);
  }, [screen, act]);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    if (screenRef.current === 'playing') {
      g.pause();
      setScreen('paused');
    } else if (screenRef.current === 'paused') {
      g.resume();
      setScreen('playing');
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  const newJourney = () => {
    persist({ furthestAct: 1, deaths: 0 });
    setFurthest(1);
    setDeaths(0);
    setAct(1);
    setScreen('narration');
  };

  const continueJourney = () => {
    setAct(saveRef.current.furthestAct);
    setDeaths(saveRef.current.deaths);
    setScreen('narration');
  };

  const jumpToAct = (n: number) => {
    setAct(n);
    setScreen('narration');
  };

  const begin = () => {
    const g = gameRef.current;
    if (!g) return;
    g.audio.unlock();
    g.startAct(act, saveRef.current.deaths);
    setScreen('playing');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameRef.current?.audio.setMuted(next);
    persist({ muted: next });
  };

  const current = ACTS[act - 1];

  return (
    <main className="shell">
      <div className="stage">
        <canvas ref={canvasRef} className="canvas" aria-label="Homeward game" />

        {screen === 'title' && (
          <div className="overlay">
            <h1 className="title">HOMEWARD</h1>
            <p className="subtitle">an odyssey in five acts</p>
            {furthest > 1 && (
              <button className="btn" onClick={continueJourney} autoFocus>
                Continue (Act {ROMAN[furthest - 1]})
              </button>
            )}
            <button className="btn" onClick={newJourney} autoFocus={furthest === 1}>
              New Journey
            </button>
            <p className="hint">Arrows / WASD to move · Space to jump · X to act · Esc to pause</p>
            {DEBUG_ENABLED && (
              <div className="debug">
                <button className="chip" onClick={() => setDebugOn((v) => !v)} aria-pressed={debugOn}>
                  Debug mode: {debugOn ? 'on' : 'off'}
                </button>
                {debugOn && (
                  <div className="debug-acts">
                    {ACTS.map((a) => (
                      <button key={a.id} className="chip" onClick={() => jumpToAct(a.id)}>
                        {ROMAN[a.id - 1]} · {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {screen === 'narration' && current && (
          <div className="overlay">
            <p className="kicker">ACT {ROMAN[act - 1]}</p>
            <h2 className="heading">{current.name}</h2>
            {current.intro.map((line) => (
              <p key={line} className="line">
                {line}
              </p>
            ))}
            <button className="btn" onClick={begin} autoFocus>
              {act === 1 ? 'Set sail' : 'Onward'}
            </button>
          </div>
        )}

        {screen === 'paused' && (
          <div className="overlay">
            <h2 className="heading">Paused</h2>
            <button className="btn" onClick={togglePause} autoFocus>
              Resume
            </button>
          </div>
        )}

        {screen === 'ending' && (
          <div className="overlay">
            <h2 className="heading">Homeward</h2>
            {ENDING_LINES.map((line) => (
              <p key={line} className="line">
                {line}
              </p>
            ))}
            <p className="kicker">
              {deaths === 0 ? 'You never fell.' : `The sea took you ${deaths} time${deaths === 1 ? '' : 's'} on the way.`}
            </p>
            <button className="btn" onClick={newJourney} autoFocus>
              Sail again
            </button>
          </div>
        )}

        <div className="toolbar">
          {screen === 'playing' && (
            <button className="chip" onClick={togglePause}>
              Pause
            </button>
          )}
          <button className="chip" onClick={toggleMute}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>

        {screen === 'playing' && (
          <div className="touch-controls">
            <div className="touch-left">
              <TouchButton k="left" label="◀" getInput={() => gameRef.current?.input ?? null} />
              <TouchButton k="right" label="▶" getInput={() => gameRef.current?.input ?? null} />
            </div>
            <div className="touch-right">
              <TouchButton k="action" label="B" getInput={() => gameRef.current?.input ?? null} />
              <TouchButton k="jump" label="A" getInput={() => gameRef.current?.input ?? null} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
