# Undertale HTML — Seven Souls Edition

A browser port of UNDERTALE with the **Seven Souls mod** and a rebuilt loading
experience.

**port by Kantasu** (no site link)

> Based on the [Undertale-HTML](https://github.com/Wigdos-Inc/Undertale-HTML)
> browser port. UNDERTALE was created by Toby Fox — this is a fan project;
> please support the official game.

## What's different from the upstream repo

### 1. Brand-new loading screen
- Undertale-themed boot screen with a pixel SOUL that fills up as the game data
  downloads, live percentage, stage labels and rotating tips.
- Real per-part download progress (the five `game.unx.partN` files are fetched
  with streaming progress) with one automatic retry per part and a manual
  RETRY button on failure.
- The service worker cache (dead code upstream) is now actually registered,
  so the ~100 MB of game data is cached for instant/offline repeat visits.
  Small mod files (`mod/*`) are always fetched network-first so updates apply
  immediately.
- The overlay hides itself automatically when the game prints
  "Entering main loop."

### 2. Seven Souls mod
After the data downloads you pick a SOUL:

| Soul | Color | Effect |
|------|-------|--------|
| DETERMINATION | red | Vanilla adventure |
| PATIENCE | cyan | Your heart is cyan; Flowey wants nothing to do with you |
| BRAVERY | orange | Orange heart |
| INTEGRITY | blue | Blue heart |
| PERSEVERANCE | purple | Purple heart |
| KINDNESS | green | Green heart |
| JUSTICE | yellow | Yellow heart |

For any non-determination soul:
- The battle SOUL (and every place `spr_heart` is used — shops, dates, game
  over, mode restores) uses that soul's heart sprite.
- **Flowey becomes a "save point":** his friendliness pellets can no longer
  hurt you, the kill-ring phase is cut short, and the vanilla rescue sequence
  (full heal + Toriel's fireball + Flowey flees) kicks in early, so Toriel's
  story continues as normal.
- The intro dialogue is rewritten — Flowey notices your soul color.
- **The Omega Flowey fight always uses the red determination soul**
  (`obj_vsflowey_heart` uses `spr_ourheart`, which is untouched).

Your choice is remembered in `localStorage` (with a "Previously: …" hint);
reload the page to change souls. Navigate with arrow keys / click, confirm
with Z / Enter.

### 3. Credits
- The title-screen credit now reads `PORT BY KANTASU`.
- The old porter's URL and the spacebar shortcut that opened it are gone.

## How it works (technical)
`mod/patches.json` contains per-soul byte patches generated offline
(`../scripts/gen_patches.py` parses the GameMaker `.unx` format — CODE/STRG/
SPRT/TPAG chunks and the reference chains — to compute them). Before the
GameMaker runner boots, `mod/mod.js` applies the chosen soul's patch list to
the merged `game.unx` ArrayBuffer in memory:

- **Soul texture:** `spr_heart`'s two texture-page-item pointers are
  redirected to the chosen soul sprite's entries (8 bytes).
- **Dialogue:** same-or-shorter string replacements, NUL-padded to the old
  record space (the runtime reads strings as C strings).
- **Flowey behavior:** the pellet collision handler's first branch is changed
  from `bf` to `b` (unconditional skip — pellets do nothing), and the
  kill-ring timer `alarm[9]` is shortened from 150 to 45 frames so Toriel's
  fireball interrupts it almost immediately (the fireball path also fully
  heals you, hence "save point").
- **Credits:** the `PORT BY …` string is replaced and the `KeyPress 32`
  handler is turned into a jump-to-end no-op.

No 100 MB re-uploads needed — the original game parts stay byte-identical
and the mod is ~8 KB of patches applied at load time.

## Files
- `mod/mod.js` — patch engine + soul selector UI
- `mod/patches.json` — generated patch data (7 souls)
- `index.html` / `style.css` / `sw.js` — loading screen, styles, offline cache
- `lang/`, `savesync.js`, `runner.*`, `game.unx.part1-5` — unchanged upstream

