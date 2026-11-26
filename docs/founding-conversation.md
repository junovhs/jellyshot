# Founding conversation

Lightly tidied record of the conversation that kicked off the 3D build (2026-11-26), so the reasons survive.

## Where we were

- `src/` holds a shipped 2D canvas game: the Gumdrop Jubilee, a five-minute festival with three Syndicate targets, scheduled accidents, witnesses/suspicion, 35 challenges, rifle XP. Deep on gameplay, but the simulation is tangled with drawing and HUD code.
- A design push produced `concepts/clay3d.html`: the Jubilee as a soft clay diorama in Three.js, seen through a scope, in a portrait phone frame with clay HUD chrome. The person's verdict: "it's so great" — this is the proof of concept.

## What the person said

**North star.** "This is basically Hitman Sniper (like Himmelstein / Austria) BUT… cute and fun and legally distinct from the Hitman franchise."

**Platform.** "I will want this game to be a website you can install as an app on your phone as a full game." The app shell, or at least the quality-of-life of a website that becomes an iPhone app, can be borrowed from the sibling repo `dawndishsoap`. "I used three.js for the prototype, but we need to consider what would be performant in that setup, but also on desktop. I would do pretty much anything."

**Relation to the 2D game.** "At this point, it's all up in the air."

**First milestone.** One playable contract: the Jubilee in clay 3D, end to end — aim/zoom/fire through the scope, jellies on schedules, three targets, an accident, a witness/suspicion loop, mission end and score.

**Structure.** One map, many contracts (Himmelstein-style): one dense, replayable diorama with new contracts, target sets and challenge tiers layered on it.

**Ownership.** The person owns vision and feel: game design, art direction, tone, feel sign-off, and what ships. Claude owns architecture, code, tests, tooling and the Ishoo record, and proposes design ideas for approval.

## Jelly Time (the control idea the person brought, and endorsed)

> Drag. Release. Tap. Blam.

| Player action | Game response |
| --- | --- |
| Drag anywhere | Freely pan the scope |
| Pass over a shootable entity | Gentle magnetic attraction |
| Lift thumb over an acquired entity | Enter slow motion |
| Tap anywhere | Fire |
| Swipe in any direction | Abort and resume aiming (no new touch needed) |
| Lift without acquiring anything | Nothing happens |

The slow-motion moment could be the signature mechanic: time drops to roughly 10–15%, the periphery darkens, the scope eases in, the reticle contracts around the entity, music muffles, a haptic pulse confirms acquisition. The tap erupts into jelly particles with an elastic pop, then time returns.

Separating aiming, acquisition and shooting removes dedicated gameplay buttons and makes every shot a deliberate cinematic moment. During slow motion the next touch must not fire at once: wait to see whether it becomes a short tap (fire) or a directional drag (cancel and keep panning seamlessly), so the whole screen is one continuous controller.

Everything shootable is interesting, not just targets — jelly (explodes into jelly), balloon (pops, distracts), cake (frosting everywhere), banjo (interrupts the performance), bell (people investigate), chandelier (falls, environmental event), beehive (swarm), fireworks (chaotic distraction). The reticle's pull is how players discover the sandbox.

Things to playtest: magnet strength, slow-motion length, and whether repeated slow-mo makes the game too easy. "The magnetism should feel like a suggestion, not like the game is taking control away from the player."
