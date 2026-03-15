# Future Queue Integration Plan

## Current implemented simulation

The current UI-first phase now includes a domain/application queue simulation:

- one queue (`planning-queue`)
- status fixed to `paused`
- queue items produced deterministically from placement transitions
- operations represented as `create` / `update` / `delete`

This is intentionally not a dispatcher; it is a queue-aware board projection.

## Current mapping inside this app

- Uncommitted placement in lane -> queue item `create`
- Uncommitted return to pool -> queue item removed
- Committed removed from committed slot -> queue item `delete`
- Committed moved to other slot/day -> queue item `update`
- Committed restored to original slot -> queue item removed

## Handoff target (next integration)

```text
PlacedBlock/QueueSimulation -> adapter mapping -> ASYNC_INTEGRATION_FOUNDATION QueueItem
```

## Adapter responsibilities for real handoff

1. Map simulation queue item fields to foundation queue contract fields.
2. Preserve operation semantics (`create`, `update`, `delete`).
3. Add integration context (tenant/user/week) and idempotency metadata.
4. Enqueue via async foundation API.

## Boundary clarity

- Core/Application: queue decision rules and deterministic projection
- Integration adapter: translation + enqueue call
- Async foundation: persistence, worker dispatch, retries, dead-letter, status
- UI: monitor and command invocation only
