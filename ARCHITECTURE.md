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

- Commands: create week, place/move by day+time, return to pool, extend up/down
- Projections: planner view, queue view, daily totals, time-entry drafts
- Derived data: `endTime` from `startTime + extentMinutes`

### UI adapter (`src/ui`, `src/app`)

Owns interaction intent only:

- drag/drop captures target lane + slot start time
- resize intent (upward vs downward)
- rendering of state color + time-position + extent-based height

No queue decision logic or domain math is implemented directly in UI.

### Integration (`src/integration`)

Owns adapter boundaries and placeholder mappers.

## State / extent / placement separation

- `state` controls lifecycle semantics (uncommitted vs committed baseline behavior)
- `extentMinutes` controls duration footprint
- `placement` controls day + start-time schedule position

This separation is key for portability and future queue payload evolution.

## Queue simulation strategy

- One queue (`planning-queue`, status `paused`)
- Items include real scheduling coordinates (day + start time)
- Operations: `create`/`update`/`delete`
- Extent changes are already represented in state, enabling future queue payload inclusion without changing the model shape

## Overlap policy (POC)

The planner currently allows deterministic free placement without advanced overlap resolution. This is documented and intentionally deferred.
