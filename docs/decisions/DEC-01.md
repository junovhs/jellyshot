+++
area = "render"
becomes = "history"
date = "2026-11-26"
evidence = ["DOCS-01", "base:50d680b623ea4ef888dfcc87e89379d36dcc65b5"]
id = "DEC-01"
revised_at = "2026-11-26T17:56:11.501288541Z"
scope = ["render/", "package.json"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Three.js on WebGL2, held to a phone performance budget"

[author]
agent = "agent-1859252"
person = "junovhs"
+++

# DEC-01: Three.js on WebGL2, held to a phone performance budget

## Context

The game must be an installable website that plays as a full game on iPhone (standalone Safari) and on desktop. The clay3d concept was built in Three.js from a CDN, with MeshPhysicalMaterial, clearcoat and shadows everywhere, and has never been measured on a phone. The person: 'we need to consider what would be performant in that setup, but also on desktop, I would do pretty much anything.'

## Decision

Keep Three.js, installed from npm and bundled by Vite, rendering with WebGL2 (WebGPU can come later behind the same renderer). Hold it to a budget: 60 fps on an iPhone 12-class phone in standalone Safari and on integrated-GPU laptops, device pixel ratio capped at 2, one shadow-casting light or baked contact shadows only, a matcap or MeshStandard clay material instead of MeshPhysical with clearcoat, instancing for crowd, grass and props, and adaptive resolution when frame time slips.

## Why

It's what the concept already proves, it has the smallest bundle of the full 3D options, it gives direct control over a fixed-camera diorama, and it runs well in iOS Safari when the materials and shadows are kept modest.

## Alternatives rejected

Babylon.js: capable, but a heavier bundle for no gain on a fixed-camera scene. PlayCanvas: good on mobile, but editor-centric. Godot and Unity web exports: big downloads and weak iOS Safari support. Raw WebGL: too much engine to rebuild.

## Consequences

Every render feature has to fit the budget, and a perf HUD and on-device measurement are part of the foundation. If Three.js can't hold 60 fps on the reference phone after the budget is applied, reopen this decision.
