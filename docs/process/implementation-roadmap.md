# Implementation Roadmap

## Completed in this iteration

- Reduced dependency surface to required runtime/test/build packages only.
- Added reproducible setup script (`npm run setup`) and Node version guard (`engines`, `.nvmrc`).
- Simplified application wiring by removing pass-through wrapper modules.
- Stabilized lane ordering after move/return operations.
- Sharpened docs for raw state vs view vs draft vs queue-ready projections.
- Added a runtime verification checklist and status document for install/test/build/dev execution.
- Introduced a lightweight Activity Graph domain extension (`Activity`, `ActivityInstance`) and activity-to-block mapping.

## Next recommended steps

1. Re-run full runtime verification in an environment with npm registry access.
2. Enrich Activity/ActivityInstance with project/PSP context fields.
3. Implement real inbound API adapter that emits Activity Graph data.
4. Add queue-item contract mapping for async foundation.
5. Add SAP outbound payload contract adapter.
6. Add UI-level test coverage for drag/drop interactions.
