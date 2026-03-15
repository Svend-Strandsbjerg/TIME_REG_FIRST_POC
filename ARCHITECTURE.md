# Architecture Overview: Timesheet Planning App

## Layers

### Core domain (`src/core/domain`)

Owns framework-neutral model and rules:

- `TimeBlock` with abstract `state` and `extentMinutes`
- time-aware `PlacedBlock` (`laneId`, `startTime`)
- committed baseline snapshot (`laneId`, `startTime`, optional baseline extent)
- deterministic slot/time arithmetic for 06:00-18:00 window (30-minute grid)
- queue projection rules derived from state + placement deltas

### Application (`src/core/application`)

Owns use cases and projections:

- Commands: create week, place/move by day+time, return to pool, resize from top/bottom edges
- Projections: planner view, queue view, daily totals, time-entry drafts
- Derived data: `endTime` from `startTime + extentMinutes`

### UI adapter (`src/ui`, `src/app`)

Owns interaction intent only:

- drag/drop captures target lane + slot start time
- edge-drag resize intent (top vs bottom + snapped slot delta)
- rendering of candidate color (`template` purple, `imported` blue) and placed color (`uncommitted` red, `committed` yellow) + time-position + extent-based height
- imported-candidate double-click interaction for auto-placement
- side-by-side overlap layout rendering based on core-provided schedule intervals

No queue decision logic or domain math is implemented directly in UI.

### Integration (`src/integration`)

Owns adapter boundaries and placeholder mappers.

## State / extent / placement separation

- `state` controls lifecycle semantics (`template`, `imported`, `uncommitted`, `committed`)
- `extentMinutes` controls duration footprint
- `placement` controls day + start-time schedule position

This separation is key for portability and future queue payload evolution.

## Queue simulation strategy

- One deterministic queue ID (`queue-<hash>`, status `paused`)
- Items include real scheduling coordinates (day + start time)
- Operations: `create`/`update`/`delete`
- Extent changes are already represented in state, enabling future queue payload inclusion without changing the model shape
- Extent changes for committed items are meaningful queue deltas when baseline extent metadata exists

## Overlap policy (POC)

The planner allows concurrent placements. Core projections annotate each placed card with deterministic overlap-group layout metadata (`layoutColumn`, `layoutColumnCount`), and UI renders parallel blocks side-by-side.


## Template spawn behavior

- `template` candidates stay in the unplanned list permanently as a reusable palette source.
- Dragging a template into a lane creates a new block instance with `state=uncommitted`.
- Spawned blocks keep template provenance metadata (`templateSourceBlockId`, `templatePspElement`).


## Identifier strategy

- Queue IDs are deterministic identifiers generated from a stable scope hash (`createQueueId`).
- Queue item IDs are deterministic identifiers generated from queue ID + block ID + operation + day + start time.
- Labels/titles remain human-readable fields and are not used as IDs.
