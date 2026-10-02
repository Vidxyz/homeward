# Homeward

A five-act pixel-art platformer: Odysseus, lost at sea, fighting his way home. Inspired by *Ichigo*, the fictional game in Gabrielle Zevin's *Tomorrow, and Tomorrow, and Tomorrow*, and by Homer's *Odyssey*.

## Play

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Debug mode: `pnpm dev:debug` (sets `NEXT_PUBLIC_DEBUG=1`) adds a toggle on the title screen with buttons to jump straight to any act.

Controls: arrows or WASD to move, Space/Up/Z to jump, X/S/Shift for the action button, Esc or P to pause. On touch devices, on-screen buttons appear.

## The five acts

1. **The Storm**: sail a ship through the sliding gaps in reef walls, dodging lightning and reading the gusts. Up/Down steer with the jump/action keys.
2. **The Cyclops' Cave**: two parts. Sneak to his den past an erratic giant, a sheepdog, sleeping giants, falling stalactites and flaring braziers (shadows hide you only if you are still or creeping; hold ACTION to creep), then take the stake to blind him and escape while he hunts by sound. Running, jumping and landing are loud; the stampeding flock masks the noise.
3. **The Sirens**: resist the song's pull by pressing ACTION on the beat.
4. **Scylla and Charybdis**: an accelerating auto-scrolling chase. Scylla aims where you are going (stopping doesn't help) and escalates from single strikes to patterns, cracked platforms crumble underfoot, the whirlpool drags at you, spikes need hopping, and late on Charybdis hurls wreckage along the rocks.
5. **Ithaca**: the road home (Argos knows you), then the suitors' hall. Go in as a beggar: if a suitor sees you running, jumping or walking tall you lose your disguise, so hold ACTION to stoop (it tires you). Then string the great bow (hold ACTION, release in the green) and shoot through the twelve axes (press JUMP when the marker lines up).

## Develop

```bash
pnpm test        # Vitest unit tests for the pure game logic
pnpm typecheck
pnpm build
```

Layout: `src/game/` holds the engine (`engine/`), the five acts (`acts/`), a DOM-free `session.ts`, and the DOM wrapper `game.ts`. `src/components/Homeward.tsx` is the React shell. All art and audio are generated in code.

## Deploy

Not deployed yet. It is a standard Next.js app, so Vercel needs no configuration: import the repository and deploy.
