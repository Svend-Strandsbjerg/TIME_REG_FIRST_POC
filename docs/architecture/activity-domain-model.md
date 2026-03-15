# Activity Domain Model

The Activity Graph is a lightweight context layer above the current block model.

## Core concepts

- `Activity`: contextual origin (calendar, manual, AI, favorite, project-task)
- `ActivityInstance`: a concrete suggested occurrence with duration
- `TimeBlock`: movable planning unit generated from an activity instance

## Why this layer exists

Time registrations are often contextual and recurring. The graph captures where a block came from, enabling:

- origin tracking
- future AI enrichment
- better PSP suggestion pipelines
- grouped planning scenarios

## Current implementation level

Phase-1 introduces domain types and deterministic ActivityInstance -> TimeBlock generation with metadata links.
