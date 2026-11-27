# JELLYSHOT

A cute sniper game about horrible things. Peer down a scope at **Spring Break at Palmetto Point**, a beach party where every jelly has a job, a schedule, people they love, and a way of freaking out. Three of them are your targets: Brayden "Moonboy" Kessler, Skylar Lux and "Big" Rick Gillis, the people behind the $JIGGLE coin that took your client Doris Pembrook's savings.

**Play:** https://junovhs.github.io/jellyshot/ — the classic 2D game, now on the Palmetto Point beach map (sand, surf, boardwalk, lagoons, palms). Mobile first: on iPhone, Share → *Add to Home Screen* for fullscreen. The 2.5D experiment is at `concepts/beach.html`, the 3D diorama at `concepts/diorama.html`.

The contract is level 1, Spring Break at Palmetto Point, played on the classic 2D map.

## Controls

| Phone | Keyboard / mouse |
| --- | --- |
| Drag to aim, pinch to zoom | WASD / arrows, scroll wheel |
| **FIRE** button | Space or click |
| Hold **BREATH** to steady the scope | Shift |
| 👁 lower the rifle to **survey** (or pinch all the way out) | E, right-click, or wheel out past min zoom |
| Tap anywhere in survey to raise the scope there | Click in survey |
| Ammo button (fizz / sugar bomb once unlocked) | Q or 1 / 2 / 3 |
| ⟳ reload (the rifle comes down while you work the bolt), ▸▸ fast-forward | R, F |
| Tap / drag the minimap to jump the scope | |
| ☰ intel (pauses) | Tab / Esc |

## The loops

**Second to second.** A full-frame scope: the glass shows the magnified view while the rest of the screen is the same festival out of focus, in the tube's shadow, with afternoon sun leaking past the rim. Lower the rifle to survey the whole grounds at a glance, then tap where you want the scope to come up. Fire is never dropped: a press during the cooldown, a reload or a scope raise goes off the instant the rifle is ready. Scope sway, breath control with a heartbeat, a short bullet flight so moving targets need a lead, headshots, hit markers, combos ("DOUBLE POP!"), juicy pops with hit-stop and slow-mo on targets. Puddles left in the open get noticed. Pop jellies in the lagoons, the dune grass or the foam pit to hide them.

**Minute to minute.** A five-minute timeline. Each phase walks the targets past a different accident:

| Time left | Event | Opportunities |
| --- | --- | --- |
| 5:00 | Arrivals | Foam cannon valve (Brayden + Skylar), Skylar's parasail landing |
| 4:10 | The $JIGGLE Launch | One-ton inflatable coin on a single rope over all three targets |
| 3:20 | The BBQ Cook-off | Rusty grill (Rick), jet-ski dock (Brayden), seagull nest (Skylar) |
| 2:20 | The Volleyball Final | Whip the net pole (timing the conga), coconut avalanche (Brayden + Rick) |
| 1:20 | The Deal | Fireworks crates (all three). Blow them early and the deal moves under the seagull nest |
| 0:30 | Last Call | Parasail in mid-air, the welcome sign over the exit gate |

Things react to you. Witnesses panic, sweethearts and kids mourn (and stand over the puddle), guards investigate and cordon off puddles, stray shots lure people to investigate the noise, fizz rounds shove jellies into the lagoons. If suspicion maxes out, a **lockdown** starts and the targets run for the exits. Some opportunities reroute the schedule: drop the coin early and the pitch moves to the foam pit; pop the parasail on the ground and Skylar has to leave on foot.

Beach life: kids buy ice cream (and cry when you shoot it, then their parent yells at the vendor), Kazoo Kevin's ukulele, volleyball players, a fisherman, a metal detectorist, a hype man filming Brayden, a BBQ cook-off with rigged results, a marriage proposal, a beach hermit, seagulls, rubber ducks, plastic flamingos, and a living statue who might be watching you back.

**Hour to hour.** 35 challenges (assassinations, mastery, diabolical, feats, collectibles) feed a challenge multiplier up to 3×. Three random side jobs every contract. Rifle XP levels unlock zoom, magazine size, fizz rounds, steady breath, sugar bombs, speed loader and a golden scope. PRO mode unlocks at level 4.

## Development

TypeScript (strict) + Vite, checked the same way as noceremony, with zod guarding the save file.

```
npm install
npm run dev      # http://localhost:5177
npm run check    # tsc --noEmit
npm test         # vitest: data integrity (zod schemas), save parsing, firing regressions
npm run build    # tsc && vite build -> dist/
```

GitHub Actions runs check + test + build on every push and PR, and deploys `dist/` to Pages from `main` (Pages source must be set to **GitHub Actions**).

| File | What lives there |
| --- | --- |
| `src/data.ts` | cast, schedule, dialogue, challenges, progression |
| `src/world.ts`, `src/props.ts` | map, decor, and every opportunity prop |
| `src/npc.ts` | schedules, reactions, drawing jellies |
| `src/rules.ts` | the simulation step, shooting, kills, witnesses, suspicion, scoring |
| `src/render.ts` | world passes, the scope, the blurred periphery, survey view, minimap |
| `src/ui.ts`, `src/input.ts`, `src/audio.ts`, `src/main.ts` | HUD and sheets, controls, synth audio, boot loop |
| `src/save.ts` | progression save, parsed through zod |
