# UI Portability Strategy

## Principle

Frontend frameworks are interaction/rendering adapters. Core planning behavior is framework-neutral.

## Portable core contract

Both React and SAPUI5/Fiori can consume the same core model:

- blocks (`state`, `extentMinutes`, optional template provenance metadata)
- placements (`lane/day`, `startTime`)
- derived read model (`endTime`, daily totals, queue projection)

## Framework-specific responsibility

UI layers own:

- drag/drop mechanics
- resize interaction mechanics (edge handles, pointer drag behavior)
- resize intent detection (top vs bottom edge + slot delta)
- interaction affordances and visual styling

Core/application own:

- time arithmetic
- placement mutation
- extent mutation
- queue projection rules

## Why this scales

- `extentMinutes` remains framework-neutral
- placement model is explicit and transportable (`day + startTime`)
- queue projection remains deterministic and testable without UI runtime dependencies

## Current React implementation vs future UI stacks

- React adapter implements calendar-style edge drag resizing on top/bottom handles.
- A future SAPUI5/Fiori adapter can implement equivalent resize interaction differently, while still sending the same resize intent (`edge` + slot delta) into the shared application/core model.


## Portable state semantics, flexible rendering

- Core preserves portable state meaning (`template`, `imported`, `uncommitted`, `committed`).
- UI layers can render those states differently (colors/badges/palette behavior) without changing core domain rules.
- The reusable template-candidate palette concept is portable across React/Fiori/other UI stacks.


## Interaction and rendering boundary clarifications

- Imported-candidate double-click auto-placement is UI interaction logic that calls core application commands.
- Side-by-side overlap layout is UI rendering logic using core overlap-group metadata.
- Core remains responsible for canonical schedule data, interval derivation, and identifier generation.
