+++
area = "design"
becomes = "history"
date = "2026-11-27"
evidence = ["DOCS-05", "base:ba83a27bc3894796448b87ead7ed5c76012d7347"]
id = "DEC-08"
revised_at = "2026-11-27T00:18:12.182324112Z"
scope = ["concepts/randomizer.html", "scripts/bake-jelly-body.mjs", "concepts/assets/jelly-body.bin", "render/characters", "docs/handoff-characters.md"]
status = "accepted"
superseded_by = []
supersedes = []
title = "The merged-arm jelly characters are locked, jelly skin included; build the levels and let them decide the cast"

[author]
agent = "agent-2291431"
person = "junovhs"
+++

# DEC-08: The merged-arm jelly characters are locked, jelly skin included; build the levels and let them decide the cast

## Context

After FEAT-12 the person reviewed the randomizer's merged-arm jellies in their own browser: smooth shading, clean raised arms, a glossy jelly skin with a deep saturated inside, no feet, double jiggle. They called it perfect and said: 'I'm SOLID on these characters we came up with.' Two earlier decisions still say otherwise. DEC-01 asks for a matcap or MeshStandard clay material instead of MeshPhysical with clearcoat, and DEC-05 lists real transmission jelly as rejected because it looked worse and cost a third of the frame rate on an iPhone.

## Decision

The character is locked: the one shared merged-arm body (DEC-06) with the FEAT-12 jelly skin (MeshPhysical, clearcoat, partial transmission, inside the body colour but deeper and more saturated, never black), painted pupils, the paint layer, no feet, JIGGLE = 2, individualised only by size, colour, accessories (3D hats, the cigar, and 2D art per DEC-07) and behaviours. This overrides DEC-01's 'matcap or MeshStandard clay material' clause and DEC-05's rejection of transmission jelly, for characters only. The rest of DEC-01 (Three.js, WebGL2, 60 fps on an iPhone 12-class phone, DPR cap, instancing) and DEC-05 (one shared body, variety through accessories and behaviours) stands. Character design work stops here. From now on the levels come first: the event, the space and its timeline decide who is there, what they do and what they wear, and the accessory and behaviour kit grows only from that cast.

## Why

The person judged this look in their own browser and committed to it. The earlier transmission test was a different material (the shelved jelly-material.js) that looked worse; this one was approved side by side with the clay version. Locking the character frees the effort for the levels, which is where the north star is decided.

## Alternatives rejected

Keep DEC-01's clay material and fake the jelly look: rejected for now, because the person approved this look and the cost hasn't been measured yet. It stays the fallback if PERF-01 fails. Keep designing characters ahead of the levels: rejected by the person, who wants the space to decide the cast.

## Consequences

PERF-01 must measure the jelly skin and the shoulder-snap shader with about 250 jellies on the reference iPhone. If they don't fit, the fix is a cheaper material that keeps the approved look (person-reviewed side by side), not a different character. New accessories, outfits and behaviours come from a level's cast list, not from the randomizer.
