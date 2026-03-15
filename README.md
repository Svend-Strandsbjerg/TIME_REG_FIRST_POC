# Timesheet Planning App (UI-first, core-driven)

This POC now provides a **time-aware daily swimlane planner** aligned with:

- `BLOCK_ENGINE_FOUNDATION` (abstract block state + block extent)
- `ASYNC_INTEGRATION_FOUNDATION` (queue semantics/handoff direction)

## Scope in this phase

- Three-panel layout:
  - left: unplanned blocks
  - center: weekly planner with day columns modeled as a time axis
  - right: paused queue/log monitor
- Daily planning window: **06:00-18:00**
- Deterministic slot model: **30-minute increments**
- Placement model: **day + start time**
- Extent model: **block extentMinutes drives rendered height and derived end time**
- Resize support:
  - drag block body => move placement
  - drag bottom edge => extend/retract by changing extent while anchoring start time
  - drag top edge => extend/retract by changing start time + extent while anchoring end time
  - snapping uses 30-minute slot increments, minimum extent is 30 minutes
  - resize is clamped to the 06:00-18:00 planning window
- Daily totals shown per day (`sum(extentMinutes)`)

## Placement model

A placement now carries **where** a block is scheduled:

- lane/day
- start time (`HH:mm`)

Duration remains on the block via `extentMinutes`. End time is derived from `startTime + extentMinutes`.

## Queue behavior (time-aware)

- Uncommitted block placed => queue `create` with day + actual start time
- Uncommitted block removed => queue item removed
- Committed block removed from baseline => queue `delete`
- Committed block moved day/time => queue `update`
- Committed block restored => queue item removed

Committed baseline now tracks day + start time (and optional extent baseline metadata).

## Collision handling in this POC

Current behavior allows free placement on any deterministic slot and does **not** implement sophisticated overlap prevention yet. This is intentionally deferred as a future enhancement.

## Install and run

```bash
npm run setup
npm run dev
```

## Local verification checklist

```bash
npm run test
npm run build
```

## Architecture map

- `src/core/domain`: framework-neutral entities + deterministic time rules
- `src/core/application`: command operations + read projections
- `src/integration`: inbound adapter boundary + queue handoff placeholder
- `src/ui` + `src/app`: React adapter (DnD + edge-drag resize intent + rendering)
