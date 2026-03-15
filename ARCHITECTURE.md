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
- rendering of state color (`template` purple, `imported` blue, `uncommitted` red, `committed` orange) + time-position + extent-based height

No queue decision logic or domain math is implemented directly in UI.

### Integration (`src/integration`)

Owns adapter boundaries and placeholder mappers.

## State / extent / placement separation

- `state` controls lifecycle semantics (`template`, `imported`, `uncommitted`, `committed`)
- `extentMinutes` controls duration footprint
- `placement` controls day + start-time schedule position

This separation is key for portability and future queue payload evolution.

## Queue simulation strategy

- One queue (`planning-queue`, status `paused`)
- Items include real scheduling coordinates (day + start time)
- Operations: `create`/`update`/`delete`
- Extent changes are already represented in state, enabling future queue payload inclusion without changing the model shape
- Extent changes for committed items are meaningful queue deltas when baseline extent metadata exists

## Overlap policy (POC)

The planner currently allows deterministic free placement without advanced overlap resolution. This is documented and intentionally deferred.


## Template spawn behavior

- `template` candidates stay in the unplanned list permanently as a reusable palette source.
- Dragging a template into a lane creates a new block instance with `state=uncommitted`.
- Spawned blocks keep template provenance metadata (`templateSourceBlockId`, `templatePspElement`).
