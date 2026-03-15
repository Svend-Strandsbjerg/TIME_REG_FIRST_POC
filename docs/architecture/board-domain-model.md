# Board Domain Model

## Core types

- `TimeBlock`: candidate time registration unit.
- `DayLane`: weekly swimlane container with deterministic order.
- `PlacedBlock`: placement relation of a block inside a lane with lane-local order.
- `BoardState`: aggregate state (`blocks`, `lanes`, `placements`).

## Rule set

- A block is either unplanned (no placement) or planned (has placement).
- A lane is an ordered consistency boundary.
- Placement movement is explicit command behavior.
- View rendering reads from projections, not raw mutation in UI.

## Mapping to block movement foundation

- Block -> `TimeBlock`
- Container -> `DayLane`
- Placement -> `PlacedBlock`
- Query projection -> `WeeklyBoardView`
