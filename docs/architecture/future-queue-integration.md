# Future Queue Integration Plan

## Current implemented simulation

The current phase projects queue items from time-aware placements:

- one queue (`planning-queue`)
- status `paused`
- operations `create` / `update` / `delete`
- queue item includes real scheduling coordinates (`dayKey`, `startTime`, derived `endTime`, `interval`)

## Current mapping behavior

- `state=uncommitted` + placed => `create`
- `state=uncommitted` + unplaced => queue item removed
- `state=committed` + removed from baseline => `delete`
- `state=committed` + moved day/time => `update`
- restored to baseline day/time => queue item removed

## Why extent matters for next phase

Duration is represented by `extentMinutes` on the block. Real integration payloads can evolve to derive:

- scheduling (`dayKey`, `startTime`) from placement
- duration from `extentMinutes`

This avoids duplicate duration fields and keeps contracts aligned with foundation capability.

## Next integration handoff

`Block(state, extent) + Placement(day, start) -> queue projection -> adapter mapping -> ASYNC_INTEGRATION_FOUNDATION`

## Forward compatibility

Extent changes are not yet emitted as distinct queue semantics in this POC, but the model already supports introducing that behavior without schema redesign.


## Future source/template expansion

- Imported blocks can later be materialized from Outlook calendar, Azure records, or SCRUM/task signals while keeping the same `state=imported` core contract.
- Template blocks can later represent curated/default PSP libraries while keeping reusable candidate palette behavior.
- Queue/log interval remains derived from placement start time plus block extent.
