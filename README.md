# Homeward

A five-act pixel-art platformer: Odysseus, lost at sea, fighting his way home. Single player, runs entirely in the browser, no backend. Inspired by *Ichigo*, the fictional game in Gabrielle Zevin's *Tomorrow, and Tomorrow, and Tomorrow*, and by Homer's *Odyssey*.

This README is for **developers** (setup, architecture, tests, deployment, maintenance). For how the game plays, what each act does, and the design decisions and constraints behind it, read **[gameplay.md](./gameplay.md)**.

**Status:** feature complete and playable locally. **Not deployed yet** (see [Deployment](#deployment)). Nothing has been pushed to a remote.

---

## Quick start

Requirements: **Node.js 20+** (developed on Node 25) and **pnpm** (developed with pnpm 11; the lockfile is `pnpm-lock.yaml`, so use pnpm, not npm or yarn).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server with hot reload |
| `pnpm build` | Production build (also type-checks and compiles) |
| `pnpm start` | Serve the production build locally (run `pnpm build` first) |
| `pnpm test` | Run every unit test once (Vitest) |
| `pnpm typecheck` | `tsc --noEmit` |

Before committing, run all three of `pnpm test`, `pnpm typecheck` and `pnpm build`. They are quick (a couple of seconds each).

---

## Tech stack

| | |
|---|---|
| Framework | Next.js (App Router) and React, TypeScript (`strict`) |
| Rendering | A single HTML `<canvas>` at 320 x 192, scaled up with `image-rendering: pixelated`. No game framework |
| Art | Drawn in code (character-grid sprites, rectangles, circles). **No image files** |
| Text on the canvas | A built-in 5x7 bitmap font (`engine/font.ts`), so it stays crisp when scaled. Uppercase only |
| Audio | Web Audio synthesis (`engine/audio.ts`). **No audio files** |
| Tests | Vitest (Node environment, no DOM) |
| Persistence | `localStorage` only (progress and leaderboard) |
| Menus | Title (with act picker), intro cards, pause, How to play, ending, leaderboard: all in `Homeward.tsx` |
| Dependencies | `next`, `react`, `react-dom` at runtime. Nothing else |

Versions are whatever `pnpm add` resolved at the time (Next 16, React 19, TypeScript 7, Vitest 5). **Heed `AGENTS.md`:** this Next.js version has breaking changes from older releases, and its docs ship in `node_modules/next/dist/docs/`. Read the relevant guide there before changing framework-level code (routing, config, metadata).

`next dev` regenerates `AGENTS.md` and `CLAUDE.md` in the repo root. They are committed on purpose (the file itself says so); leave them alone.

---

## How it is put together

The key idea: **the game is plain TypeScript that knows nothing about React or the DOM**, which is what makes it testable.

```
React shell (src/components/Homeward.tsx)         screens, menus, touch buttons, save/leaderboard UI
        │  owns a
        ▼
Game (src/game/game.ts)                           DOM side: requestAnimationFrame loop, canvas, input, audio, HUD
        │  owns a
        ▼
Session (src/game/session.ts)                     NO DOM: one act, one player, one run of that act. update(dt, input)
        │  uses
        ▼
ActModule / ActInstance (src/game/acts/*)         the level plus the act's rules (its "twist")
        │  uses
        ▼
engine (src/game/engine/*)                        physics, world, camera, checkpoints, input, renderer, audio, font
```

### Directory map

```
src/
  app/                 Next.js entry: layout.tsx, page.tsx, globals.css (menus, overlays, touch controls)
  components/
    Homeward.tsx       The only React component: screens, save/leaderboard, keyboard shortcuts
  game/
    types.ts           Shared constants (TILE=16, VIEW 320x192), Vec/Rect, InputState, SfxName
    level.ts           parseLevel(): ASCII rows -> Level
    levelBuilder.ts    LevelBuilder: paints ASCII rows with put()/rect()
    session.ts         Gameplay state machine (deaths, respawn, checkpoints, completion)
    game.ts            Loop, rendering order, HUD banner, player drawing
    save.ts            SaveData + localStorage (progress)
    leaderboard.ts     Leaderboard entries, ranking, localStorage
    run.ts             Rules for what counts as a full vs partial run
    story.ts           Roman numerals and the ending text
    help.ts            Content of the How to Play screen (controls and per-act tips)
    palettes.ts, sprites.ts, music.ts
    engine/            physics.ts, world.ts, camera.ts, checkpoints.ts, input.ts,
                       renderer.ts, font.ts, fx.ts, audio.ts
    acts/
      types.ts         ActModule / ActInstance / ActFrame (the contract every act implements)
      index.ts         ACTS = [act1 ... act5]
      act1.ts ... act5.ts       one orchestrator per act
      pathGen.ts       Seeded, reachable-by-construction platform paths (acts 3 and 4)
      sea.ts           Act 1: moving reef gaps, current, gusts
      stealth.ts       Line of sight, shadow-hiding rules (act 2)
      rhythm.ts        Beat timing (act 3)
      sheep.ts         Sheep collision (act 2)
      cave/            Act 2 modules (cyclops, flock, dog, giants, hazards, noise, layout, draw)
      strait/          Act 4 modules (strikes, crumble, whirlpool, sprint, debris)
      ithaca/          Act 5 modules (suitors, disguise, bow, layout, draw)
docs/superpowers/
  specs/               The original design spec (kept up to date with revisions)
  plans/               The original implementation plan (historical, NOT kept in sync)
```

Every `*.test.ts` sits next to the file it tests.

### The act contract

An act is an `ActModule` (`acts/types.ts`):

- `id`, `name`, `intro` (the intro-card lines), `palette`, `music`, `level` (a parsed `Level`), and `create(level)`.
- `create` returns an `ActInstance` holding that run's state:
  - `world`: tile solidity/hazard queries (built with `makeWorld`).
  - `update(dt, player, input)` returns an `ActFrame`: `push` (extra horizontal velocity), `kill`, `cameraX` (auto-scroll acts), `sfx`, `freeze` (a minigame has taken the controls), `complete` (won by some means other than reaching the goal).
  - `reset(respawn)` is called on every (re)spawn and must put act-local state back (return a camera X for auto-scrolling acts).
  - `drawBack` / `drawFront` draw behind and in front of the tiles and player.
  - Optional `drive` (act moves the player itself, instead of platformer physics, as Act 1 does) and `drawPlayer` (act draws its own player: the ship, the beggar).

Draw order each frame (in `game.ts`): `drawBack`, tiles, checkpoint flags and goal beam, player, `drawFront`, HUD banner.

### Levels

Levels are **ASCII**. `LevelBuilder` paints rows and `parseLevel` reads them. Legend:

| Char | Meaning |
|---|---|
| `.` | empty |
| `#` | solid |
| `^` | hazard (spikes) |
| `~` | deadly water |
| `H` | shadow zone (Act 2) |
| `S` | player spawn (exactly one) |
| `C` | checkpoint |
| `G` | goal (several `G` tiles merge into one rectangle) |
| any other letter | an **entity** marker, removed from the tile map and returned in `level.entities` (acts use these for trees, suitors, the stake, braziers, and so on) |

Tiles are 16 px. Left, right and top outside the level are solid walls; falling off the bottom kills. Platform paths for Acts 3 and 4 come from `genPath` (`acts/pathGen.ts`), which is seeded and constrained so every platform is reachable with a normal jump; do not hand-edit generated levels, change the generator's parameters or seed instead. Several mechanics (crumbling platforms, moving reef walls, tables) are *not* tiles: they live in the act and feed the world through `makeWorld`'s `solidOverride` hook or the act's own collision.

### Timing and physics

- Fixed 60 Hz simulation (`STEP = 1/60` in `game.ts`). Rendering interpolates the player and camera. Never use wall-clock time in game logic; use the `dt` you are given.
- `engine/physics.ts` holds the tuning constants (`PHYS`): gravity 900, run speed 90 px/s, jump velocity -300 (about 3 tiles), coyote time 0.1 s, jump buffer 0.1 s, variable jump height, optional air jumps (`Body.maxAirJumps`).
- Collision is tile based, axis by axis. Hazards use a slightly smaller box than the player so near misses feel fair.

### Persistence

Two `localStorage` keys, both wrapped in try/catch (the game plays fine if storage is blocked):

| Key | Contents | Module |
|---|---|---|
| `homeward.save.v1` | `furthestAct`, `deaths`, `muted`, `runSeconds`, `runValid` | `save.ts` |
| `homeward.leaderboard.v1` | list of `{ name, seconds, deaths, date, full }` | `leaderboard.ts` |

Loading is defensive: bad values are clamped or dropped, and older shapes are upgraded (an old entry with no `full` field counts as a full run; an old save with no `runValid` is treated as a practice journey). If you change a shape, keep it backward compatible or bump the key version.

Data lives **per browser and per origin**. A different domain (including each Vercel preview URL) has its own empty save and leaderboard.

---

## Testing

```bash
pnpm test                       # everything
pnpm vitest run src/game/acts   # a folder
pnpm vitest run -t "Cyclops"    # by test name
pnpm vitest                     # watch mode
```

What is tested: all the **pure logic**. Physics, level parsing, checkpoints, save/leaderboard/run rules, path generation, line of sight, rhythm, every act's mechanics (cyclops, flock, dog, giants, strikes, crumbling, sprint, suitors, disguise, bow, ...), and whole-act behaviour through `Session` (death and respawn, completion, each act surviving 20 s of play without throwing).

What is **not** unit tested: canvas drawing, audio output, the React screens, and game *feel*. Those are checked by playing.

Tips:

- **Test through `Session`** to exercise an act end to end without a browser: `new Session(actNumber)`, then `update(1/60, input)` in a loop. See `session.test.ts` for the pattern (teleporting the player by assigning `s.player.x/y`, and reaching into an act's private fields with a cast to set up a scenario).
- **Write the pure logic as its own module with a test first** (this is how every act mechanic was built). Keep drawing in a separate `draw.ts`.
- When a test teleports the player far down a level, remember the act's camera/edge rules (Act 4's right edge is a wall; set `camX` too).
- Tests that need a believable level can use `parseLevel([...])` with a few ASCII rows.

### Playtesting in a browser (dev builds only)

In development (`NODE_ENV !== 'production'`) the page exposes `window.__homeward`, the `Game` instance. Useful from the console or a browser-automation script:

```js
const g = window.__homeward;
g.startAct(4, 0);              // start Act 4 with 0 deaths (skip the UI)
g.session.player.x = 1200;     // teleport; g.session.camera.snapTo(g.session.player)
g.input.set('right', true);    // hold a key: 'left' | 'right' | 'jump' | 'action'
g.debugAdvance(120);           // run 120 simulation ticks synchronously, then render
g.session.inst                 // the act instance (private fields are visible at runtime)
```

`debugAdvance` exists because browsers heavily throttle `requestAnimationFrame` in background or occluded tabs, so the normal loop barely runs when a script is driving the page. It is not in production builds' page code path.

### Balance-checking with bots

Difficulty was checked with throwaway "bot" tests (a loop that reads the level and the act's state and presses keys), run as a scratch `*.scratch.test.ts` and then deleted. They are good for answering "is this still completable?" and "how many deaths does a competent player take?" but not "does it feel good?". If you add one, do not commit it.

---

## Common maintenance tasks

### Tune difficulty

Almost every number is a named constant at the top of the relevant file. [gameplay.md](./gameplay.md) has a table mapping "make X easier or harder" to the constant. After changing one, run `pnpm test`: a few tests assert the *shape* of a tuning (for example "the Act 4 scroll ends slower than the player runs", "the green zone is 14% wide") and will tell you if you crossed an intended line.

### Add or change an act

1. Put the pure mechanics in their own module with a `*.test.ts` (as `acts/strait/` does).
2. Build the level in a `layout.ts` or inside the act file using `LevelBuilder`; parse it with `parseLevel`.
3. Implement an `ActInstance` (see [The act contract](#the-act-contract)).
4. Export an `ActModule` and add it to `ACTS` in `acts/index.ts`. Add its palette (`palettes.ts`) and music track (`music.ts`) at the matching index (index = act id - 1).
5. Anything that assumes five acts: the save clamps `furthestAct` to 1..5 (`save.ts`), and the ending is triggered in `Homeward.tsx` when `act >= ACTS.length`.
6. Add a case to the `every act` smoke tests in `session.test.ts`.

### Add a sound effect

Add its name to `SfxName` in `types.ts`, a `case` in `AudioEngine.sfx` (`engine/audio.ts`), and emit it from an act via `ActFrame.sfx`. Audio does nothing until the first user click (`audio.unlock()` is called when an act begins), as browsers require.

### Change text, colours, menus

- Canvas text: `Renderer.text` (screen space) or `worldText`; uppercase letters, digits and a little punctuation only (`engine/font.ts` has the glyphs and a test that validates them).
- Palettes: `palettes.ts`. Menus and overlays: `Homeward.tsx` and `globals.css`.

### Gotchas worth knowing

- **World vs screen drawing.** `Renderer.rect` / `circle` / `worldText` take *world* coordinates (the camera offset is applied); `screenRect` / `screenCircle` / `text` take *screen* coordinates. Drawing UI with a world method puts it off-screen.
- **`reset(respawn)` must restore act-local state** (strikes, timers, crumbling platforms). Forgetting it causes "died, respawned, instantly died again" loops.
- **Respawn grace.** Several acts give a short grace period after (re)spawn so a player is never killed before they can act. Keep that when adding hazards.
- **Death clears act hazards by design** (for example, a falling stalactite that killed you resets).
- **Don't read input in the renderer** and don't draw in `update`. Keep the simulation deterministic given `dt` and input.
- **Seeded randomness.** Acts use `mulberry32(seed)` (`pathGen.ts`) so behaviour is reproducible in tests. Don't use `Math.random` in gameplay logic (it is used only for cosmetic audio pitch variation).
- **Next.js dev tips:** `localStorage` is shared by every page on `localhost:3000`, so a stale save from an earlier build can confuse manual testing; clear `homeward.save.v1` and `homeward.leaderboard.v1` to start fresh.

---

## Deployment

The app is a standard Next.js project with no server code, no environment variables, no database and no `vercel.json`. Vercel detects everything. **It has not been deployed yet.**

### Option A: Git integration (recommended)

1. Push the repository to GitHub (the project is a local git repo on `main` with no remote yet):
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In Vercel: **Add New... > Project**, import the repo.
3. Leave the defaults. Framework preset: **Next.js**. Install command: auto-detected (pnpm, from `pnpm-lock.yaml`). Build command: `next build`. Output: automatic. Node.js version: 20.x or newer.
4. Deploy. Every later push to `main` redeploys; other branches and PRs get preview URLs.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel            # first run: log in, link or create the project, deploys a preview
vercel --prod     # deploy to production
```

### Pre-deploy checklist

```bash
pnpm test && pnpm typecheck && pnpm build
pnpm start        # then open http://localhost:3000 and play through at least one act
```

### Post-deploy checks

- The title screen loads and the canvas renders (no console errors).
- Sound starts after the first click and the Sound toggle works.
- Keyboard play works. On a phone (or with touch emulation) the on-screen buttons appear while playing.
- Finish a run and save a score; reload and confirm it is still on the leaderboard. Remember this is a **fresh origin**, so it starts with an empty save and board.
- Rolling back: Vercel keeps previous deployments; promote an earlier one from the dashboard if needed.

### Things to know about hosting

- It is effectively a static site (the single page is prerendered); there is nothing to scale and no server-side secret to protect.
- Scores are local to each visitor's browser. A shared or global leaderboard would need a backend (for example a Vercel Marketplace database plus API routes) and some form of anti-cheat, because times are measured on the client. That was deliberately left out.

---

## Conventions

- **Small commits**, each with a message in the form `feat:`, `fix:`, `tune:`, `test:`, `docs:`, `chore:`, `revert:`. Run test, typecheck and build before committing.
- **Pure logic first, with tests; drawing separate.** New mechanics live in their own small module.
- **Named constants for every tuning number**, at the top of the file, with a comment saying what it means. Prefer changing a constant over adding a special case.
- **No new runtime dependencies** without a good reason. The project is deliberately dependency-light.
- **No asset files.** If you want art or sound, generate it in code to keep the repo and the bundle tiny and license-free.
- Keep `docs/superpowers/specs/2026-10-02-homeward-design.md` in step with significant design changes (it has "revised after playtesting" notes). The plan in `docs/superpowers/plans/` is the original implementation plan and is kept only for history.

---

## Known limitations and ideas

- No automated tests for rendering, audio or the React screens (play-test those).
- Canvas text is uppercase only and has a limited character set.
- Local leaderboard only (per browser). Times are client-measured, so a global board would need server-side checks.
- No gamepad support. Touch controls exist but have only been checked in emulation, not on a range of real devices.
- The Act 4 bot checks could not fully clear the act with Scylla's strikes enabled (the bot cannot read patterns as a person can), so Act 4's difficulty is judged by playing, not by the bot.
- Ideas not built: a gamepad layer, a settings menu (volume, controls), more acts or an endless mode, replays or ghosts for the leaderboard.
