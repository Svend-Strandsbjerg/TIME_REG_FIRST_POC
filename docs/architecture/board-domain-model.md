# Board Domain Model

## Core types

- `TimeBlock`: candidate registration unit including foundation-provided `state`.
- `DayLane`: weekly swimlane container.
- `PlacedBlock`: lane placement relation including:
  - lane id
  - lane-local order
  - optional committed baseline placement
- `Queue` and `QueueItem`: simulated async change backlog.
- `BoardState`: aggregate (`blocks`, `lanes`, `placements`, `queue`).

## Block state and lifecycle semantics

`BLOCK_ENGINE_FOUNDATION` now provides abstract block-state capability. The POC uses this directly via `TimeBlock.state`.

In this phase, app-specific meanings are:

- `uncommitted`: block not yet represented in downstream system
- `committed`: block has a persisted baseline placement

Possible future values (not engine-enforced): `approved`, `rejected`, `completed`.

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

## Queue projection rules (state-aware)

- `block.state = uncommitted` + placed => queue `create`
- `block.state = uncommitted` + unplaced => no queue item
- `block.state = committed` + at baseline => no queue item
- `block.state = committed` + removed => queue `delete`
- `block.state = committed` + moved => queue `update`

Rules are deterministic and computed from model state, not ad hoc UI flags.

## Lifecycle examples

- New uncommitted candidate dropped onto Tuesday lane -> queue `create` for Tuesday slot.
- Committed Monday 09:00 candidate removed to pool -> queue `delete` at Monday 09:00.
- Same committed candidate dropped back -> auto-restores Monday baseline, queue clears.
- Committed candidate moved to different lane/slot -> queue `update`.

## UI separation

UI decides visual representation only:

- `uncommitted` -> red
- `committed` -> orange

Color mapping stays outside domain/application logic.

## Daily totals logic

Daily totals are read-model values computed from placed blocks in each lane:

`sum(durationMinutes) / 60`

Totals are exposed via `DayLaneView.totalHours` for lane header rendering.
