# Future Queue Integration Plan

## Current implemented simulation

The current phase projects queue items from time-aware placements:

- one queue (`planning-queue`)
- status `paused`
- operations `create` / `update` / `delete`
- queue item stores a POC-owned `TimeRegistrationPayload` (user/context IDs, date, action, optional SAP-relevant references, and block traceability fields) plus explicit routing hints

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

`Block(state, extent) + Placement(day, start) + UserContext -> TimeRegistrationPayload -> generic queue item -> SAP mapper`

## Payload ownership and SAP mapping split

- `TimeRegistrationPayload` is owned by this POC and remains SAP-agnostic in naming.
- Canonical payload now carries semantic time classification fields (`taskType`, `taskComponent`, optional `activityType`, `billingControlCategory`, `overtimeCategory`) before SAP mapping.
- When block/domain metadata does not provide a classification, the POC applies an explicit default `taskComponent = "NORMAL"` so outbound payloads remain semantically explicit.
- Queue stores payload as opaque solution data; `ASYNC_INTEGRATION_FOUNDATION` stays generic.
- SAP OData field names are introduced only in `integration/sap/sap-time-entry-mapper.ts`.
- `action` (`create`/`update`/`delete`) maps to SAP `TimeSheetOperation` (`C`/`U`/`D`) in mapper layer.

## Forward compatibility

Extent changes are not yet emitted as distinct queue semantics in this POC, but the model already supports introducing that behavior without schema redesign.


## Future source/template expansion

- Imported blocks can later be materialized from Outlook calendar, Azure records, or SCRUM/task signals while keeping the same `state=imported` core contract.
- Template blocks can later represent curated/default PSP libraries while keeping reusable candidate palette behavior.
- Queue/log interval remains derived from placement start time plus block extent.


## Identifier and interval guarantees

- Queue and queue-item IDs are real deterministic unique identifiers (not display labels).
- Queue interval display is always derived from placement start time + block extent.
- Imported candidates already model source metadata and can later map 1:1 from Outlook/Azure/SCRUM payloads.

## Compatibility notes for changed committed entries and description payload

- A committed entry moved away from its baseline (including removal to unplanned candidate area) remains a queue change candidate until restored exactly to baseline.
- Restoring the exact baseline placement clears the queued change projection deterministically.
- Description is now part of block payload metadata. Current queue projection remains placement-focused, but payload enrichment keeps future outbound inclusion straightforward.


## Direct foundation queue ownership

- Queue IDs now come from `createQueueId` in `ASYNC_INTEGRATION_FOUNDATION`.
- Queue item IDs now come from `createQueueItemId` in `ASYNC_INTEGRATION_FOUNDATION`.
- Queue item payload is solution-specific (time registration) and passed as opaque payload to `buildQueueItem` in `ASYNC_INTEGRATION_FOUNDATION`.
- Planning intent (`create`/`update`/`delete`) still originates in the POC from board/baseline semantics.


## Outbound pre-submit validation boundary (POC)

A dedicated final gate now runs immediately before the simulated SAP send path:

- `prepareCommitRecordForSubmission(record)` in `src/core/application/commit-submission.ts` is the single outbound entry point.
- It validates each mapped `WorkforceTimesheetRequest` entry and returns explicit issues when records are not send-ready.
- Validation currently checks required identity/date fields, action/operation shape, task component, action-dependent hours/accounting target rules, update/delete `TimeSheetRecord`, and basic request structure completeness.
- If validation passes, the same `CommitRecord.entries` used by Commit Preview are returned unchanged for submission handoff (single source path, no remap).
- The UI `Send to SAP` action now blocks simulated send when validation fails and surfaces issue lists per commit record.

This boundary is the final controlled gate before any future real SAP POST implementation.
