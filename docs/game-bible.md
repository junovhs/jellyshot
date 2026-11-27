# Jellyshot game bible

Status: **locked by the person on 2026-11-26** ("lock that shit in, that's gold"). The decisions behind it are DEC-08 (characters), DEC-09 (premise and tone) and DEC-10 (game structure). Names marked *(working)* are placeholders until the person picks; everything else is settled.

This replaces the candy-town world: Gumdrop Hollow, the Gumdrop Jubilee and the Sugarplum Syndicate are retired. The 2D game in `src/` keeps them until it retires, and its rules and systems are still mined for the sim port. Its names and setting are not.

## The pitch

A cute, absurd perch-sniper puzzle game about jellies. You're a broke jelly taking hits through a gig app to make rent. Every job is a big, packed location full of jellies living their lives, and somewhere in the crowd are the bad jellies the app wants removed. Watch, learn the place, catch them being awful, then pop them: a clean shot, or an accident nobody will ever explain.

## The world

A sun-fried, satirical coastal region of jellies *(working name for the first town: Palmetto Point)*. Neon motels, piers, resort pools, strip malls, gated communities, swamps and marinas. It's the vibe of a modern Florida satire (the GTA 6 kind of energy) scaled down to a cartoon of tiny, glossy jellies.

Jellies are sweet, dim and herd-minded. If one dances, fifty dance. If one screams, they all scream. Every one of them is a little bit unhinged.

## The protagonist

A broke jelly with rent due, a bucket hat, terrible sunscreen coverage and an enormous rifle. He takes jobs on a gig app because it pays better than delivering burritos. He takes himself very seriously; nobody else does. *(Working name: Dale.)*

- **The app is the handler** *(working name: Removr)*. Jobs arrive as gig cards with star ratings, surge pricing, tips and customer notes ("make it look like an accident pls 🙏"). A chirpy, slightly broken in-app assistant gives the briefing and the commentary. Your mission score is your rating.
- **Optional spotter** *(working)*: his girlfriend runs the app and spots through binoculars while he shoots, and they bicker over the radio like a couple on a road trip. Open question for the person.
- **The clients** are wronged regular jellies writing requests: a retiree scammed out of her condo, a lifeguard who got fired for doing his job, a kid whose sandcastle was kicked over for content.
- **The arc:** 20 jobs in, you work out that the app itself is the biggest scam in town. The last level is the app's headquarters, and its founder is the final target.

## The bad jellies

Targets are modern jerks everyone recognises: crypto bros, scam influencers, HOA presidents, timeshare closers, resort owners who rig everything. **The joke is cute, sweet-looking jellies being evil.** They monologue, laugh "mwehehe", steal from kids, kick sandcastles, and are proudly, pettily awful.

- **Caught red-handed.** Every target has visible bad deeds on their schedule. Watching through the scope, you catch them doing something awful, and popping them in the act earns a bonus. It's proof, it's catharsis and it's funny.
- **Never "shoot the babies".** Ordinary jellies (tourists, kids, retirees, workers) are sweet, and hitting them costs you: rating, tips, a pointed note from the app. Villains are told apart by accessories and behaviour, not by being uglier. The same body for everyone is the point.

## The four entities in every level

| Entity | What it is | What it needs |
| --- | --- | --- |
| **Crowd** | Background bodies that make a place feel packed. | Cheap and instanced (DEC-06). Herd behaviour: they copy what's near them (dancing, panicking, staring). No names, no schedules. When suspicion rises, heads start turning toward your perch; at lockdown the whole crowd stares down your scope. |
| **Real characters** (40 to 70 per level) | The ensemble you get to know through the scope. | A name, an outfit, a daily loop, a personality, relationships (crushes, feuds, a mum), a petty scheme, objects they use in the world, chatter, and in-character reactions to pops. Built from archetypes (see Production). |
| **Guards** | Whoever polices *this* place. | Each location has its own guard type, with its own way of noticing things and its own weakness: lifeguards watch the water, mall cops ride scooters, HOA enforcers notice a moved flamingo. |
| **Targets** | The bad jellies. | A real character plus a dossier, visible bad deeds, a route, an escape plan if spooked, and an exit. |

**Witnesses are snitches, not victims.** A jelly who sees a pop doesn't cry. It points, shrieks and runs to tell a guard. Some grab the dead jelly's hat first.

## How a level is built

**A location is four things combined: the event × the space × the guard type × a twist.** The twist is one rule that changes how you play: wind bends your shots, everyone's in costume, the floor is moving, everything is livestreamed. It keeps 20 levels from feeling like one level reskinned.

Each level is one big diorama you watch from one perch. A run is a timeline of phases (about 8 minutes). Mastering a level takes many runs: several contracts, side jobs ("pop someone in the act of stealing fries"), challenges and secrets. Finishing a level's main contract unlocks the next location.

## The 20 locations

