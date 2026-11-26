+++
area = "controls"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-01", "base:50d680b623ea4ef888dfcc87e89379d36dcc65b5"]
id = "DEC-03"
revised_at = "2026-11-26T17:56:23.414007687Z"
scope = ["input/", "sim/", "render/"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Jelly Time: drag to pan, lift to acquire and slow time, tap to fire, swipe to abort"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-03: Jelly Time: drag to pan, lift to acquire and slow time, tap to fire, swipe to abort

## Context

The 2D game used visible FIRE, BREATH and reload buttons. The person proposed, and endorsed, a buttonless scheme that separates aiming, acquisition and shooting, so every shot becomes a deliberate cinematic moment.

## Decision

Drag anywhere to pan the scope. Passing over a shootable entity gives a gentle magnetic pull, a suggestion that never takes control away. Lifting over an acquired entity enters slow motion (about 10-15% speed): the periphery darkens, the scope eases in, the reticle contracts around the entity, music muffles, and a haptic pulse confirms. In slow motion the next touch is classified before it acts: a short tap fires, and a directional drag cancels slow motion and keeps panning without a new touch. Lifting over nothing does nothing. Every shootable thing has an effect, and the magnet is how the sandbox reveals itself. Pinch zooms. Mouse and keyboard get an equivalent mapping.

## Why

It makes the whole screen one continuous controller with no visible gameplay buttons, makes each shot a signature moment, and turns props into discoverable toys. In the person's words: 'Drag. Release. Tap. Blam.'

## Alternatives rejected

Visible FIRE and BREATH buttons (the 2D scheme): clutter, and the thumb has to leave the aim. Release-to-fire: accidental shots, and no way to separate acquisition from firing.

## Consequences

Gesture classification is a pure, tested state machine. The sim needs a global time scale. To playtest: magnet strength, slow-motion length, and whether repeated slow motion makes the game too easy (cooldown, meter or witness awareness).
