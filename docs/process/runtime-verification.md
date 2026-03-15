# Runtime Verification Status

## Goal

Validate that the app runs in a normal Vite/React/TypeScript workflow:

1. `npm install`
2. `npm run test`
3. `npm run build`
4. `npm run dev`

## Status in this environment

Verification is currently blocked by package registry access policy (`403 Forbidden` on npm package download), so dependencies cannot be installed here.

## Commands attempted

- `npm install`
- `npm run test`
- `npm run build`
- `npm run dev`

All failed due to missing installed packages caused by the registry restriction.

## What must be verified in a normal environment

Once npm registry access is available:

- Dependencies install successfully.
- Vitest suite passes.
- Production build succeeds.
- Dev server starts and UI can be exercised for drag/drop flows.

## Functional checklist for local validation

- pool -> lane drop works and block remains visible.
- lane -> lane move works and ordering stays stable.
- lane -> pool return works.
- duration scaling remains visually meaningful.
- planning view and draft/queue projections update with placements.
