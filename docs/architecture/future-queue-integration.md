# Future Queue Integration Plan

## Current implemented simulation

The current UI-first phase includes a domain/application queue simulation:

- one queue (`planning-queue`)
- status fixed to `paused`
- queue items produced deterministically from block state + placement transitions
- operations represented as `create` / `update` / `delete`

This is intentionally not a dispatcher; it is a queue-aware board projection.

## Current mapping inside this app (state-aware)

- `state=uncommitted` and placed in lane -> queue item `create`
- `state=uncommitted` and returned to pool -> queue item removed
- `state=committed` and removed from committed slot -> queue item `delete`
- `state=committed` and moved to other slot/day -> queue item `update`
- `state=committed` and restored to original slot -> queue item removed

## Handoff target (next integration)

```text
Block(state) + Placement + QueueSimulation -> adapter mapping -> ASYNC_INTEGRATION_FOUNDATION QueueItem
```

## Adapter responsibilities for real handoff

1. Map simulation queue item fields to foundation queue contract fields.
2. Preserve operation semantics (`create`, `update`, `delete`).
3. Add integration context (tenant/user/week) and idempotency metadata.
4. Enqueue via async foundation API.

## Future state expansion impact

Foundation keeps state abstract, so additional app states can alter queue behavior later without changing engine primitives. Examples:

- `approved`: might suppress queue updates unless placement changes are final.
- `rejected`: might create corrective queue operations.
- `completed`: might prevent further move-driven queue updates.

These policies remain application-specific.

## Boundary clarity

- Foundation: generic block state capability.
- Core/Application: state meaning + queue decision rules + deterministic projection.
- Integration adapter: translation + enqueue call.
- Async foundation: persistence, worker dispatch, retries, dead-letter, status.
- UI: monitor and command invocation only.
