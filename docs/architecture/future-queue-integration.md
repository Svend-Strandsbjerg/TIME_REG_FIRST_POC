# Future Queue Integration Plan

## Current flow (already implemented)

1. Planner mutates raw `BoardState` via application commands.
2. Application projects placements into `TimeEntryDraft[]`.
3. Integration adapter maps drafts to queue-ready records with deterministic sequence.

## Next phase contract flow

```text
PlacedBlock -> TimeEntryDraft -> QueueReadyTimeEntry -> ASYNC_INTEGRATION_FOUNDATION QueueItem
```

## Responsibilities boundary

- Core/Application: domain logic + projections only
- Integration adapter: mapping to queue contracts
- Async integration foundation: queue persistence, dispatch, retry, dead-letter
- UI: never dispatches, only invokes application services

## Concrete implementation steps

1. Add queue context identity strategy (e.g. week/employee scope).
2. Introduce adapter mapping from `QueueReadyTimeEntry` to foundation queue item schema.
3. Pass mapped queue items to async foundation enqueue API.
4. Return status/read model back to UI without exposing worker internals.
