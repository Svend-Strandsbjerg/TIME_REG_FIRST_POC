# Timesheet Planning App (UI-first, core-driven)

This repository contains a weekly timesheet planning app aligned with:

- `BLOCK_ENGINE_FOUNDATION` (block/container/placement movement model + native block state)
- `ASYNC_INTEGRATION_FOUNDATION` (queue item semantics and handoff direction)

The current POC is a **queue-aware planning simulation** where lifecycle is represented through `Block.state` coming from foundation capability.

## Scope in this phase

- Three-panel layout:
  - left: unplanned blocks
  - center: weekly swimlanes
  - right: queue/log monitor
- Exactly one queue that always exists (`planning-queue`) and always has status `paused`
- Queue item simulation with explicit operation semantics: `create` / `update` / `delete`
- Block-state-driven swimlane visualization:
  - `uncommitted` = red
  - `committed` = orange
- Committed placement memory and automatic restoration behavior
- Daily total hours shown per lane header

## Block state ownership

`BLOCK_ENGINE_FOUNDATION` now provides abstract block state support. This POC consumes that capability and assigns app-specific meaning to values:

- `uncommitted`: not yet persisted to target system
- `committed`: already persisted baseline

The framework remains abstract and does not enforce state vocabulary, transition policy, or UI styling. Color mapping is intentionally in UI only.

## Queue and state rules (implemented)

- Uncommitted block placed into a lane => queue item `create`
- Uncommitted block returned to pool => queue item removed
- Committed block removed from lane => queue item `delete`
- Committed block restored after removal => returns to remembered committed day/slot and queue item removed
- Committed block moved to another slot/day => queue item `update`
- Queue item fields include: queue ID, item ID, block ID, day, time slot, operation, reason

## Runtime requirements

- Node.js `>=20.10.0`
- npm `>=10`

## Install and run

```bash
npm run setup
npm run dev
```

## Local verification checklist

```bash
npm run test
npm run build
```

If package installation is blocked in your environment, runtime verification remains pending until dependencies are available.

## Architecture map

- `src/core/domain`: framework-neutral entities + deterministic rules
- `src/core/application`: use-case operations + projections (board + queue + totals)
- `src/integration`: inbound adapter boundary + queue handoff placeholder
- `src/ui` + `src/app`: thin React adapter (state-to-color mapping)

## Documentation index

- `ARCHITECTURE.md`
- `docs/architecture/board-domain-model.md`
- `docs/architecture/future-queue-integration.md`
- `docs/architecture/ui-portability-strategy.md`
- `docs/architecture/fiori-migration-path.md`
