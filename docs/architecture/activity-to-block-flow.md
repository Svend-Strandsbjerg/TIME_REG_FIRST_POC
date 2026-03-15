# Activity -> Block -> Placement -> Draft -> Queue Flow

```text
Activity
  -> ActivityInstance
  -> TimeBlock
  -> PlacedBlock
  -> TimeEntryDraft
  -> QueueReadyTimeEntry
  -> ASYNC_INTEGRATION_FOUNDATION QueueItem (future)
```

## Boundaries

- Domain owns `Activity`, `ActivityInstance`, and conversion into `TimeBlock`.
- Application owns placement and projection workflows.
- Integration owns queue/SAP mapping.
- UI remains an adapter that invokes commands and renders projections.

## Current state

Mock inbound source already simulates this flow by generating candidate `TimeBlock`s from activity instances.
