English | [简体中文](./ENGINE_PLAN.zh-CN.md)

# tico Engine Evolution Plan

This document tracks the upgrade path for `tico` as a reusable and comfortable TUI 2D game engine.

## Goals

- Make core runtime services reusable across multiple game genres.
- Reduce gameplay code that depends on raw `setTimeout()`, `Date.now()`, or scene-local timing hacks.
- Push content toward data-driven configuration without forcing all behavior into JSON.
- Keep the engine small, explicit, and friendly for terminal game development.

## Design Principles

- Runtime services should be scene-safe and easy to clean up.
- Engine APIs should prefer simple objects and explicit ownership over hidden magic.
- Data drives content selection; code still owns complex behavior.
- Examples should demonstrate engine patterns, not bypass them.

## Phases

### Phase 1: Runtime Time Service

Status: completed in this iteration

Delivered:

- Added `EngineTime` as a public runtime service.
- Added `after()`, `every()`, `nextFrame()`, `cancel()`, and `cancelByOwner()`.
- Wired the time service into `GameEngine` and `EngineApp`.
- Added scene-owned task cleanup when a scene unbinds.
- Updated the Tetris sample to demonstrate scheduler-driven UI behavior.
- Added engine tests and updated docs.

Success criteria:

- New games can schedule delayed and repeated gameplay work through `app.time`.
- Scene-owned tasks do not leak across scene transitions.
- Scheduler behavior follows pause and time-scale semantics from the engine loop.

### Phase 2: Data-Driven Content Layer

Status: next

Scope:

- Formalize asset namespaces and content bundle conventions.
- Add lightweight schema validation helpers for JSON content.
- Move more sample content into JSON or declarative tables:
  - wave definitions
  - enemy stats
  - drop tables
  - UI copy
- Keep advanced behaviors code-defined through pattern ids and handler maps.

Success criteria:

- Sample games can add or rebalance content without editing gameplay logic in multiple places.
- Resource loading and cache invalidation remain predictable.

### Phase 3: Gameplay Composition

Status: planned

Scope:

- Clarify system lifecycle patterns for scenes and reusable gameplay modules.
- Add a thin bridge pattern for gameplay objects that need both `Entity` and `Node2D` behavior.
- Add small runtime helpers for overlays, transitions, and debug HUDs.
- Improve owner-scoped cleanup for gameplay services beyond time scheduling.

Success criteria:

- Building a new game scene should mostly involve combining engine services rather than recreating plumbing.

### Phase 4: Developer Experience

Status: planned

Scope:

- Expand docs with recipes and architecture examples.
- Add starter templates for common terminal game genres.
- Tighten test coverage around public API examples.

Success criteria:

- A new contributor can build a playable prototype by following the docs and examples.

## Current Recommendation

For the next implementation step, prioritize Phase 2 and keep the scope narrow: content schemas, resource conventions, and one more data-driven example upgrade.
