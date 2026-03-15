# Board Domain Model

## Core types

- `TimeBlock`: candidate registration unit.
- `DayLane`: weekly swimlane container.
- `PlacedBlock`: lane placement relation including:
  - lane id
  - lane-local order
  - state (`uncommitted` or `committed`)
  - optional committed baseline placement
- `Queue` and `QueueItem`: simulated async change backlog.
- `BoardState`: aggregate (`blocks`, `lanes`, `placements`, `queue`).

## Slot representation

Slots are intentionally lightweight and deterministic:

- slot is derived from lane-local order
- formula: `09:00 + order` (hourly increments)
- queue items and committed comparison use this normalized slot representation

## Committed placement memory

Committed placements carry remembered baseline context:

- committed lane id
- committed order
- committed slot (`dayKey`, `timeSlot`)

This enables:

- baseline comparison for change detection
- delete/update queue semantics
- automatic restoration when a removed committed block is returned

## Queue projection rules

- `uncommitted + placed` => queue `create`
- `uncommitted + unplaced` => no queue item
- `committed + at baseline` => no queue item
- `committed + removed` => queue `delete`
- `committed + moved` => queue `update`

Rules are deterministic and computed from state, not ad hoc UI flags.

## Daily totals logic

Daily totals are read-model values computed from placed blocks in each lane:

`sum(durationMinutes) / 60`

Totals are exposed via `DayLaneView.totalHours` for lane header rendering.
