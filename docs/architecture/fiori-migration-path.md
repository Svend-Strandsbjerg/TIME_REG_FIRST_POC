# Fiori / SAPUI5 Migration Path

## What is reusable 1:1

- `src/core/domain/*`
- `src/core/application/*`
- inbound integration interfaces
- draft and queue-ready projection logic

## What is React-specific

- `src/ui/components/*`
- `src/ui/adapters/dnd-adapter.ts`
- `src/styles.css`

## Concrete SAPUI5 usage example

Pseudo flow in a SAPUI5 controller:

1. Fetch candidates from inbound adapter.
2. `state = createBoardWeek(candidates)`
3. On DnD drop in lane: `state = placeBlockOnLane(state, blockId, laneId)`
4. `view = buildPlanningView(state)` and bind to `JSONModel`.
5. For export preview: `drafts = convertPlacedBlockToTimeEntryDraft(state)`.

## Principle

SAPUI5 replaces only presentation adapter concerns. Business movement rules and projections remain unchanged.
