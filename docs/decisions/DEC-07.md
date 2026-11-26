+++
area = "design"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-04", "base:1a7d349351617d9b0948fc1895a2987c404bd1d0"]
id = "DEC-07"
revised_at = "2026-11-26T22:29:05.52553694Z"
scope = ["concepts/randomizer.html", "concepts/assets/2d/", "render/characters"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Facial hair, eyewear, jewelry, hair accessories and small props are cut-out 2D art on the 3D jellies"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-07: Facial hair, eyewear, jewelry, hair accessories and small props are cut-out 2D art on the 3D jellies

## Context

Round 1 of accessory review: the person disliked most 3D facial hair (sphere beards, lip-like moustaches), the thick glasses, the monocle string and most hair. We tried generated 2D art (bow, moustache, lollipop, cigarette) on the 3D clay jellies in a side-by-side Review shelf. The person said 2D is working great, but preferred the existing 3D cigar to the 2D cigarette.

## Decision

Facial hair (moustaches, brows), eyewear, jewelry, hair bows and clips, and small hand props are generated 2D art: transparent PNGs in concepts/assets/2d, drawn on cards facing the viewer, or bent onto the face as decals (facial hair). Hats and headwear stay 3D clay and sit on a shell that follows the head (no clipping). The 3D cigar stays 3D. Each asset is finessed one at a time as needed. Hair is cut, except presets the person approves. Beards are cut.

## Why

The 2D art carries an illustrated finish (outlines, glossy highlights) that reads instantly at scope distance and looked better than the clay geometry for small, detailed items. Generating an asset is faster than modelling one, and a card is the cheapest thing to instance (DEC-06).

## Alternatives rejected

3D-modelled accessories for everything (looked worse for facial hair, glasses and small props, and took much longer to polish). 2D for everything including hats (hats need volume to sit on the head from every angle). The 2D cigarette (the person preferred the 3D cigar).

## Consequences

A card disappears edge-on, so cards face the front and sit where the body does not cover them; side placements clip into the head (the sideways bow was cut for this). Each 2D asset needs an aspect entry and a placement. An asset list to generate lives in docs/handoff-characters.md.
