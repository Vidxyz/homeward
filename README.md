# Homeward

A five-act pixel-art platformer: Odysseus, lost at sea, fighting his way home. Inspired by *Ichigo*, the fictional game in Gabrielle Zevin's *Tomorrow, and Tomorrow, and Tomorrow*, and by Homer's *Odyssey*.

## Play

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Controls: arrows or WASD to move, Space/Up/Z to jump, X/S/Shift for the action button, Esc or P to pause. On touch devices, on-screen buttons appear.

## The five acts

1. **The Storm**: leap between wreckage as the tide rises and falls.
2. **The Cyclops' Cave**: stealth. Hold ACTION in the shadows to hide.
3. **The Sirens**: resist the song's pull by pressing ACTION on the beat.
4. **Scylla and Charybdis**: an auto-scrolling chase.
5. **Ithaca**: the walk home.

## Develop

```bash
pnpm test        # Vitest unit tests for the pure game logic
pnpm typecheck
pnpm build
```

Layout: `src/game/` holds the engine (`engine/`), the five acts (`acts/`), a DOM-free `session.ts`, and the DOM wrapper `game.ts`. `src/components/Homeward.tsx` is the React shell. All art and audio are generated in code.

## Deploy

Not deployed yet. It is a standard Next.js app, so Vercel needs no configuration: import the repository and deploy.
