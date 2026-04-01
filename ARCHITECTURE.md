# Architecture Overview: Timesheet Planning App

## Layers

### Core domain (`src/core/domain`)

Owns framework-neutral model and rules:

- `TimeBlock` with abstract `state` and `extentMinutes`
- time-aware `PlacedBlock` (`laneId`, `startTime`)
- committed baseline snapshot (`laneId`, `startTime`, optional baseline extent)
- deterministic slot/time arithmetic for 06:00-18:00 window (30-minute grid)
- queue projection rules derived from state + placement deltas
- block payload metadata (including editable `description`)

### Application (`src/core/application`)

Owns use cases and projections:

- Commands: create week, place/move by day+time, return to pool, resize from top/bottom edges
- Projections: planner view, queue view, daily totals, time-entry drafts
- Derived data: `endTime` from `startTime + extentMinutes`

### UI adapter (`src/ui`, `src/app`)

Owns interaction intent only:

- drag/drop captures target lane + slot start time
- edge-drag resize intent (top vs bottom + snapped slot delta)
- rendering of candidate color (`template` purple, `imported` blue, changed committed red) and placed color from baseline comparison (`red` changed vs `yellow` baseline match) + time-position + extent-based height
- imported-candidate double-click interaction for auto-placement
- placed-block double-click opens description editor modal
- side-by-side overlap layout rendering based on core-provided schedule intervals

No queue decision logic or domain math is implemented directly in UI.

### Integration (`src/integration`)

Owns adapter boundaries and placeholder mappers.

## State / extent / placement separation

- `state` controls lifecycle semantics (`template`, `imported`, `uncommitted`, `committed`)
- `extentMinutes` controls duration footprint
- `placement` controls day + start-time schedule position

This separation is key for portability and future queue payload evolution.

## Queue simulation strategy

- One deterministic queue ID (`queue-<hash>`, status `paused`)
- Items carry a solution payload (time-registration fields) plus explicit routing metadata
- Operations: `create`/`update`/`delete`
- Extent changes are already represented in state, enabling future queue payload inclusion without changing the model shape
- Extent changes for committed items are meaningful queue deltas when baseline extent metadata exists

## Overlap policy (POC)

The planner allows concurrent placements. Core projections annotate each placed card with deterministic overlap-group layout metadata (`layoutColumn`, `layoutColumnCount`), and UI renders parallel blocks side-by-side.


## Template spawn behavior

- `template` candidates stay in the unplanned list permanently as a reusable palette source.
- Dragging a template into a lane creates a new block instance with `state=uncommitted`.
- Spawned blocks keep template provenance metadata (`templateSourceBlockId`, `templatePspElement`).


## Identifier strategy

- Queue IDs are deterministic identifiers generated from a stable scope hash (`createQueueId`).
- Queue item IDs are deterministic identifiers generated from queue ID + explicit seed values from the POC.
- Labels/titles remain human-readable fields and are not used as IDs.


## Committed baseline comparison

- Placed committed blocks are yellow only when they exactly match committed baseline (`laneId`, `startTime`, and optional baseline extent).
- Any move/resize/removal makes them red (changed).
- Returning exactly to baseline deterministically restores yellow state and clears queue change projection.

## Candidate recoverability

- Imported source candidates are recoverable: removing from swimlane re-exposes the imported candidate.
- Committed blocks removed from swimlanes remain visible as red changed candidates (unplanned lane projection).
- Template candidates are perpetual sources and spawn real uncommitted planning entries.

## Foundation ownership boundaries (direct runtime integration)

- `src/core/application/board-service.ts` directly imports `BLOCK_ENGINE_FOUNDATION` runtime APIs for block normalization, template-source instantiation, block state transitions, and placement snapshot creation.
- `src/core/domain/board-rules.ts` directly imports `BLOCK_ENGINE_FOUNDATION` resize/extent APIs and `ASYNC_INTEGRATION_FOUNDATION` queue identity/item-construction APIs.
- The POC keeps planning intent (create/update/delete decisioning), day/time placement semantics, candidate semantics, overlap rendering, and UI behavior.
- Foundations own canonical block/queue mechanics and identities used by runtime state projection.

## SAP Workforce Timesheet inbound read flow

- SAP-specific read logic is isolated to `src/integration/sap/workforce-timesheet-read.ts`.
- Period reads accept a typed POC contract (`startDate`, `endDate`, `userExternalId`, `companyCode`) using canonical `YYYY-MM-DD` dates.
- SAP OData filter serialization (including inclusive period semantics via `ge` start + `lt` next-day boundary) is centralized in one helper (`buildWorkforceTimesheetPeriodFilter`).
- SAP response parsing supports OData V2 (`d.results`) and OData V4 (`value`) wrappers and normalizes entries into a POC-owned canonical inbound model (`TimeRegistrationCommittedEntry`).
- Board-facing mapping is kept in the POC integration layer (`src/integration/inbound/workforce-timesheet-inbound.ts`), which preserves `TimeSheetRecord`, status, predecessor, and typed numeric fields in metadata for future update/delete flows.
