# Board Domain Model

## Core concepts

- `TimeBlock`
  - `state` (foundation-aligned lifecycle abstraction: `template`, `imported`, `uncommitted`, `committed`)
  - `extentMinutes` (duration footprint)
- `Placement`
  - `laneId`
  - `dayKey` (via lane)
  - `startTime` (`HH:mm`)
- Derived values
  - `endTime = startTime + extentMinutes`
  - day totals from `sum(extentMinutes)`

## Time-aware placement

Placements are no longer lane-only. A placement now identifies a concrete slot in a day column.

Example:

- day: Monday
- start: 08:30
- extent: 90
- derived end: 10:00

## Planning window and slot model

- visible window: `06:00-18:00`
- deterministic grid: `30-minute` increments
- generated slots: `06:00, 06:30, ... 17:30`

## Resize semantics

- Bottom-edge drag (extend/retract):
  - changes `extentMinutes`
  - keeps `startTime` anchored
  - `endTime` is recalculated from `startTime + extentMinutes`
- Top-edge drag (extend/retract):
  - changes `startTime`
  - changes `extentMinutes`
  - bottom/end is anchored

Resize operations are snapped to `30-minute` slot increments.

## Resize constraints

- minimum extent: `30 minutes`
- start cannot move earlier than `06:00`
- end cannot move later than `18:00`
- out-of-range drag intent is clamped deterministically to these boundaries

## Committed baseline

Committed baseline stores original scheduled slot and can include baseline extent metadata:

- baseline day/lane
- baseline start time
- optional baseline extent

Restoring a committed block returns it to baseline day/time.

## Queue projection impact

Queue projection now uses actual scheduled start time (`timeSlot`) and day key, not synthetic lane order.

## Daily totals

`DayLaneView.totalHours` is computed as:

`sum(extentMinutes) / 60`


## Imported vs template semantics

- `imported`: inferred from external work signals (Outlook/Azure/SCRUM/task systems); placeable like normal candidate blocks.
- `template`: reusable standard PSP candidate; dragging does not consume source card and instead spawns a new actionable block (`uncommitted`) with template provenance metadata.

## Interval derivation

Queue/log interval is deterministic: `interval = startTime + ' - ' + (startTime + extentMinutes)`.


## Imported baseline placement metadata

Imported candidates can carry baseline scheduling metadata:

- `metadata.importedDayKey`
- `metadata.importedStartTime`
- `metadata.importedEndTime` (optional; otherwise derived from `extentMinutes`)

UI double-click auto-placement uses this metadata to place imported blocks directly into the corresponding day lane and start slot.

## Candidate/source semantics vs placed semantics

- Imported candidates are source signals (blue) and are consumed once placed.
- Template candidates are reusable PSP palette entries (purple) and remain available after drag/spawn.
- Placed entries are rendered by placed state semantics (`uncommitted` red, `committed` yellow).

## Concurrent placement concept

Multiple placements are allowed in the same lane/time interval. Projection adds overlap-group metadata (`layoutColumn`, `layoutColumnCount`) so UI can render side-by-side blocks without visual overlap.
