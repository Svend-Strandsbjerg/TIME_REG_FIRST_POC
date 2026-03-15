# Board Domain Model

## Core concepts

- `TimeBlock`
  - `state` (foundation-aligned lifecycle abstraction)
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

- Downward extend:
  - changes `extentMinutes`
  - keeps `startTime`
- Upward extend:
  - changes `startTime` earlier
  - increases `extentMinutes`

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
