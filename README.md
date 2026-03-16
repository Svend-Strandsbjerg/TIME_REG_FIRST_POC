# Timesheet Planning App (UI-first, core-driven)

This POC now provides a **time-aware daily swimlane planner** aligned with:

- `BLOCK_ENGINE_FOUNDATION` (abstract block state + block extent)
- `ASYNC_INTEGRATION_FOUNDATION` (queue semantics/handoff direction)

## Scope in this phase

- Three-panel layout:
  - left: split candidate palette (Imported candidates + PSP templates)
  - center: weekly planner with day columns modeled as a time axis
  - right: paused queue/log monitor
- Daily planning window: **06:00-18:00**
- Deterministic slot model: **30-minute increments**
- Placement model: **day + start time**
- Extent model: **block extentMinutes drives rendered height and derived end time**
- Resize support:
  - drag block body => move placement
  - drag bottom edge => extend/retract by changing extent while anchoring start time
  - drag top edge => extend/retract by changing start time + extent while anchoring end time
  - snapping uses 30-minute slot increments, minimum extent is 30 minutes
  - resize is clamped to the 06:00-18:00 planning window
- Daily totals shown per day (`sum(extentMinutes)`)

## Placement model

A placement now carries **where** a block is scheduled:

- lane/day
- start time (`HH:mm`)

Duration remains on the block via `extentMinutes`. End time is derived from `startTime + extentMinutes`.

## Queue behavior (time-aware)

- Template block is a reusable PSP source card (purple); dragging it spawns a new actionable block while the template remains in candidates
- PSP template defaults to a 30-minute extent and candidate rendering shows label-only (no interval before placement)
- Imported block is an external-source candidate signal (blue) with imported baseline metadata (`importedDayKey`, `importedStartTime`, optional `importedEndTime`) and source `description`
- Imported candidates support double-click auto-placement to their imported day/time
- Double-clicking a placed swimlane block opens a lightweight description editor modal that persists into block payload metadata
- Imported candidates remain recoverable: placing shows them in swimlanes, returning from swimlanes puts them back in imported candidates
- Uncommitted/imported block placed => queue `create` with day + derived interval (`start - end`)
- Uncommitted block removed => queue item removed
- Committed block removed from baseline => queue `delete`
- Committed block moved day/time => queue `update`
- Queue/log panel shows `queue ID`, `item ID`, `day`, and full interval (derived from placement start + extent)
- Queue/log feed is scrollable and renders newest queue entries first
- Committed block restored => queue item removed

Committed baseline now tracks day + start time (and optional extent baseline metadata).

## Parallel/overlap handling in this POC

- Multiple blocks are allowed at the same time in the same day lane.
- Overlapping intervals are grouped deterministically and rendered side-by-side (split width by concurrent count).
- Side-by-side left/right ordering is stable by block identity and does not swap when one block is resized.
- This is a lightweight calendar-style packing strategy intended for predictable visual clarity.




## Weekend visibility toggle

- Top-level **Hide weekends** toggle filters Saturday/Sunday columns in the board view only.
- Weekend placements are preserved in state (no deletion or mutation when hidden).
- If hidden weekends still contain non-committed/imported blocks, the board shows a warning indicator.

## Seeded demo data (auto-loaded on startup)

The mock inbound source now seeds representative demo data so the board is immediately usable:

- **Imported candidates (blue):**
  - Outlook meeting: Wednesday 08:30-09:30
  - Azure task work: Tuesday 13:00-15:00
  - Scrum/tool-derived work item: Thursday 10:00-11:30
  - Includes imported placement metadata (`importedDayKey`, `importedStartTime`, `importedEndTime`) and imported `description` payload for auto-placement + editing flow validation.
- **PSP templates (purple):**
  - PSP-1001 Internal project work
  - PSP-2003 Customer follow-up
  - PSP-3007 Support / incident handling
  - Templates are reusable in candidates, default to 30 minutes, and render as label-only before placement.
- **Changed committed entries (red semantics):**
  - Not seeded at startup.
  - This section appears only after real committed entries are changed through board interactions.

## Foundation runtime ownership in this repo

The POC now calls foundation runtime APIs directly:

- `BLOCK_ENGINE_FOUNDATION` (`@strandsbjerg/block-engine-foundation`):
  - `normalizeBlockExtent`
  - `instantiateBlockFromSource`
  - `resizePlacement`
  - `createPlacementSnapshot`
  - `changeBlockState`
  - `changeBlockExtent`
- `ASYNC_INTEGRATION_FOUNDATION` (`@strandsbjerg/async-integration-foundation`):
  - `createQueueId`
  - `createQueueItemId`
  - `buildQueueItem`

Application ownership remains in the POC for scheduling semantics, candidate semantics, queue intent decisioning, overlap rendering, and UI interactions.

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

## Architecture map

- `src/core/domain`: framework-neutral entities + deterministic time rules
- `src/core/application`: command operations + read projections
- `src/integration`: inbound adapter boundary + queue handoff placeholder
- `src/ui` + `src/app`: React adapter (DnD + edge-drag resize intent + rendering)


## Color semantics

- Candidate palette colors:
  - imported candidate: blue
  - PSP template: purple
- Swimlane (placed) colors:
  - yellow: committed block still matching committed baseline (same day + start + tracked extent)
  - red: changed/uncommitted placement (moved/resized/unscheduled or non-baseline)

Interval display rules:
- Swimlanes: show interval text (`HH:mm - HH:mm`)
- Imported candidates: show imported interval
- Template candidates: show PSP label only (no interval before placement)
