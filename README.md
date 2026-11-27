# JELLYSHOT

A cute sniper game about horrible things. Peer down a scope at the **Gumdrop Jubilee**, a candy-town festival where every jelly has a job, a schedule, people they love, and a way of freaking out. Three of them are your targets: the Sugarplum Syndicate.

**Play:** https://junovhs.github.io/jellyshot/ — the classic 2D game, now on the Palmetto Point beach map (sand, surf, boardwalk, lagoons, palms). Mobile first: on iPhone, Share → *Add to Home Screen* for fullscreen. The 2.5D experiment is at `concepts/beach.html`, the 3D diorama at `concepts/diorama.html`.

The contract, events and cast below are still the Gumdrop Jubilee's; only the map is the beach so far.

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

**Second to second.** A full-frame scope: the glass shows the magnified view while the rest of the screen is the same festival out of focus, in the tube's shadow, with afternoon sun leaking past the rim. Lower the rifle to survey the whole grounds at a glance, then tap where you want the scope to come up. Fire is never dropped: a press during the cooldown, a reload or a scope raise goes off the instant the rifle is ready. Scope sway, breath control with a heartbeat, a short bullet flight so moving targets need a lead, headshots, hit markers, combos ("DOUBLE POP!"), juicy pops with hit-stop and slow-mo on targets. Puddles left in the open get noticed. Pop jellies in water, bushes or the chocolate fountain to hide them.

**Minute to minute.** A five-minute festival timeline. Each phase walks the targets past a different accident:

| Time left | Event | Opportunities |
| --- | --- | --- |
| 5:00 | Arrivals | Fountain pump (Mayor + Baroness), the Baroness's balloon landing |
| 4:10 | The Big Cake Ceremony | One-ton cake on a single rope over all three targets |
| 3:20 | The Great Pie Judging | Rickety oven (Judge), duck dock (Mayor), beehive (Baroness) |
| 2:20 | Maypole Merriment | Topple the maypole (timing the dance), gumball avalanche (Mayor + Judge) |
| 1:20 | The Syndicate Meeting | Fireworks crates (all three). Blow them early and the meeting moves under the beehive |
| 0:30 | Farewells | Balloon in mid-air, the welcome sign over the exit gate |

Things react to you. Witnesses panic, sweethearts and kids mourn (and stand over the puddle), guards investigate and cordon off puddles, stray shots lure people to investigate the noise, fizz rounds shove jellies into ponds. If suspicion maxes out, a **lockdown** starts and the targets run for the exits. Some opportunities reroute the schedule: drop the cake early and the speech moves to the fountain; pop the balloon on the ground and the Baroness has to leave on foot.

Town life: kids buy ice cream (and cry when you shoot it, then their parent yells at the vendor), a busker, dancers, a fisherman, a gardener, a photographer stalking the Mayor, a pie contest with results, a marriage proposal, a hermit, gummy birds, rubber ducks, gnomes, and someone who might be watching you back.

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
