# Homeward — Design Spec

**Date:** 2026-10-02
**Status:** Draft for user review

## Summary

Homeward is a single-player, five-act pixel-art platformer in the spirit of *Ichigo*, the fictional game from Gabrielle Zevin's *Tomorrow, and Tomorrow, and Tomorrow*. The player is Odysseus, lost at sea and fighting his way home to Ithaca. The structure and episodes are drawn from Homer's *Odyssey*; it is an homage, not a copy of the book's game or of any film.

It is a single Next.js app with no backend, deployed to Vercel at the very end of the project (not before the user says so). The user will run it locally and request changes first.

## Goals and non-goals

**Goals**
- A complete, playable run of about 15 minutes for a first-time player, at moderate difficulty.
- Five acts, each with its own gameplay twist.
- Works with keyboard on desktop and touch controls on mobile.
- All art and audio generated in code: no asset files and no licensing concerns.
- Progress persisted locally.

**Non-goals**
- Multiplayer, accounts, leaderboards or any backend.
- Level editor tooling, localization, or analytics.
- Faithfully reproducing any specific film or the book's Ichigo.

## Architecture

- Next.js (App Router) and TypeScript, single app at the repo root. No monorepo.
- A thin React shell renders the title screen, the canvas host, the pause/mute overlay and touch controls.
- The game runs outside React in a plain TypeScript module driven by `requestAnimationFrame`, so React re-renders never affect gameplay. React and the game talk through a small interface: `start(act)`, `pause()`, `setMuted()`, and events (`onActComplete`, `onDeath`, `onQuit`).

## Engine (`src/game/engine/`)

Each unit has one purpose and is testable alone.

| Unit | Responsibility |
|---|---|
| Loop | Fixed-timestep update with interpolated rendering, so behavior is identical at any refresh rate |
| Input | One abstraction over keyboard and touch exposing `left`, `right`, `jump`, `action`; game code never sees the device |
| Physics and collision | Tile-based AABB collision, gravity, variable-height jump, coyote time, jump buffering; water/current regions modeled as force zones |
| Camera | Follows the player, clamps to level bounds, supports auto-scroll (Act 4) |
| Level loader | Parses ASCII tile maps (one file per act) into tiles, entities, spawn and checkpoints |
| Checkpoints | Records the last checkpoint; respawn restores position and act-local state |
| Renderer | Draws tiles, sprites and parallax layers at about 320×180, scaled up with nearest-neighbor filtering |
| Audio | Web Audio synth for effects and a per-act music loop; mute toggle |

## The five acts

Each act is a level file plus a small module implementing its twist.

1. **The Storm** — Sailing (revised after first playtest). The player steers a ship in four directions across a storm-tossed sea, threading gaps in reef walls (the gaps slide up and down), avoiding telegraphed lightning; a layered, uneven current and sudden telegraphed gusts shove the ship about. Up/Down use the jump/action keys. Reaching the shore ends the act.
2. **The Cyclops' Cave** — Stealth (revised after first playtest). Polyphemus paces erratically (walks, reverses, stops to look around) and has a line of sight; the player uses shadows. The player hides by standing fully inside a shadow (no button). A flock of sheep wanders the floor as solid obstacles; bumping one makes it bleat, and the Cyclops hears and investigates.
3. **The Sirens** — Resistance. A pull force drags the player toward the song; resisting means timing movement to a rhythm cue.
4. **Scylla and Charybdis** — Chase. Auto-scrolling strait with a whirlpool pulling backward on one side and strikes from the other.
5. **Ithaca** — Return. No hazards, a slow walk home, a short ending, and the death counter revealed.

## Art and audio

- Sprites are character grids defined in code, with a limited palette per act: grey-teal storm, firelit cave, blue-gold sirens, dark red strait, dawn Ithaca.
- Parallax sea layers, a changing sky gradient, and simple particles (spray, embers).
- Sound is synthesized: jump, land, death, checkpoint, bleat, thunder, ambient loop per act. Mute toggle persists.
- On-canvas text uses a built-in 5x7 pixel font drawn at whole-number scales (crisp when upscaled), not a browser font.

## Flow and persistence

- Title screen with **Continue** and **New Journey**, then the acts in order, with a narration card of one or two lines between acts, then the ending.
- Death: respawn at the last checkpoint after a short delay; a running death counter is kept.
- Saved in `localStorage`: furthest act reached, death count, mute setting. All access is wrapped in try/catch; if storage is unavailable the game still plays, just without saving.

## Testing

Vitest unit tests for the pure logic:
- Physics and collision (gravity, jump height, coyote time, wall and floor resolution)
- Level parser (valid maps, malformed maps)
- Checkpoint and respawn rules
- Stealth line-of-sight (Act 2)
- Rhythm timing windows (Act 3)
- Save/load with unavailable storage

Rendering, feel and difficulty are verified by playing locally.

## Delivery

- Git repository already initialized in this directory; commits are made in small steps (spec, plan, scaffold, engine, each act).
- Nothing is pushed or deployed until the user says so at the end. Vercel setup (project, repo, deploy) happens then.

## Open items

None. Decisions already made: single-player; twist per act; checkpoints and a death counter; short narration lines; keyboard plus touch; synthesized audio; `localStorage` saves; title "Homeward".
