'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ACTS } from '@/game/acts';
import type { Input } from '@/game/engine/input';
import { Game } from '@/game/game';
import {
  addEntry,
  cleanName,
  formatTime,
  fullRuns,
  loadBoard,
  rankOf,
  ranked,
  saveBoard,
  type Entry,
  type SortKey,
} from '@/game/leaderboard';
import { afterActCompleted, afterGameFinished, finishedRun, skipAhead, startRun } from '@/game/run';
import { DEFAULT_SAVE, loadSave, writeSave, type SaveData } from '@/game/save';
import { ACT_TIPS, CONTROLS, GENERAL_TIPS } from '@/game/help';
import { ENDING_LINES, ROMAN } from '@/game/story';
import type { Key } from '@/game/types';

type Screen = 'title' | 'narration' | 'playing' | 'paused' | 'ending' | 'leaderboard' | 'help';

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
  const helpFromRef = useRef<'title' | 'paused'>('title');
  const [act, setAct] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [furthest, setFurthest] = useState(1);
  const [muted, setMuted] = useState(false);
  const [board, setBoard] = useState<Entry[]>([]);
  const [boardView, setBoardView] = useState<SortKey>('time');
  const [fullOnly, setFullOnly] = useState(true);
  const [helpFrom, setHelpFrom] = useState<'title' | 'paused'>('title'); // where How to Play returns to
  const [pending, setPending] = useState<Entry | null>(null); // the finished run, awaiting a name
  const [saved, setSaved] = useState<Entry | null>(null); // the entry just added to the board
  const [nameInput, setNameInput] = useState('');

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
    setBoard(loadBoard());

    const game = new Game(canvas, {
      onDeath: (d) => {
        setDeaths(d);
        persist({ deaths: d });
      },
      onActComplete: (a, d, seconds) => {
        setDeaths(d);
        if (a >= ACTS.length) {
          // The journey is over: always offer the run to the leaderboard (marked partial if it skipped ahead),
          // and reset the counters so replaying the last act from Continue starts a fresh partial run.
          setPending(finishedRun({ ...saveRef.current, deaths: d }, '', seconds, new Date()));
          setSaved(null);
          persist(afterGameFinished());
          setScreen('ending');
        } else {
          const next = Math.max(saveRef.current.furthestAct, a + 1);
          persist({ deaths: d, furthestAct: next, ...afterActCompleted(saveRef.current, seconds) });
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
      if (e.target instanceof HTMLInputElement) return; // typing a name
      if (e.repeat || (e.code !== 'Escape' && e.code !== 'KeyP')) return;
      if (screenRef.current === 'help') setScreen(helpFromRef.current); // P or Esc closes the help
      else togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  const openHelp = (from: 'title' | 'paused') => {
    helpFromRef.current = from;
    setHelpFrom(from);
    setScreen('help');
  };

  const newJourney = () => {
    persist(startRun());
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
    const patch = skipAhead(n);
    persist(patch);
    if (patch.deaths !== undefined) setDeaths(patch.deaths);
    setAct(n);
    setScreen('narration');
  };

  const begin = () => {
    const g = gameRef.current;
    if (!g) return;
    g.audio.unlock();
    g.startAct(act, saveRef.current.deaths);
    if (act > saveRef.current.furthestAct) {
      persist({ furthestAct: act });
      setFurthest(act);
    }
    setScreen('playing');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameRef.current?.audio.setMuted(next);
    persist({ muted: next });
  };

  const submitScore = (e: FormEvent) => {
    e.preventDefault();
    if (!pending || saved) return;
    const entry: Entry = { ...pending, name: cleanName(nameInput) };
    const next = addEntry(board, entry);
    setBoard(next);
    saveBoard(next);
    setSaved(entry);
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
            <p className="hint">Arrows / WASD to move · Space to jump · X to act · P or Esc to pause</p>
            <div className="acts">
              <p className="hint">Or begin at any act:</p>
              <div className="acts-row">
                {ACTS.map((a) => (
                  <button key={a.id} className="chip" onClick={() => jumpToAct(a.id)}>
                    {ROMAN[a.id - 1]} · {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <button className="chip" onClick={() => openHelp('title')}>
                How to play
              </button>
              <button className="chip" onClick={() => setScreen('leaderboard')}>
                Leaderboard
              </button>
            </div>
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
            <button className="chip" onClick={() => setScreen('title')}>
              Back to main menu
            </button>
          </div>
        )}

        {screen === 'paused' && (
          <div className="overlay">
            <h2 className="heading">Paused</h2>
            <button className="btn" onClick={togglePause} autoFocus>
              Resume (P)
            </button>
            <button className="btn btn-alt" onClick={() => setScreen('title')}>
              Main menu
            </button>
            <button className="chip" onClick={() => openHelp('paused')}>
              How to play
            </button>
            <p className="hint">The main menu lets you choose any act. Your progress is saved.</p>
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
              {pending ? `Time ${formatTime(pending.seconds)} · ` : ''}
              {deaths === 0 ? 'You never fell.' : `The sea took you ${deaths} time${deaths === 1 ? '' : 's'} on the way.`}
            </p>
            {pending && !saved && (
              <form className="score-form" onSubmit={submitScore}>
                <label className="hint" htmlFor="name">
                  Your name for the leaderboard
                </label>
                <input
                  id="name"
                  className="name-input"
                  value={nameInput}
                  maxLength={12}
                  placeholder="Odysseus"
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                />
                <button className="btn" type="submit">
                  Save my run
                </button>
              </form>
            )}
            {pending && !pending.full && !saved && (
              <p className="hint">You skipped ahead, so this is saved as a partial run (shown under All runs, not the main board).</p>
            )}
            {saved && saved.full && (
              <p className="hint">
                Saved! #{rankOf(fullRuns(board), saved, 'time')} fastest · #{rankOf(fullRuns(board), saved, 'deaths')} fewest deaths
              </p>
            )}
            {saved && !saved.full && <p className="hint">Saved as a partial run. Start a New Journey to set a time for the main board.</p>}
            <div className="row">
              <button className="chip" onClick={() => setScreen('leaderboard')}>
                Leaderboard
              </button>
              <button className="btn" onClick={newJourney} autoFocus={!pending || !!saved}>
                Sail again
              </button>
            </div>
          </div>
        )}

        {screen === 'help' && (
          <div className="overlay help">
            <h2 className="heading">How to play</h2>
            <button className="chip" onClick={() => setScreen(helpFrom)}>
              {helpFrom === 'paused' ? 'Back to the game (P)' : 'Back (P)'}
            </button>
            <div className="help-body">
              <ul className="help-list">
                {GENERAL_TIPS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <table className="board help-controls">
                <thead>
                  <tr>
                    <th>Control</th>
                    <th>Keyboard</th>
                    <th>Touch</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTROLS.map((c) => (
                    <tr key={c.action}>
                      <td>{c.action}</td>
                      <td>{c.keys}</td>
                      <td>{c.touch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ACT_TIPS.map((a) => (
                <section key={a.id}>
                  <h3 className="help-act">
                    Act {ROMAN[a.id - 1]} · {a.name}
                  </h3>
                  <ul className="help-list">
                    {a.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <button className="btn" onClick={() => setScreen(helpFrom)}>
              {helpFrom === 'paused' ? 'Back to the game' : 'Back'}
            </button>
          </div>
        )}

        {screen === 'leaderboard' && (
          <div className="overlay">
            <h2 className="heading">Leaderboard</h2>
            <div className="row">
              <button className="chip" aria-pressed={boardView === 'time'} onClick={() => setBoardView('time')}>
                Fastest
              </button>
              <button className="chip" aria-pressed={boardView === 'deaths'} onClick={() => setBoardView('deaths')}>
                Fewest deaths
              </button>
              <button className="chip" aria-pressed={!fullOnly} onClick={() => setFullOnly((v) => !v)}>
                {fullOnly ? 'Full runs only' : 'All runs'}
              </button>
            </div>
            {(fullOnly ? fullRuns(board) : board).length === 0 ? (
              <p className="hint">
                {fullOnly ? 'No full runs yet. Finish the game from a New Journey to set a time.' : 'No runs yet.'}
              </p>
            ) : (
              <table className="board">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Time</th>
                    <th>Deaths</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked(fullOnly ? fullRuns(board) : board, boardView).map((e, i) => (
                    <tr key={`${e.date}-${i}`} className={e === saved ? 'mine' : undefined}>
                      <td>{i + 1}</td>
                      <td>
                        {e.name}
                        {!e.full && <span className="tag"> (partial)</span>}
                      </td>
                      <td>{formatTime(e.seconds)}</td>
                      <td>{e.deaths}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn" onClick={() => setScreen('title')} autoFocus>
              Back
            </button>
          </div>
        )}

        <div className="toolbar">
          {screen === 'playing' && (
            <button className="chip" onClick={togglePause} title="Pause (P or Esc)">
              Pause (P)
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
