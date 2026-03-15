# Timesheet Planning App (UI-first, core-driven)

This repository contains the first usable **weekly timesheet planning app** built to stay aligned with:

- `BLOCK_ENGINE_FOUNDATION` (block/container/placement movement model)
- `ASYNC_INTEGRATION_FOUNDATION` (queue-ready handoff direction)

Users can drag incoming time-registration candidates from an unplanned pool into **7 day swimlanes (Monday-Sunday)**.

## Scope in this phase

- Left panel with unplanned candidate blocks (mock inbound source)
- Weekly board with seven day lanes
- Drag-and-drop: pool -> lane, lane -> lane, lane -> pool
- Duration-based visual sizing
- Stable lane ordering after movement
- Explicit projections for:
  - raw state (`BoardState`)
  - planning view (`WeeklyBoardView`)
  - future export (`TimeEntryDraft[]`, queue-ready records)

## Out of scope in this phase

- Backend persistence
- Real inbound API integration
- Queue dispatch/retry/dead-letter
- Real SAP outbound call
- Auth/authz

## Runtime requirements

- Node.js `>=20.10.0` (also in `.nvmrc`)
- npm `>=10`

## Install and run (reproducible)

```bash
npm run setup
npm run dev
```

Alternative:

```bash
npm install
npm run dev
```

## Local verification checklist

```bash
npm run test
npm run build
```

Expected in this phase:

- app starts locally with mock blocks
- 7 swimlanes are visible
- drag/drop placement and return flow works
- tests verify framework-neutral movement/projection behavior
- build succeeds for production bundle

## Architecture map

- `src/core/domain`: framework-neutral entities + rules
- `src/core/application`: use-case operations + projections
- `src/integration`: inbound adapter boundary + queue/SAP placeholders
- `src/ui` + `src/app`: React adapter only

## Foundation alignment

- Block -> `TimeBlock`
- Container -> `DayLane`
- Placement -> `PlacedBlock`
- Projection -> `WeeklyBoardView`

Placed blocks are converted to `TimeEntryDraft`, then to queue-ready records. Dispatch remains outside this app and belongs to async integration infrastructure.

## Documentation index

- `ARCHITECTURE.md`
- `docs/architecture/board-domain-model.md`
- `docs/architecture/ui-portability-strategy.md`
- `docs/architecture/future-queue-integration.md`
- `docs/architecture/fiori-migration-path.md`
- `docs/architecture/activity-domain-model.md`
- `docs/architecture/activity-to-block-flow.md`
- `docs/architecture/ai-enrichment-future.md`
- `docs/process/implementation-roadmap.md`
- `docs/process/runtime-verification.md`

## Next functional phase

The next phase should use the existing model transition path:

1. enrich placed blocks with registration metadata
2. project `PlacedBlock` -> `TimeEntryDraft`
3. map drafts to queue-ready records
4. hand queue-ready records to `ASYNC_INTEGRATION_FOUNDATION` for dispatch/retry handling

UI remains responsible only for invoking application services and rendering projections.


## Activity Graph (introduced)

The model now includes a lightweight contextual layer:

`Activity -> ActivityInstance -> TimeBlock -> PlacedBlock -> TimeEntryDraft -> Queue-ready`

This keeps planning behavior unchanged while adding source/context metadata for richer future flows (calendar, AI, favorites, project tasks).
