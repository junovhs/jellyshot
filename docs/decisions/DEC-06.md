+++
area = "render"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-03", "base:7b858c89a2b61d65dfb5939fc15dc23fce7ce28a"]
id = "DEC-06"
revised_at = "2026-11-26T22:16:14.557525677Z"
scope = ["render/characters", "concepts/randomizer.html"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Characters render as a few shared merged-arm base meshes, instanced, each jelly animated on its own"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-06: Characters render as a few shared merged-arm base meshes, instanced, each jelly animated on its own

## Context

With the clay3d jelly locked (DEC-05), the randomizer showed the arm nubs read as glued-on balls. A concept image showed arms that grow out of the body. We weighed separate nubs, a merged mesh, live metaballs and instancing against a festival of about 50 named jellies plus a crowd of about 200 at 60 fps on an iPhone.

## Decision

Body and arms are one merged mesh, sculpted once as a smooth union and saved to a file (never sculpted at load). There are a few base meshes, about three (for example guards, targets and other real characters), and the crowd reuses them. Each base mesh is drawn instanced: one draw call for every jelly using it. Each instance carries its own position, facing, size, squash, colour, bob, both arm angles, gaze, pupil size, blink and paint flags. The vertex shader bends the arms from two shoulder angles (including the shadow pass). Pupils are painted in the shader. Paints are channels in a shared mask texture, switched and tinted per instance. Bespoke painted textures are allowed for named characters. Accessories are one instanced mesh per preset, with matrices set from their jelly each frame; held props follow the same arm angle. Every jelly runs its own behaviour state (phase, speed, timers, gaze) and writes its pose each frame, so nobody moves in lockstep unless we sync them on purpose (the Thronglets crowd beats). Live metaballs are only for moments: the pop and splat, big squashes, maybe the scope close-up on a target. A jelly leaves the instanced crowd when that happens.

## Why

The festival stays at roughly 50 draw calls with per-jelly variety and independent animation, the merged arms look like the concept, and the expensive metaball look is spent only where the player is looking. An instanced 200-jelly crowd already held 60 fps on an iPhone.

## Alternatives rejected

Separate sphere nubs (visible seam, reads as ears). A shoulder blob to hide the seam (cheaper, still a faint seam). Live metaballs for every jelly (CPU remeshing every frame does not scale to 250 jellies on a phone, breaks the paint layer and looks lumpy at low resolution). One unique mesh per character (draw calls and authoring cost grow with the cast).

## Consequences

Hit tests cannot use the shader-bent shape, so hits stay in the headless sim (DEC-02). Extreme arm poses can pinch the shoulder, so arm range and how much body bends with the arm need tuning. Far-away jellies may drop small accessories. The randomizer's jelly builder becomes the reference for this renderer when FEAT-01 ports it.
