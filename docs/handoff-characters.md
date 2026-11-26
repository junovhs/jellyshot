# Handoff: jelly characters (2026-11-26)

Read this first if you are picking up character work. The decisions are binding: DEC-05 (the look), DEC-06 (how characters render), DEC-07 (2D accessories).

## Where things are

| What | Where |
| --- | --- |
| Character randomizer (the reference implementation) | `concepts/randomizer.html` |
| Review shelf: every reworked preset, and 2D cards beside their 3D versions | `concepts/randomizer.html?mode=test` (the **Review** button) |
| 2D art cards (transparent PNGs) | `concepts/assets/2d/` (bow, moustache, lollipop) |
| Original look (the crowd we went back to) | `concepts/clay3d.html`, `docs/reference/characters/clay3d-crowd-reference.webp` |
| Arms today vs the target | `docs/reference/characters/arms-current-nubs.webp` → `docs/reference/characters/arms-merged-concept.webp` |
| Style rules | `docs/world-and-style.md` |
| SDF sculpting and simplification tools (from the shelved Judge experiment) | `concepts/sculpt.js`, `concepts/simplify.js`, `scripts/cdn-three.mjs`, `scripts/register-cdn-three.mjs` |
| Shelved experiments, not the pipeline | `concepts/gumbo*.{html,js}`, `concepts/cast.html`, `concepts/perf.html`, `concepts/jelly-material.js`, `scripts/bake-gumbo.mjs`, `scripts/inspect-judge.mjs` |

The randomizer is plain HTML with Three.js 0.170 from a CDN. Serve the repo with Vite (`npx vite`) and open `/concepts/randomizer.html`. Tap a jelly for its traits, **Close-up** to zoom, and Front / ¾ / Side / Back to turn everyone. In the console, `__focus(i)` closes up on jelly `i`.

## What the person said about each preset (round 1)

- **Liked / keep:** the clay3d body, painted flat pupils (never 3D pupils), sleepy lids, the paint layer, the ortho shelf view, 2D bow (on top of the head), 2D moustache decal, 2D lollipop, the 3D cigar.
- **Cut:** beards and goatee, quiff, mohawk, afro, judge wig, the 2D cigarette, the sideways 2D bow (it clips into the head).
- **Hair:** none unless the person approves a specific one. The braided bun still needs work.
- **Reworked in round 1, not yet re-reviewed:** crown, cap (now on a head-following shell, so no clipping), chef hat, bowler, beanie, propeller, round and rect glasses, the chain monocle, the 3D moustache and handlebar. Under DEC-07, eyewear and facial hair move to 2D art anyway.

## Next job 1: merge the arms into the body (DEC-06)

Goal: the arms grow out of the body like `arms-merged-concept.webp`. That means a wide base, a taper to a rounded tip and no seam. Today they are separate spheres (`arms-current-nubs.webp`).

1. **Sculpt once, offline.**
   - Build the body and both arms as one signed-distance field: the clay3d gumdrop body (the lathe profile `PROFILE` in the randomizer) smooth-unioned with two tapered arm capsules at the shoulder pivots (`±.9, .68, .1`). Use `smin` from `concepts/sculpt.js`.
   - Mesh it with `sculpt()`. Simplify with `concepts/simplify.js` to a modest budget (a few thousand triangles).
   - Save it to a file, as the shelved `scripts/bake-gumbo.mjs` did, via the Node resolve hook in `scripts/register-cdn-three.mjs`. Never sculpt at load: it takes about 2.5 s per body on an iPhone.
2. **UVs for the paint layer.** Recompute UVs cylindrically: u from `atan2(x, z)` with the seam at the back and front centre at u = .5, as now; v from height (the existing `vAt`). Paint stretches a little on the arms, which is acceptable.
3. **Shoulder bend in the vertex shader.**
   - Give each vertex an arm weight: 1 in the arm, falling smoothly to 0 across the shoulder.
   - In the vertex shader, rotate weighted vertices about the shoulder pivot by that jelly's two arm angles. That's the current `setArm(fwd, out, stretch)`, including the stretch.
   - Patch the shadow depth material the same way.
   - Tune the falloff and limit the angles so extreme poses (dancing, arms up) don't pinch.
4. **Props follow the hand.** The hand point is the arm tip transformed by the same rotation, computed on the CPU for the prop matrix.
5. **Instancing (DEC-06).** One `InstancedMesh` per base mesh. Per-instance attributes: position, facing, size, squash, colour, bob, both arm angles, gaze, pupil size, blink and paint flags.
   - Paint: a shared mask texture with one paint per channel, tinted per instance.
   - Pupils: drawn in the shader.
   - Accessories: one instanced card or mesh per preset.
   - About three base meshes (guards, targets, other real characters); the crowd reuses them.
6. **Check.** The Review shelf with merged arms; then the iPhone perf bench with about 250 jellies at 60 fps. `concepts/perf.html` is the old bench to adapt.

Metaballs are only for pops and splats, big squashes and maybe the scope close-up (DEC-06), not for everyday arms.

## Next job 2: 2D assets (DEC-07)

**How to add one:**
1. Drop a transparent PNG into `concepts/assets/2d/`. Crop it tight, keep the longest side at 512 px or less, and pad by 4 px.
2. Add its height/width ratio to `ART` in the randomizer.
3. Use `cardGeo` and `cardMat` for things that stand or are held, or `faceDecal` for things that lie on the face.
4. Add a row to `TEST` so it shows on the Review shelf.

Cards face the front. Never place one where the body hides its edge.

**Art spec for generation:**
- One object per image, front view, centred.
- Transparent background (or flat white, which we key out). No ground shadow, no text.
- Same style as the bow, moustache and lollipop: a thick dark outline and glossy cartoon highlights.
- About 1024 px.
- Paired items (brows, earrings): generate one side only; the code mirrors it. Generate an asymmetric pose as its own asset.

**Asset list to generate:**

| Group | Assets |
| --- | --- |
| Moustaches (brown; also black, ginger, white, or one neutral version we tint) | ~~handlebar~~ (done), bushy walrus, pencil-thin, chevron, horseshoe, villain twirl |
| Eyebrows (single brow, mirrored) | thick angry, worried, raised arch, bushy old-man, unibrow (as one piece) |
| Eyelashes | a lash set for the top of the eye (for lady characters) |
| Eyewear | round wire glasses, thick nerd glasses, cat-eye glasses, sunglasses (aviator, heart, star), monocle with a fine chain |
| Earrings (single) | gold hoop, pearl stud, dangly gem, big novelty earring (strawberry or cherry) |
| Neck | pearl necklace, gold chain with pendant, bow tie, necktie, bandana, guard's star badge |
| Hair accessories | ~~pink bow~~ (done), red polka-dot bow, blue bow, daisy clip, hibiscus, hair clip, headband with bow, tiara |
| Hand props | ~~lollipop~~ (done), ice cream cone, drink cup with straw, phone, fork with food, coffee mug, cotton candy, hot dog, popcorn, newspaper, gavel |

The 3D cigar, balloon and hats stay 3D.

## Then

FEAT-01 ports the clay3d scene into the app, and the randomizer's jelly builder becomes the character module. Build it with merged arms, instancing and 2D cards from the start.
