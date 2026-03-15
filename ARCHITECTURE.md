# Architecture Overview: Timesheet Planning App

## 1) Layers

### Core domain (`src/core/domain`)

Owns pure types and movement rules:

- `TimeBlock`, `DayLane`, `PlacedBlock`, `BoardState`
- deterministic placement and lane-order normalization
- duration-to-size hints

No React, browser drag/drop, SAP, or queue infrastructure types are allowed here.

### Application (`src/core/application`)

Owns readable use cases and projections:

- Commands: `createBoardWeek`, `placeBlockOnLane`, `movePlacedBlock`, `returnBlockToPool`, `reorderPlacedBlock`
- Projections: `buildPlanningView`, `convertPlacedBlockToTimeEntryDraft`

This layer is intentionally small (no extra ceremony wrappers) to keep first version practical.

### Integration (`src/integration`)

Owns adapter boundaries:

- inbound block source interface + mock implementation
- queue-ready projection extension point
- SAP payload mapper placeholder

Dispatch/retry/dead-letter stays outside this repository scope.

### UI adapter (`src/ui`, `src/app`)

React + HTML5 drag/drop is current adapter only. UI translates interactions into application commands and renders derived projections.

## 2) State and projection clarity

- **Raw state**: `BoardState` (`blocks`, `lanes`, `placements`)
- **Planning view**: `WeeklyBoardView` for UI rendering
- **Export preparation**: `TimeEntryDraft[]`
- **Queue-ready handoff**: `QueueReadyTimeEntry[]`

This separation keeps queue onboarding straightforward later.

## 3) Portability

Reusable as-is across frontends:

- `src/core/domain/*`
- `src/core/application/*`

Replace per frontend:

- `src/ui/*`
- drag/drop adapter
- styling

## 4) Fiori/SAPUI5 path (concrete)

A SAPUI5 adapter can call core application services the same way React does:

1. Load `BoardState` from inbound adapter.
2. Trigger `placeBlockOnLane(...)` from SAPUI5 DnD handlers.
3. Render `buildPlanningView(...)` into JSONModel.
4. Keep SAP mapping in integration adapters only.

## 5) Next integration step

1. Convert `PlacedBlock` -> `TimeEntryDraft` via application projection.
2. Convert drafts -> queue-ready records in `integration/async`.
3. Hand queue-ready records to async foundation contracts.
4. Keep all dispatch responsibilities out of UI and out of core domain.


## 6) Activity Graph extension

A new domain context layer has been introduced:

- `Activity` (source-level context)
- `ActivityInstance` (concrete occurrence with suggested duration)
- deterministic conversion to `TimeBlock`

This preserves the existing movement model and extends traceability for AI/favorites/calendar-derived planning.
