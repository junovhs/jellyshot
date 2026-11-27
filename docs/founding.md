# Jellyshot — founding doc

> **Amended 2026-11-26.** The world, premise and level structure here are superseded: see `docs/game-bible.md`, DEC-09 (new IP: a gig-app sniper in a satirical coastal world) and DEC-10 (20 locations at launch; level 1 is the Spring Break boardwalk, not the Gumdrop Jubilee). The controls, technology, architecture, performance budget and Hitman lines below still hold, except that character materials follow DEC-08.

## What it is

A cute, funny sniper puzzle game. You sit on one perch above a living clay diorama, the **Gumdrop Jubilee**, and watch a candy-town festival through a scope. Every jelly has a schedule, people they love and a way of freaking out. Your contract names targets; how you take them out — a clean shot, a dropped cake, a beehive, a quiet pop behind a bush — is the puzzle. It plays like a perch-sniper assassination game (one map, a timeline, accidents, challenges, mastery), in its own candy-and-clay world with its own names, characters and look.

## Who it is for

Phone-first players who want a "full game" they install from a website onto their home screen, and who like replayable puzzle-sandbox levels. Desktop browsers are a first-class second platform (mouse and keyboard).

## What it will do

- **One dense map, many contracts.** The Jubilee is the level. Contracts, target sets, side jobs and challenge tiers layer onto it and reward learning the place.
- **Jelly Time controls.** Drag to pan the scope. Passing over anything shootable gives a soft magnetic pull. Lift over it and time slows to about 10–15%. Tap fires; a swipe aborts and keeps panning. Zoom works as a pinch; there are no visible gameplay buttons. Mouse and keyboard get an equivalent.
- **Everything shootable does something.** Jellies, balloons, cakes, bells, beehives, fireworks: each has an effect, and the reticle's pull is how the sandbox reveals itself.
- **A world that reacts.** Schedules, accidents that reroute the day, witnesses, mourners, guards, suspicion, lockdown.
- **Clay 3D look** from `concepts/clay3d.html`: soft fingerprinty clay, top-left key light, contact shadows, clay HUD chrome, the scope housing art, a blurred periphery in the tube's shadow.
- **An installable app.** It installs as a PWA, works offline, goes fullscreen in portrait on iPhone, respects safe areas and resumes cleanly.

## What it won't do

- Borrow anything that belongs to the Hitman franchise: names (Agent 47, ICA, Diana, Himmelstein, "Silent Assassin" or any of its ranking terms), the bald, barcoded, suited hero, the red tie, logos, UI layouts copied screen for screen, music, or level layouts. Generic genre mechanics (perch sniping, accidents, a handler, challenges) are fair game, but our versions get our own names and our own look.
- Gore or realism. Jellies pop into jelly; the horror is comic.
- Multiplayer, accounts, a server, or monetisation in the foundation phase. Saves stay local.
- Free-roam movement. You stay on the perch.

## Technology (proposed, see decisions)

- **Three.js (npm, WebGL2) + TypeScript + Vite**, the stack the concept already proves. Babylon.js is heavier for the same result, Godot and Unity web exports run poorly on iOS Safari and have big downloads, and PlayCanvas pushes its own editor. Three.js gives the smallest bundle and direct control over a fixed-camera scene. WebGPU can come later behind the same renderer.
- **Performance budget:** 60 fps on an iPhone 12-class phone in standalone Safari, and on integrated-GPU laptops. Device pixel ratio capped (≤2), one shadow-casting light or baked contact shadows only, `MeshStandardMaterial` or a matcap clay shader instead of `MeshPhysicalMaterial` with clearcoat, instancing for the crowd, grass and props, and adaptive quality that steps resolution down when frame time slips.
- **Architecture: a headless sim with presentation layers on top.**
  - `sim/`: a deterministic fixed-step simulation (schedules, NPC state, props and accidents, shots, witnesses, suspicion, scoring), with no DOM, Three or audio. It emits events and is tested in Vitest. It's the 2D game's `rules`, `npc`, `props` and `data`, untangled from drawing. The world stays a 2.5D ground plane (x, z) with heights.
  - `input/`: the Jelly Time gesture state machine as pure functions over pointer events, testable without a browser.
  - `render/`: the Three.js diorama, clay materials, jelly rig and animation, the scope camera, the periphery and particles. It reads sim state and events, never writes them.
  - `hud/`: the DOM clay chrome (ribbon, cards, bubbles, timer).
  - `shell/`: PWA manifest, service worker (offline cache), safe-area and `dvh` layout, standalone resume fixes, a screen-check diagnostics overlay, and wake lock. The iPhone quality-of-life fixes come from `dawndishsoap`.
- The 2D game in `src/` stays live on Pages until the 3D contract passes it, then retires. Its data and rules are mined for the sim port.

## What proving the core taught us

- The clay diorama reads well at phone size through a scope: soft clay, a few saturated jelly colours, and contact shadows carry the whole look.
- The scope's housing works best as cut-out art over the WebGL glass. A 3D clay ring was tried and dropped (`USE_3D_RING = false`).
- The concept is a single file that loads Three from a CDN and uses `MeshPhysicalMaterial` with clearcoat and shadows everywhere. It hasn't been measured on a phone, so performance is the open risk.
- The 2D game proved the design loop (timeline, accidents, reactions, challenges). Its weakness is structural: the simulation can't run without the canvas and HUD, which blocks both a 3D renderer and tests.

## Open questions to playtest

- Magnet strength, slow-motion length, and whether repeated slow motion makes it too easy (a cooldown, a meter, or slow-mo that witnesses can notice?).
- Exactly what slow motion does to the sim: everything slows uniformly, or only presentation slows while suspicion keeps building.
