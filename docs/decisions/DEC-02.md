+++
area = "architecture"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-01", "base:50d680b623ea4ef888dfcc87e89379d36dcc65b5"]
id = "DEC-02"
revised_at = "2026-11-26T17:56:17.510818585Z"
scope = ["sim/", "render/", "hud/", "input/", "shell/", "src/"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Headless deterministic sim with render, HUD, input and shell layered on top"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-02: Headless deterministic sim with render, HUD, input and shell layered on top

## Context

In the 2D game, npc.ts and props.ts draw themselves and rules.ts calls into the HUD, so the simulation can't run without a canvas. That blocks a 3D renderer and makes testing hard. The person left the 2D game's future open ('it's all up in the air').

## Decision

Build the 3D game as layers. sim/ is a deterministic fixed-step simulation on a 2.5D ground plane (x, z plus heights) with no DOM, Three.js or audio; it emits events. input/ is pure gesture state machines. render/ is the Three.js diorama, which reads sim state and events and never writes them. hud/ is the DOM clay chrome. shell/ is the PWA. Port the 2D game's data and rules into sim/ rather than rewriting the design. The 2D build stays live on Pages until the 3D contract passes it, then retires.

## Why

A headless sim can be tested in Vitest, runs at any time scale (which Jelly Time needs), can be replayed, and lets art and rendering change without touching gameplay. Porting keeps the design the 2D game already proved.

## Alternatives rejected

Rewrite from scratch around the concept, which throws away a proven design loop. Bolt Three.js onto the existing modules, which keeps the coupling that blocks testing and time scaling. Keep 2D and 3D as parallel products, which doubles the work.

## Consequences

sim/ must never import from render/, hud/ or audio. Sound and visuals react to sim events. A lint or test check enforces the import boundary.
