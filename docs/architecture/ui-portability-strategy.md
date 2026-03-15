# UI Portability Strategy

## Principle

Frontend frameworks are interaction/rendering adapters. Core planning behavior is framework-neutral.

## Portable core contract

Both React and SAPUI5/Fiori can consume the same core model:

- blocks (`state`, `extentMinutes`)
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
