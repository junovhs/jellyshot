+++
area = "design"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-02", "base:306defddf261c734490665a47c495e751ecf6f1f"]
id = "DEC-05"
revised_at = "2026-11-26T21:11:19.928037728Z"
scope = ["concepts/clay3d.html", "docs/world-and-style.md", "render/characters"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Characters are the simple clay3d jellies, individualised by accessories and behaviours"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-05: Characters are the simple clay3d jellies, individualised by accessories and behaviours

## Context

After the founding decisions we ran a long run of character art experiments: SDF-sculpted jelly characters, fake versus real jelly materials, a chibi body plan with legs, an offline bake pipeline, and finally a Judge modelled to match a design sheet and turnaround. Each one ate time and none was clearly better than the clay3d proof of concept. The person said they would rather focus on the actual game and build it out with the clay3d graphics, which they called already great.

## Decision

Every jelly, targets and crowd alike, uses the clay3d body: the soft clay dome with two little ears and googly bead eyes, in the candy palette (JELLY_COLS) on the pastel clay world. Named characters are told apart by accessories and by what they do, not by bespoke body sculpts. The accessory kit is hats, hair, sunglasses and glasses, facial hair, earrings and held props (fork, gavel, drink, cigar). Behaviours carry the personality and feed schedules: smoking, eating, dancing, running to the bathroom, chatting, sneaking and so on. Size and colour can vary per character; the body shape stays the shared clay3d jelly.

## Why

The clay3d look already reads well, is cheap on phones, and lets the effort go into gameplay (schedules, Jelly Time, witnesses, accidents) where the north star is decided. Accessories and behaviours are cheap to author, read at scope distance, and double as targeting clues in contract briefings ('the one in sunglasses who keeps going to the bathroom').

## Alternatives rejected

Bespoke SDF-sculpted characters per target (the Judge experiment): too slow to author for 40 to 60 characters and never converged on the look. Real transmission jelly: looked worse and cost a third of the frame rate on an iPhone. Chibi body plan with legs and large hair: abandoned along with the sculpts.

## Consequences

concepts/gumbo*.html, gumbo-model.js, sculpt.js, simplify.js, jelly-material.js, perf.html, cast.html and the bake scripts are shelved experiments, not the pipeline; nothing in the game depends on them. Character work becomes an accessory kit and a behaviour/animation set on the clay3d jelly. Contract data names a character by colour, size, accessories and schedule.

## Amendment (2026-11-26, FEAT-09)

From the randomizer proof of concept, the person set three more rules: the clay3d ears become **arm nubs** at the body's sides that gesture and hold props; **pupils are painted flat on the eyeball**, never separate 3D spheres; and every jelly has a **paint layer** (a canvas texture on the body) so characters can get markings, tattoos and painted details. See `docs/world-and-style.md` and `concepts/randomizer.html`.

