# Repository Code Review and Analysis (2026-04-01)

## Scope and method

This review covered architecture docs, core domain/application logic, integration boundaries, React UI adapters/components, and test layout. The analysis was based on static code inspection plus attempted runtime verification.

### Commands run

- `rg --files`
- `npm test` (failed due to missing local dev dependency installation)
- `npm ci` (failed: no lockfile present)
- `npm install` (failed with 403 for private scoped dependency)

## High-level assessment

The repository demonstrates a clear domain-centric structure and good separation between board semantics, queue projection, and UI rendering. The implementation is generally readable and intentionally defensive around external foundation package behavior.

The most important risks are integration completeness and operational reliability (dependency installability, swallowed runtime failures, and static default context data).

## Strengths

1. **Clear modular boundaries** between domain/application/integration/ui layers make this codebase approachable and maintainable.
2. **Queue intent projection is deterministic** and tied to placement state transitions in one place (`board-rules.ts`).
3. **Time model consistency** (planning window, slot size, interval derivation) is centralized in core utilities.
4. **Solid test surface in core areas** (`tests/core/*`) and adapter coverage (`tests/ui/dnd-adapter.test.ts`).
5. **Architecture/process documentation is unusually complete** for a POC and aligns with implementation layout.

## Key findings

### 1) Integration handoff is incomplete and currently mismatched with queue semantics (High)

- Queue projection explicitly creates `create` / `update` / `delete` intents via `QueueItem.operation`.
- The async handoff path (`toQueueReadyEntries`) currently hard-codes every outbound entry as `create` and still has a TODO for real queue contract integration.

**Impact:** If wired as-is, non-create operations can be misrepresented during handoff.

**Recommendation:** Refactor handoff input from `TimeEntryDraft[]` to projected queue items (or include operation explicitly in draft contract), and preserve operation end-to-end.

### 2) Default time-registration context is anchored to a fixed week start date (Medium)

- `createDefaultTimeRegistrationUserContext()` uses a static `weekStartDate: '2026-03-30'`.

**Impact:** Date derivation can drift from real usage week, yielding payload dates that are incorrect after demo week.

**Recommendation:** Compute week start dynamically (or require explicit context injection from app state/session) and keep static value only in demo seed paths.

### 3) Runtime error swallowing reduces observability (Medium)

- Multiple `try/catch` blocks ignore errors without telemetry (`catch { ...fallback... }`) in board rules/service and DnD parsing.

**Impact:** Integration regressions in foundation packages can silently degrade behavior and be hard to diagnose.

**Recommendation:** Keep fallback behavior but add lightweight diagnostics (at least development-mode warnings with context keys).

### 4) Debug logging path is baked into runtime with hardcoded IDs (Low)

- `DEBUG_SEEDED_CHANGED_COMMITTED_IDS` and related `console.info` diagnostics are committed in application flow.

**Impact:** Potential console noise / leaked internal debugging assumptions in non-local environments.

**Recommendation:** Gate debug output behind explicit env flag and remove hardcoded IDs from default runtime path.

### 5) Project bootstrap reliability issue: `npm run setup` cannot currently succeed in a clean clone (High)

- `package.json` defines `setup` as `npm ci`, but no `package-lock.json` exists.
- Direct `npm install` failed in this environment because required scoped packages are not publicly accessible.

**Impact:** New contributors/CI cannot bootstrap deterministically without additional undocumented registry access steps.

**Recommendation:**
- Commit lockfile and document private registry/token requirements; or
- Provide an OSS-compatible fallback mode/mock package strategy for local onboarding.

## Testing and verification status

Because private dependencies could not be installed in this environment, runtime tests/build could not be executed here. Static review found strong test intent but cannot certify current runtime health.

## Suggested prioritized next steps

1. Finish queue handoff contract integration so operation semantics are preserved (`create|update|delete`).
2. Replace fixed default week start with dynamic/contextual logic.
3. Add non-intrusive diagnostics around fallback `catch` paths.
4. Fix onboarding/install path (`package-lock.json` + registry setup docs).
5. Optionally add a CI "public-only" smoke lane for docs/static checks when private packages are unavailable.

## Out-of-scope observations

- The `PlaceholderApiBlockSource` intentionally returns `[]`; this appears to be a known phase boundary rather than a defect.
- Visual/UX behavior was not browser-validated in this run.
