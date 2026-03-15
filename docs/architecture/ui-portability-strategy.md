# UI Portability Strategy

## Principle

Frontend implementations are adapters. Business behavior lives in domain/application layers.

## Kept portable by design

- Raw state shape: `BoardState`
- Command API: place/move/return/reorder operations
- Read projections: planning view + time-entry drafts

## Current React adapter

- Converts browser DnD events into command calls
- Renders `WeeklyBoardView`
- Never owns movement rules internally

## Future adapter contract

Any new UI (SAPUI5/Fiori, React Native, internal frontend) only needs to:

1. keep a local `BoardState`
2. call the same command functions
3. render the same read projections

No adapter should include queue dispatch logic.
