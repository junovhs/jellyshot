+++
area = "design"
becomes = "history"
date = "2026-11-27"
evidence = ["DOCS-06", "base:aca8ae728c6ff93bfa5170be6aebe61349793fd3"]
id = "DEC-10"
revised_at = "2026-11-27T00:37:06.760356709Z"
scope = ["docs/game-bible.md", "docs/levels/", "sim/", "render/", "content/"]
status = "accepted"
superseded_by = []
supersedes = []
title = "Launch with 20 big location levels; each is event × space × guard type × twist, with crowd, 40-70 real characters, guards and targets, built data-driven; level 1 is the Spring Break boardwalk"

[author]
agent = "agent-2291431"
person = "junovhs"
+++

# DEC-10: Launch with 20 big location levels; each is event × space × guard type × twist, with crowd, 40-70 real characters, guards and targets, built data-driven; level 1 is the Spring Break boardwalk

## Context

The founding plan was one dense map (the Jubilee) with many contracts. The person wants to launch with about 20 big location levels, each taking a while to beat and unlocking the next, each with 40 to 70 real characters, and four distinct entities: the crowd, real characters with loops, personalities and behaviour that interact with the world, guards, and targets. Each location's guards and conditions should present different kinds of challenge. They approved the 20-location list and the plan to build level 1 first.

## Decision

Launch scope is 20 locations (list and order in docs/game-bible.md, tunable per level). Each location is an event × a space × its own guard type × one twist rule. Every level has four entity types: an instanced herd crowd, 40 to 70 real characters, a location-specific guard type, and targets with bad deeds and escape plans. Finishing a level's main contract unlocks the next; each level also carries side jobs and challenges. Content is data-driven: a shared archetype library (behaviour loops, reactions, object interactions) built once, and every character is data (archetype, outfit, colour and size, name, quirks, relationships, schedule, chatter), alongside contracts as data (DEC-04). Level 1 is the Spring Break boardwalk (docs/levels/01-spring-break-boardwalk.md), built fully to final quality as the vertical slice; it replaces the Gumdrop Jubilee as the first playable contract.

## Why

Twenty big levels is what the person sees as a full game worth installing. Each location's own guards and twist keep them from feeling like reskins. About 1,100 characters is only feasible as data on a reusable archetype library, and building one level to final quality first proves the formula and produces that library before scaling.

## Alternatives rejected

One dense map with many contracts (the founding plan): replaced, though each level keeps that depth. Hand-scripting every character: infeasible at this scale. Building several levels in parallel before one is finished: rejected, because the archetype library and the formula need proving first.

## Consequences

The active plan becomes level 1 playable end to end. The sim needs data schemas for archetypes, characters, guard types and level twists; render needs an instanced herd crowd and location dioramas; performance must hold 40 to 70 real characters plus a crowd on the reference iPhone (PERF-01 sets the crowd size). Levels 2 to 20 are each a design brief in docs/levels/ before any building.
