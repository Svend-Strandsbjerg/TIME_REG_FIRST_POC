# Architecture Overview: Timesheet Planning App

## 1) Layers

### Core domain (`src/core/domain`)

Owns pure types and deterministic rules:

- board model (`TimeBlock`, `DayLane`, `PlacedBlock`, `BoardState`)
- foundation-provided block state consumption (`TimeBlock.state`)
- committed placement memory (`CommittedPlacement`)
- queue simulation model (`Queue`, `QueueItem`)
- slot derivation and comparison rules (`order -> HH:00`)
- queue projection rules derived from block state + placement transitions

No React/browser/SAP worker concerns are allowed in this layer.

### Application (`src/core/application`)

Owns use-case commands and read projections:

- Commands: `createBoardWeek`, `placeBlockOnLane`, `movePlacedBlock`, `returnBlockToPool`, `reorderPlacedBlock`
- Projections: `buildPlanningView`, `convertPlacedBlockToTimeEntryDraft`
- Derived outputs: daily totals, queue panel read-model, planned/unplanned summary, block state exposure

### Integration (`src/integration`)

Owns adapter boundaries:

- inbound block source interface + mock implementation
- queue-ready handoff mapper placeholder
- SAP mapper placeholder

Queue dispatch/retry/dead-letter remains outside this repository.

### UI adapter (`src/ui`, `src/app`)

React DnD handlers invoke application commands and render projections only.
Business rules remain in core/application functions.

UI owns state visualization (e.g., color mapping `uncommitted -> red`, `committed -> orange`).

## 2) Queue simulation in the architecture

The app contains a lightweight queue state to simulate first async behavior without implementing dispatch:

- exactly one queue exists in `BoardState`
- queue status is fixed to `paused`
- queue items are computed deterministically from block state + placement + committed baseline comparison

This keeps queue behavior explicit and testable while preserving future portability.

## 3) Alignment to BLOCK_ENGINE_FOUNDATION and ASYNC_INTEGRATION_FOUNDATION

Current flow:

`BLOCK_ENGINE_FOUNDATION Block(state) -> BoardState -> queue simulation projection + TimeEntryDraft[]`

Future flow:

`queue simulation items / drafts -> adapter mapping -> ASYNC_INTEGRATION_FOUNDATION queue contracts`

The queue item shape intentionally carries minimum integration-relevant fields (queueId, blockId, day, slot, operation) so adapter handoff is straightforward.

## 4) State semantics separation

- Foundation: provides abstract `Block.state` capability only.
- POC application/domain: assigns meaning to states (`uncommitted`, `committed`) and applies queue behavior.
- UI: maps state to visual indicators/colors and filtering.

## 5) Portability

Reusable as-is across frontends:

- `src/core/domain/*`
- `src/core/application/*`

Replace per frontend:

- `src/ui/*`
- drag/drop adapter
- styles
