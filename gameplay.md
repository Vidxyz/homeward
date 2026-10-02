# Homeward: gameplay, decisions and constraints

This document describes **how the game plays**, **why it works the way it does**, and the **constraints** it was built under. It is the reference for design questions ("why does hiding need me to stand still?") and for tuning ("how do I make Act 4 easier?"). For setup, architecture, tests and deployment see [README.md](./README.md).

Numbers quoted here are the current values in code. Each is a named constant at the top of the file named in brackets; if a number here disagrees with the code, **the code is right** and this file needs updating.

---

## 1. The game in one paragraph

You are Odysseus, lost at sea, fighting your way home across five short acts taken from the *Odyssey*: a storm at sea, the Cyclops' cave, the Sirens, Scylla and Charybdis, and the return to Ithaca. It is a single-player pixel-art game. Each act has its own **twist** so that no two acts play the same: sailing, stealth, rhythm, a chase, and a disguise followed by an archery test. A first full run probably takes somewhere around 10 to 20 minutes depending on how often you die (an estimate from bot runs and playtests, not a measured figure). Your **total time** and **lives lost** can be saved to a local leaderboard.

The inspiration is *Ichigo*, the fictional first game in Gabrielle Zevin's *Tomorrow, and Tomorrow, and Tomorrow*: a small, atmospheric platformer about loss and getting home. The game is an homage in spirit, not a copy of anything in the book or any film.

---

## 2. Controls and screens

### Controls

The game only ever reads four inputs, whatever the device (`engine/input.ts`). Their *meaning* changes by act, which is the main way the acts differ.

| Input | Keyboard | Touch |
|---|---|---|
| Left / Right | Arrow keys, A / D | on-screen ◀ ▶ |
| **Jump** | Space, Up, W, Z | on-screen **A** |
| **Action** | X, S, Down, Left or Right Shift | on-screen **B** |
| Pause | P or Esc | Pause button |

What **Jump** and **Action** mean in each act:

| Act | Jump | Action |
|---|---|---|
| 1 The Storm | steer **up** | steer **down** |
| 2 The Cyclops' Cave | jump | **creep** (hold): slow and silent |
| 3 The Sirens | jump | **resist** (press on the beat) |
| 4 Scylla and Charybdis | jump, and a second jump in mid-air | **sprint** (hold while running) |
| 5 Ithaca | jump, and **loose the arrow** at the bow | **stoop** (hold) in the hall, **draw** at the bow |

Keyboard capture only happens while a game is actually running, so Space and Enter keep working on menu buttons.

### Screens

- **Title screen:** Continue (if you have progress), New Journey, a row to **begin at any act**, How to play, and Leaderboard.
- **Act picker:** every act is unlocked from the start, always. Names are shown (an idea to hide unreached acts was tried and removed: it protected nothing).
- **Intro card:** a few lines of story before each act, with a **Set sail / Onward** button and a **Back to main menu** button.
- **Pause (P or Esc):** Resume, **Main menu**, How to play. The main menu is the way to switch acts mid-game; progress is saved.
- **How to play:** a scrollable summary of the controls and each act's rules (`help.ts`). Opens from the title and the pause menu, and P or Esc closes it. A test guarantees every act has tips.
- **Ending:** the closing lines, your time and lives lost, a name box for the leaderboard, and Sail again.
- **Leaderboard:** Fastest and Fewest deaths views, with a Full runs only / All runs switch.

---

## 3. Rules shared by every act

### Movement feel (platformer acts)

Tuned in `engine/physics.ts` (`PHYS`). Values are in pixels and seconds; a tile is 16 px.

- Run speed **90 px/s**. Gravity 900. Jump velocity -300, which rises about **3 tiles** (50 px).
- **Variable jump height:** release jump early and the rise is cut (velocity clamped to -110).
- **Coyote time 0.1 s:** you can still jump just after walking off a ledge.
- **Jump buffer 0.1 s:** a jump pressed just before landing fires on landing.
- **Air jump:** acts can allow extra jumps in mid-air (`Body.maxAirJumps`). Only Act 4 does (one, at -270, restored on landing).
- Hazards use a **slightly smaller hitbox** than the player (inset by a couple of pixels) so near misses feel fair.
- The simulation runs at a **fixed 60 Hz**; rendering interpolates the player and camera.