| # | Location / event | Guards | Twist |
| --- | --- | --- | --- |
| 1 | **Spring Break boardwalk** (`docs/levels/01-spring-break-boardwalk.md`) | Lifeguards: whistles, binoculars, they watch the water | The foam party hides pops |
| 2 | Suburban gender-reveal party | Dads at the grill (territorial) | The reveal cannon is loaded with something wrong |
| 3 | Retirement-village golf tournament | Golf-cart patrols | Everyone's half-blind but hears everything: noise matters more than sight |
| 4 | Influencer mansion house party | Bodyguards | Everything is livestreamed: every phone is a witness |
| 5 | Crypto conference | Security in VR headsets | Headset on means blind, headset off means very alert |
| 6 | Swamp airboat tour and gator farm | Park rangers | Gators eat the evidence, and sometimes the target |
| 7 | Monster truck rally | Pit crew | The engines mask your shots |
| 8 | Hurricane party | Neighbourhood watch | The wind changes: lead your shots |
| 9 | Celebrity cook-off TV taping | Producers with headsets | Live TV: anything on camera spikes suspicion |
| 10 | Mascot convention | Event staff | Everyone's in costume: find the target by behaviour |
| 11 | Water park | Lifeguards on towers | Slides chain into accidents |
| 12 | Drive-in movie night | Ushers with flashlights | Darkness: you only see clearly when the screen flashes |
| 13 | HOA meeting in a gated community | HOA enforcers with clipboards | Rule-obsessed: one moved flamingo is suspicious |
| 14 | Black Friday mall | Mall cops on scooters | Stampede crowd: herd behaviour at max |
| 15 | Cruise ship deck | Ship security | The deck rocks, and so does your perch |
| 16 | Wellness retreat (a "totally not a cult") | Robed attendants | Eyes closed during meditation, timed by a gong |
| 17 | Fashion week runway | Bouncers | Paparazzi flashes act as witnesses |
| 18 | Esports finals arena | Arena security | Everyone stares at the jumbotron and ignores everything else |
| 19 | Billionaire rocket launch | Corporate drones | The countdown is your timer; the target is boarding |
| 20 | The gig app's headquarters (finale) | Everything at once | The app's founder was the villain all along |

Order, events and twists can still be tuned per level as each is designed, but the shape (20 locations, each its own guard type and twist, the app arc ending at its HQ) is locked.

## Tone: insanity and absurdity

The humour reference is Squanch Games: commit to the bit and escalate it past reason. On top of that, Rabbids (chaotic screaming slapstick), Minions but more PG-13 (gibberish, gleeful idiots serving bad bosses), Team Buddies (cute toy-like guys, cartoon violence, crates of chaos) and Thronglets (a cute herd that turns uncanny).

- Characters overreact wildly, talk nonsense to each other, and have one weird obsession each.
- The world keeps going while something insane happens in the corner.
- Satire of modern life: influencers, crypto, HOAs, gig work, tourists, Florida Man headlines.
- **PG-13 line:** crude and absurd is fine; no sexual content, no slurs, no real people, no real brands, no real politics.

**Death style: cute, then horrible, then cute again.** A pop is an elastic squash, a burst into jelly blobs, and a splat into a puddle. **The two eyes always survive.** They roll out of the puddle, settle on top of it and keep blinking. Puddles with blinking eyes are the signature gag, and the eyes are what witnesses spot. Accidents get their own deaths (flattened, launched, swallowed by a gator, foamed, frozen in a margarita). Onlookers react in character: rivals cheer, sweethearts wail, kids poke the puddle with a stick, seagulls steal the hat.

## Look

- **Characters:** locked (DEC-08). One merged-arm jelly body with the glossy jelly skin, varied only by size, colour, accessories (3D hats and the cigar; 2D art for eyewear, jewellery, small props, per DEC-07), paint and behaviour. See `docs/handoff-characters.md`.
- **World:** the clay diorama style stays (handmade plasticine world, studio light, soft contact shadows), but the palette moves from candy pastels to a sun-bleached coast: hot sand, pool blue, neon motel signs, sunset orange and pink. The boardwalk concept (LVL-01) is where the person approves it.
- **Outfits come from the place.** Every accessory, paint and behaviour is built because someone in a level needs it. The randomizer is the test bench, not the source of ideas.

## Production model

20 levels × about 55 real characters is about 1,100 characters, plus 20 big dioramas. That only works data-driven (DEC-10):

- **An archetype library, built once** (about 30 to start): vendor, lifeguard, bouncer, DJ, bartender, influencer, crypto bro, retiree, tourist parent, kid, teen, couple on a date, sunbather, fisher, food goblin, conspiracy guy, drunk uncle and so on. An archetype is a behaviour loop, its reactions and its interactions with objects.
- **Every character is data:** an archetype, an outfit from the kit, a colour and size, a name, 2–3 quirks, relationships, a schedule in that level's space and a few lines of chatter. Contracts are already data (DEC-04); the cast is the same idea.
- **Location-specific behaviours** layer on top: lifeguards blow whistles, HOA enforcers write fines.
- **Level 1 is the vertical slice.** It's built fully, to final quality, which proves the formula and yields the archetype library. Levels 2 to 20 are then mostly authoring data, plus each location's guard type, twist and accidents.

## Legally distinct

- **From Hitman:** no names, hero look, agency, handler, logos, UI, music or level layouts. A broke jelly on a gig app is about as far from a suited agency assassin as it gets. Generic genre mechanics (perch sniping, accidents, a handler, challenges) are fair game.
- **From GTA:** we take the satirical modern-Florida vibe only. Never its names (Vice City, Leonida, its characters), logo, key-art style, radio stations or wanted-star UI. Our suspicion meter stays our own.
- **From everything else:** no real brands, people or places. Check the working names (the town, the app) for trademarks before launch.

## Open questions for the person

1. Names: the town, the app, the protagonist, and the game title (is it still Jellyshot?).
2. The spotter girlfriend: in, out, or later?
3. Speech: English one-liner bubbles, gibberish with pictograms, or both? (The 2D game's English lines carried a lot of its humour.)
4. Do we ever see the sniper on his perch (a cutaway, the menu, the ending)?
5. Water: can jellies swim? (In the 2D game they couldn't, and that was a kill.)
