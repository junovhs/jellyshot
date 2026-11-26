# World, characters and style — direction draft

Status: **character look locked by DEC-05.** The reference is the jellies in `concepts/clay3d.html`. World and tone sections below remain a draft for the person's approval (they own art direction and tone). The sculpted-character experiments (`concepts/gumbo*`, `cast.html`, `perf.html`, `sculpt.js`, the bake scripts) are shelved and not part of the pipeline.

## The one-liner

**Gremlins made of candy clay.** The jellies of Gumdrop Hollow are adorable, and every single one of them is up to something. You're not ruining a perfect day; you're the biggest troublemaker at a festival full of small ones.

## What we take from each reference (qualities, never designs)

| Reference | The quality we want | How it shows up in Jellyshot | What we don't take |
| --- | --- | --- | --- |
| Raving Rabbids | Chaotic, screaming slapstick. Dumb, gleeful mischief. Characters who are funny while just standing there. | Jellies with wide, slightly wrong eyes and big open mouths. They scream, flail, lick things, push each other into ponds, and mug for the scope. | White rabbits, long ears, the buck-toothed screaming face, plungers, "BWAAAH". |
| Thronglets | Cute that turns uncanny in a crowd. A herd with one mind. Sweetness with a hum of menace. | The crowd moves as a herd: everyone copies a dance, all heads turn at once, and when suspicion spikes the whole crowd slowly turns and **looks up at your scope**. | The specific creature design, the "plaything" premise, the screen framing. |
| Happy Tree Friends | Sugary cute meets horrible fate, and the contrast is the joke. Elaborate accidents. | Opportunity accidents are Rube Goldberg slapstick. The deaths are cartoon-horrible but made of jelly: squash, splat, flatten, deflate, fondue, launch. | Blood, gore, woodland animals, and anything realistic. The north star says jellies pop. |
| Our clay concept | Tactile, handmade, warm. Studio lighting, soft contact shadows. | The world and props stay plasticine. The characters are glossy jelly living in it. | Realism. |

## Character design language

Reference: the jellies in `concepts/clay3d.html`. Locked by DEC-05.

1. **One body for everyone.** Every jelly, target or crowd, is the clay3d body: a soft clay dome with two little ears and glossy googly bead eyes, in the candy palette (`JELLY_COLS`). No bespoke body sculpts.
2. **Size and colour vary.** A kid can be half a judge. Named characters get a signature colour.
3. **Accessories make the individual.** The kit:
   - **Headwear:** top hat, crown, cap, chef's hat, beanie, flower, bow, judge's wig, hair tufts and quiffs.
   - **Face:** sunglasses, round glasses, monocle, moustache, beard, eyebrows, earrings.
   - **Held props:** fork, gavel, drink, ice cream, cigar or pipe, phone, balloon.

   A named target wears 2 or 3 accessories that read at full zoom-out. Crowd jellies wear 0 or 1, drawn from the same kit, so a target never stands out just by being dressed.
4. **Behaviours carry the personality.** What a jelly does is as identifying as what it wears: smoking, eating, dancing, running to the bathroom, chatting, sneaking, napping, arguing, licking the chocolate fountain. Behaviours are schedule steps, so they double as opportunities and as briefing clues ("the one in sunglasses who keeps going to the bathroom").
5. **Readable through the scope.** Colour plus accessories plus behaviour has to identify a named target at full zoom-out.
6. **Clean faces.** No specks or crumbs near the eyes; they read as spots.

### Quality bar

Accessories are simple clay pieces (spheres, cylinders, tori, rounded boxes) parented to the jelly, so they squash and hop with it. They stay low-poly and share materials so a festival of characters holds 60 fps on an iPhone.

## The world: Gumdrop Hollow

- Every jelly has a **schedule and a scheme**. Most schemes are petty: swapping pie entries, licking the chocolate fountain when nobody's looking, pickpocketing gumdrops, rigging the duck race. Watching through the scope is half the fun, because you catch the whole town misbehaving. Schemes double as opportunities and as challenges ("Pop a jelly in the act of stealing a pie").
- **The Sugarplum Syndicate** (the targets) are the town's biggest crooks running the biggest scheme, so the player never feels like a bully. They're smug, rich, and clearly deserve a cake on the head.
- **The crowd is a herd.** Jellies imitate each other: one dances and soon fifty dance; one screams and they all scream. The herd gives us the Thronglets beat: when suspicion rises, heads start turning toward the hill, and at lockdown the whole festival stares straight down your scope.
- **Witnesses are snitches, not victims.** A jelly who sees a pop doesn't cry. It points, shrieks and runs to tell a guard. Some grab the dead jelly's hat first.

## Death style: "cute, then horrible, then cute again"

- A pop is an **elastic squash, a burst into clay blobs, and a splat into a puddle**. **The two eyes always survive.** They roll out of the puddle, settle on top of it and keep blinking. Puddles with blinking eyes are the signature gag, and the eyes are what witnesses spot.
- Accidents get their own deaths: crushed flat under the cake (a pancake that peels off the ground), fondue'd (dipped in chocolate and frozen in place), launched by the maypole (lands somewhere ridiculous), bee'd (swells up), drowned (bobs to the surface as a rubber-duck-shaped blob).
- Onlookers react in character. Rivals cheer, sweethearts wail, kids poke the puddle with a stick, gremlins steal the hat.

## Look and feel rules

- **Palette:** saturated candy jellies (the concept's `JELLY_COLS`) on a soft pastel world. Mischief accents in the props: hot pink, toxic lime, grape.
- **Light:** warm top-left key and a cool sky fill, as in the concept. Lockdown shifts toward a sickly sunset, with a long shadow from the hill.
- **Animation:** everything squashes and stretches, with snappy anticipation, overshoot and wobble. Idle loops express personality (the Mayor puffs his cigar, the Baroness sniffs).
- **Sound:** gibberish voices with recognisable emotion words (a squeaky "heehee", a "NOOO", a gasp), squelchy pops and a cheerful festival band that detunes as suspicion rises. *Open: do speech bubbles stay as English one-liners, become pictograms, or mix both?*

## Open questions for the person

1. **Speech:** keep the witty English bubbles (they carry a lot of the 2D game's humour), switch to gibberish with pictograms, or mix both?
2. **How mean?** Is everyone fair game, or should kids and innocents still cost you (as the 2D game's "you shot a child's ice cream" does)?
3. **The player's character:** do we ever see the sniper (also a jelly, with a ridiculous ghillie suit of sprinkles), or do they stay a voice and a scope?