Act 1 does not use this physics at all (the ship moves freely in four directions, see below).

### Death, respawn and checkpoints

- Dying shows a short burst effect, then you respawn after **0.7 s** at your **last checkpoint** (or the act's start). Dying costs *time*, and counts against your lives-lost total, but there is no "game over".
- **Checkpoints** are flags (buoys in Act 1). They trigger when you overlap a zone 3 tiles tall around them, once, and the most recent one is where you respawn. Going back to an earlier one does not move your respawn point backwards.
- Most acts give a short **grace period after (re)spawning** (1.5 s in Acts 2 and 4) during which the act's main threat cannot kill you, so you are never killed before you can react.
- **A death resets the act's hazards** (loose stalactites, crumbling platforms, queued strikes, timers) to a known state, so a respawn is always a clean restart of the local situation, never a continuation of a half-triggered trap.

### Fairness principles used throughout

These recur in the design and are worth following when adding content:

1. **Every threat is telegraphed.** Lightning has a shrinking red ring, gusts have chevrons, strikes have a growing column, logs have an arrow, falling rock shakes first, crumbling platforms shake and show cracks, the bow's green zone is drawn.
2. **Reachability is guaranteed by construction.** Generated platform paths only create gaps that a normal jump can cross (`pathGen.ts`), and tests assert it.
3. **No unfair squeezes.** Spikes are placed where a jump cannot land on them; respawn points sit on safe interior tiles; loose rocks stay out of the lane a gap opens onto; the camera follows a player who runs ahead so the screen edge never traps them.
4. **A bot is used as a sanity check, not a judge.** Throwaway bot tests confirmed each act is completable and exposed unfair spots (see section 7). They cannot judge feel.
5. **Mercy where failure repeats.** The bow's target widens after every miss.
6. **Grace and forgiveness before challenge.** Long-to-fill meters (suspicion, "seen") that drain slowly give one mistake room to be corrected.

---

## 4. The five acts

### Act 1: The Storm (sailing)

**Goal:** steer a ship through a field of reefs to the shore. **Twist:** free four-direction movement instead of jumping.

- **Controls:** arrows steer; Up/Down are the Jump and Action keys. Top speed 80 px/s across and 70 px/s up/down, with quick acceleration (400 px/s²) [`act1.ts`].
- **The level** is a sea chart 220 columns wide and 12 tall. About 16 **reef walls** run top to bottom, each with a **gap that slides up and down** (4 tiles tall for the first third of the act, 3 after). Slide amplitude 24 to 40 px; speed ramps up from about 0.6 to 1.5 rad/s as the act progresses. A gap never gets closer than 24 px to the top or bottom edge [`sea.ts`]. Between walls are loose rocks (tiles) kept out of the lane the gap opens onto.
- **Current:** three layered waves push the ship up and down (up to about 32 px/s) and slightly sideways (6 px/s). The mix never visibly repeats [`swellAt`].
- **Gusts:** every 2.5 to 6.5 s (once you are out of the starting bay) a gust shoves the ship vertically for 1.2 s, 35 to 60 px/s at peak. It is announced 0.5 s ahead by **chevrons on both screen edges** that point the way you will be pushed.
- **Lightning:** from 20 tiles in, every 2.8 s a strike lands 40 to 130 px ahead of the ship. A red ring shrinks for 1.0 s, the bolt flashes for 0.25 s, and it kills within a 22 px radius.
- **Checkpoints:** buoy gates inside every third gap. **Goal:** the shore at the far right.

**Decisions:**
- This act was originally a platformer with a rising tide. It felt like a tutorial platformer rather than a storm, so it became sailing; the gaps were first static, then made to slide because static was "too easy".
- The current was made unpredictable on request (layered waves plus random gusts), with a telegraph so it stays fair.
- Ship acceleration was raised from 180 to 400 after a bot found the steering too sluggish to thread a 3-tile gap comfortably.
- Using Jump and Action as Up and Down keeps the whole game on four inputs, and touch gets sailing for free.

### Act 2: The Cyclops' Cave (stealth, in two parts)

**Goal:** take the stake from the Cyclops' den, then escape. **Twist:** stealth that flips from *sight* to *sound*.

The level is 190 columns: the first half is the sneak, the second half the escape.

#### Part 1: sneak to the den

- **The Cyclops** is a dark giant pacing the back of the cave (columns 8 to 92). His behaviour is deliberately **erratic**: he walks for 1 to 3.5 s at 22 to 40 px/s, then either keeps going (40%), suddenly reverses (25%), or stops for 0.5 to 2 s (35%; half of the stops he looks left and right every 0.6 s) [`cave/cyclops.ts`]. He only sees **forward**, up to **150 px**, if a ray to you is not blocked by solid tiles.
- **Being seen:** the SEEN meter fills in **1.1 s** of exposure (and kills you at full) and drains over 1.2 s. You get **1.5 s of grace** after every spawn.
- **Hiding:** you are hidden only if you are **fully inside a shadow** (the dark zones), **moving at 40 px/s or slower**, and the shadow is **not lit by a brazier**. A "HIDDEN" label confirms it. Running through a shadow does not hide you. **Hold ACTION to creep** (40% speed, 36 px/s), which is slow enough to stay hidden and is silent.
- **Braziers** (two) flare and dim on a cycle (lit about half the time) and while flared they light the shadows within 80 px, making them unsafe.
- **Noise:** the Cyclops walks over to investigate loud events within **520 px**: bumping a sheep, the dog barking, a stalactite crashing (320 px), or a sleeping giant waking. Sheep also bleat on their own, but those random bleats are **sound only, not alarms**.
- **Sheep:** seven graze on the floor as small **solid** obstacles you can jump over or stand on. Bumping one makes it bleat (1.5 s cooldown).
- **Sheepdog:** patrols columns 42 to 60 at 36 px/s and sniffs you out at **54 px** (only **20 px** if you are creeping) after 0.5 s, ignoring shadows, then barks (3.5 s cooldown) and the Cyclops hears it.
- **Sleeping giants** (columns 13 and 66): a loud noise (running, jumping or landing) within **90 px** wakes one for 6 s. An awake giant watches with a 110 px cone and counts toward the SEEN meter. A roar also attracts the Cyclops.
- **Terrain:** two 3-tile **pits** (jump them; landings are loud) and **twelve loose stalactites** (four in this half). A stalactite sets off when you walk within 22 px beneath it: it shakes for 0.7 s, then falls and is deadly while falling, then crashes (loud). Running through is safe; standing under it is not.
- **Objective:** the stake, at column 89. Its pickup is four tiles tall so it cannot be jumped over.

#### Part 2: the escape

- Taking the stake **blinds him**. He is thrown back to column 87, **stunned for 1.5 s**, and from then on **hunts by sound alone**.
- **Noise is now the whole game.** Running makes noise out to **220 px**, jumping **300 px**, landing **340 px**, standing still and creeping **none**. A label (QUIET / NOISY / COVERED) and expanding rings show how loud you are.
- He **hunts at 125 px/s**, faster than you can run (90), so being heard is dangerous. When not hunting he staggers slowly (18 to 30 px/s), biased toward the exit. If he gets within **24 px** of you he grabs you (he cannot while stunned).
- **The flock stampedes** toward the exit: 16 sheep in four clusters running at 58 to 72 px/s, looping round. **Staying within 40 px of a sheep masks your noise**, and you can **ride** a sheep's back. Bumping a sheep still bleats and still draws him.
- Stalactites keep falling (eight more). On a respawn he is **stunned again**, so you never get killed instantly by the thing that just killed you.
- **Checkpoints** at columns 22, 37, 78, 91 and 138; the exit is at column 186.

**Decisions:**
- The first version had a single patrolling Cyclops. Playtesting said it was easy once you got past him (and, at first, that shadows should hide you automatically). The fix was both: shadows now hide you automatically (no button), but only when you are still or creeping, and the second half became a different kind of challenge (sound instead of sight), inspired by the myth where Odysseus escapes under the sheep.
- Random sheep bleats were making the Cyclops converge on the player constantly, which felt unfair, so they no longer alert him. The seen timer was lengthened from 0.7 s to 1.1 s for the same reason.
- The giants were moved off the narrow ledge between the pits after a bot showed that every pit jump woke one right next to the landing spot.
- Phase 2 tuning came from a bot: with a slow hunter and a distant start a runner was never caught. Raising his speed above the run speed, widening the noise radii and starting him close made running a real gamble.
- Creeping is the same input in both halves, so what you learn in the first half carries to the second.

### Act 3: The Sirens (rhythm)

**Goal:** cross a chain of rock platforms over the sea. **Twist:** the Sirens' song drags you backwards in time with a beat, and you resist it by pressing ACTION on the beat.

- A **beat** falls every **1.6 s**. The song pulls you left at **30 px/s** all the time, surging to **120 px/s** for **0.55 s** after each beat [`act3.ts`].
- A **ring closes on the player** exactly on each beat. Pressing **ACTION within ±0.16 s of a beat** grants **1.3 s of immunity** to the pull (a gold shield ring shows it). A badly timed press does nothing.
- The path is generated (`genPath`, seed 33): platforms 3 to 5 tiles wide, 2 thick, gaps of at most 2 tiles (narrower than Act 4 because the pull shortens jumps). Checkpoints about every 30 columns. Falling into the sea kills.
- Without a perfectly timed press you can still progress (the base pull is slower than your run), but the surges push you toward the platform edges, which is the danger.

**Decisions:** a rhythm mechanic was chosen so the Sirens feel like a *song* rather than another obstacle, using only the existing Action input. The 0.16 s window is a compromise between demanding and playable; the cue ring is what makes it fair.

### Act 4: Scylla and Charybdis (chase)

**Goal:** outrun the collapsing strait to the far pier. **Twist:** an auto-scrolling chase with a deadly left edge, and several hazards that punish standing still.

- **The scroll:** the screen scrolls right, accelerating from **45 to 75 px/s** over the act (progress-based, so a respawn mid-level is not harder). It is deliberately **slower than your run (90)** so a clean runner stays ahead. The camera also **follows a player who runs ahead** so the screen is never more than 200 px behind you [`strait/whirlpool.ts`, `act4.ts`].
- **The whirlpool** is the left edge of the screen: touching it (being fully past it) kills you, and within 140 px of it you are **dragged left** at up to 75 px/s, harder the closer you are.
- **Start grace:** at the start and after each respawn the screen holds still for 1.5 s and the drag is off.
- **Scylla's strikes** (vertical necks) are **15 px wide**, are active for 0.35 s, and are telegraphed by a growing column for **0.9 s** (0.55 s after 75% of the act). Their key rule: they **aim where you will be when they land** (`your x + your velocity x warning time`), so **standing still is no safer than running straight**. Volleys come every 2.2 s, getting down to 1.4 s, and escalate by progress: single aimed strikes, then **pincers** (two heads either side of the aim, safe in the middle), then **combs** (three heads, safe lanes between) [`strait/strikes.ts`].
- **Crumbling platforms:** some platforms (about a quarter early, more later; never the checkpoint ones) are cracked. They begin to give way once you stand on them. The delay is `0.4 s + width / run speed`, long enough to run across at full speed but not to linger. They fall for 3.5 s and re-form [`strait/crumble.ts`].
- **Spikes:** wide platforms (4+ tiles, after a gap of 2+) carry a spike on their 4th tile, so a normal jump lands clear of it and you hop it.
- **Thrown wreckage:** in the last third, every 3.2 s a log is hurled along your foot level from the right, with an arrow at the screen edge for 0.8 s first. Jump it.
- **Aids:** a **double jump** (a second, slightly weaker jump in mid-air) and a **sprint**: hold ACTION while moving to run about **35% faster**. It drains a bar in **2.2 s**; running it dry leaves you **winded** (70% speed) for **1.5 s**, and it refills in about 3.5 s. Standing still costs nothing.
- The path is generated (`genPath`, seed 44): platforms 3 to 6 tiles wide, gaps up to 2 (3 later), over water.

**Decisions:**
- Act 4 was the act most reported as "too easy", then "too hard". The first overhaul added all five difficulty features at once (aimed strikes, crumbling, accelerating scroll, drag, spikes and logs). Playtesting then asked for relief, so: strikes narrowed to 75%, the late scroll slowed from 90 to 75 px/s, and a double jump and a sprint were added (the sprint is a stamina trade-off, not a free speedup). The aids are Act 4 only, because other acts' jumps were tuned around a single jump and Act 2 uses jump noise as a mechanic.
- A bot found three genuine unfair spots that were fixed: the crumble timer was shorter than the time needed to cross a platform; spikes could be landed on; and a player who ran ahead and stood at the right edge could be trapped (the edge was a wall), which is why the camera now follows.
- The act is still judged by feel: a bot cannot read Scylla's patterns, so completion with strikes on is unverified by machine.

### Act 5: Ithaca (disguise, then the bow)

**Goal:** get through the suitors' hall unrecognised, then string the great bow and shoot through twelve axes. **Twist:** a social-stealth disguise rule, then two skill minigames.

**The road (columns 0 to 35).** A calm walk (speed 63 px/s) with trees and **Argos** the dog, who knows you ("ARGOS KNOWS YOU. HUSH."). No hazards.

**The hall (columns 36 to 111).** You are a beggar. Nine **suitors** sit feasting; each glances left, then right, at uneven intervals (1.5 to 4.5 s) and can see **110 px** ahead through a faint cone [`ithaca/suitors.ts`].
- **The disguise rule** [`ithaca/disguise.ts`]: if a suitor can see you **and** you look suspicious, **suspicion** fills (1.0 s to full, then you are seized and sent back to a checkpoint; it drains over 1.5 s). You look suspicious if you are **not stooped** and you are **running or jumping** (speed above 55 px/s, or off the ground). Your normal hall walk is 72 px/s, so walking tall *in view* is suspicious too.
- **Stooping** (hold ACTION) makes you safe in view at a shuffling 40 px/s, but it costs a **stamina bar**: **8 s** of stooping from full, **4 s** to refill, and when it empties you cannot stoop until it has recovered to 35%. This cost is what stops the answer being "just hold the button the whole hall".
- **Five tables** (columns 46 to 96) are a tile high: hop them. Tables also partly block line of sight. Suitors jeer ("BEGGAR!", "OUT, OLD MAN!", ...) for flavour. Torches and tapestries set the scene.
- **Checkpoints** at columns 34, 62 and 102.

**The bow (column 108).** Reaching the rack freezes you and starts a two-stage trial [`ithaca/bow.ts`].
1. **String it:** hold ACTION to draw (tension rises 0.55 per second) and release inside the **green zone**, which is **14% of the meter wide** (0.74 to 0.88). Too early is "too weak"; holding to the end makes the string slip. Failing just means trying again.
2. **The twelve axes:** a marker sweeps up and down in front of twelve axe-heads with rings. **Press JUMP** when it lines up with the rings. The target band starts at ±0.12 of the sweep and **widens by 0.04 after every miss**, up to ±0.32, so it cannot become impossible. A hit sends the arrow through all twelve and ends the game.

The exit light sits behind the hall's back wall: the act is won by the bow, not by walking.

**Decisions:**
- The old Act 5 was a quiet walk and was reported as too simple, so it was replaced with the suitors and the bow (the two ideas the player chose from a short list).
- The stoop stamina was added after reasoning that a free stoop made the hall trivial, then tuned with a simulated player that always knows when it is watched: at 6 s of stamina it still took a death; at 8 s it passed clean, so a human who misjudges a glance will still be caught. 8 s is the shipped value.
- The bow's green zone was narrowed from 18% to 14% on request.
- Jumping while stooped is allowed (a hopping beggar is not suspicious): hopping tables is meant to be a stamina-and-timing decision, not a trap.

---

## 5. Runs, saves and the leaderboard

### What is saved (all in the browser's `localStorage`)

- **Progress** (`homeward.save.v1`): the furthest act reached (for Continue), the lives lost so far this run, the sound setting, the run's accumulated play time, and whether the run is a full run.
- **Leaderboard** (`homeward.leaderboard.v1`): saved scores.

Both are per browser **and per origin**, and loading is defensive (corrupt or blocked storage falls back to defaults; the game still plays).

### What counts as a "run"

- **Time** is **active play time**, summed over the acts: it counts only while an act is running. It excludes the intro cards, pausing and the menus. It *includes* the 0.7 s after each death, so dying costs time as well as a life.
- **Lives lost** is the total number of deaths over the whole run.
- A **full run** is one played from the start: **New Journey**, or **Act I** chosen from the act picker. Completing acts in order adds their time and deaths.
- If you **skip ahead** (start at Act II or later from the picker) it becomes a **partial run**. Its time and deaths start from zero at that point and cover only what you play from there.
- When you finish the game, the counters reset, so replaying the last act from Continue is a fresh partial run and cannot be submitted twice.

### The leaderboard

- When you finish Act V the **name box is always offered**, for full and partial runs alike. A partial run is saved too, but is tagged "(partial)" and only appears under **All runs**; the default view is **Full runs only**, because a one-act time is not comparable with a full run.
- **Two rankings, lower is better for both:** *Fastest* (time, with fewer deaths breaking a tie) and *Fewest deaths* (deaths, with the faster time breaking a tie). A final tie goes to the earlier run.
- Names are trimmed and limited to 12 characters ("Anonymous" if blank). The board keeps the 200 most recent entries and shows the top 10 per view.
- **It is local only.** A global board would need a backend and server-side anti-cheat, because times are measured on the client. That was deliberately left out.

---

## 6. Tuning guide

Almost every number is a named constant. To make an act easier or harder, change these (and run `pnpm test`; a few tests assert the intended shape of a tuning):

| Act | Easier | Harder | Where |
|---|---|---|---|
| All | Longer respawn grace | Shorter | `GRACE` / `START_GRACE` in `act2.ts`, `act4.ts` |
| 1 | Wider/slower gaps, weaker gusts, less lightning | the opposite | `layoutAct1` (gap height, `amp`, `speed`), `GUST_*`, `BOLT_*` in `act1.ts` |
| 2 (sight) | Longer `SEEN_AFTER`, shorter `CYCLOPS_RANGE`, fewer fallers, shorter dog `SNIFF_RANGE` | the opposite | `act2.ts`, `cave/draw.ts`, `cave/layout.ts`, `cave/dog.ts` |
| 2 (escape) | Slower `HUNT_SPEED`, shorter `NOISE_RADIUS`, longer `STUN_TIME` | the opposite | `cave/cyclops.ts`, `cave/noise.ts` |
| 3 | Wider `WINDOW`, weaker `SURGE_PULL`, longer `PROTECT` | the opposite | `act3.ts` |
| 4 (pressure) | Lower `SCROLL_END`, smaller `PULL_MAX`, narrower `STRIKE_HALF_WIDTH` | the opposite | `strait/whirlpool.ts`, `act4.ts` |
| 4 (patterns) | Longer `warnTime`, slower `volleyEvery`, fewer combs | the opposite | `strait/strikes.ts` |
| 4 (terrain) | Fewer crumbling platforms/spikes, later logs | the opposite | `layoutAct4`, `LOGS_FROM` in `act4.ts` |
| 4 (aids) | Longer `DRAIN_TIME`, shorter `WINDED_TIME`, a stronger air jump | the opposite | `strait/sprint.ts`, `PHYS.airJumpV` |
| 5 (hall) | Larger `STOOP_DRAIN`, smaller `SUITOR_RANGE`, longer suspicion fill | the opposite | `ithaca/disguise.ts`, `ithaca/suitors.ts` |
| 5 (bow) | Wider `GREEN_MIN..GREEN_MAX`, larger `BASE_TOLERANCE` or `MERCY` | the opposite | `ithaca/bow.ts` |

---

## 7. How the design evolved (playtest-driven)

The game was built in one session and tuned by playing it and by throwaway bots. The notable turns, so the reasons are not lost:

1. **Act 1** went platformer, then sailing, then moving gaps, then a layered current with telegraphed gusts.
2. **Act 2** went from a one-way patrolling giant to an erratic one, gained sheep as obstacles, then shadows that hide you automatically, then the requirement to be still or creeping, then terrain (pits, falling rock, braziers), a dog, sleeping giants, and a second, sound-based half. Random bleats stopped alarming him; the seen timer was lengthened.
3. **Act 4** was made harder in five ways at once, found too hard, then eased in four more (narrower strikes, slower scroll, double jump, sprint).
4. **Act 5** replaced a quiet walk with the suitors and the bow.
5. **Text** was blurry (a browser font scaled up) and was replaced with a built-in pixel font.
6. **Menus:** the pause screen got a proper Main menu button and a P/Esc hint; every act became selectable; a How to play screen was added.
7. **The leaderboard** first excluded runs that skipped ahead entirely, which hid the name box from a player who had used the picker. It now always offers the box and tags partial runs.

Two process lessons recorded for next time:
- A bot that is "too naive" fails for the wrong reasons; read the first death before trusting the verdict. Several of the unfair spots above were found this way, and several "failures" turned out to be the bot's fault.
- Changing several difficulty levers in one go makes it hard to know which one the player felt. Change one at a time and ask.

---

## 8. Constraints and known limitations

**Technical constraints**
- **No backend, no accounts, no assets.** Everything (art, text, audio) is generated in code; saves are `localStorage`. This keeps it a tiny static deployment with nothing to run or secure.
- **Internal resolution 320 x 192** (20 x 12 tiles), scaled up with nearest-neighbour filtering. The canvas keeps a 5:3 shape.
- **Fixed 60 Hz simulation.** Frame-rate independent by design.
- **Audio** starts only after a user gesture (browser rule), when an act begins or via the first click. Sound is simple synthesis; there is no volume slider, only an on/off toggle that is remembered.
- **Canvas text is uppercase only**, with a limited character set (`engine/font.ts`).
- **Browsers:** needs Canvas 2D and ES2022. `localStorage` is optional (the game plays without saving).

**Design constraints**
- **Four inputs only** (left, right, jump, action). Every mechanic, including sailing and the bow, has to fit that, which is also what makes touch controls free.
- **Short acts.** Each act is minutes long, so each has one clear twist rather than layered systems.
- **Mechanics are deterministic.** Randomness is seeded (`mulberry32`), so behaviour is reproducible in tests; the only non-seeded randomness is cosmetic audio pitch.

**Known limitations**
- Rendering, audio and the React screens have no automated tests; game feel is judged by playing.
- Touch controls have only been verified in emulation, not on a range of real devices.
- There is no gamepad support, no volume or key-rebinding settings, and no replay or ghost for the leaderboard.
- The leaderboard is per browser and per origin; each deployed domain starts empty.
- Act 4's completion with Scylla active is not machine-verified (the bot cannot read the patterns).
- The leaderboard rewards both speed and few deaths separately, so a fast, sloppy run and a slow, careful one each have a place; there is no combined score by design (the request was for the two measures, "lesser the better for both").
