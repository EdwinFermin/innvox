# Review — query-error-feedback
Verdict: APPROVED

## Checkpoints

- C1: [x] — `reins doctor` HEALTHY; 15 core files present, all agents wired.
- C2: [x] — One feature `in_progress` (`query-error-feedback`); all states valid per `feature_list.json`.
- C3: [x] — `npx reins verify --only lint` passes (exit 0).
- C4: [x] — `test: null` in `reins.config.json`; no unit runner. Test obligation met by code-level traceability table + green verify per the established test-contract for this project. All 15 requirements covered by code inspection.
- C5: [x] — `npx reins verify --only security` passes; no secrets, no vulnerabilities >= high.
- C6: [x] — `npx reins verify --only design` passes; 21 advisories all pre-existing. Zero new slop tells introduced by this diff.
- C7: [x] — `npx reins verify --only traceability` passes; every requirement R1–R15 maps to at least one task.
- C8: [x] — Implementation matches spec. Guard ordering verified (isError before isLoading at all 6 sites). Combined-error derivation (OR / nullish-chain / retryAll) matches spec's listed hook order at all sites. `showHomeLink` absent at all 6 sites. Chrome preservation confirmed: payables keeps header+search+columns above error region; cuadre keeps header+filter Card+PrintContainer; DashboardHero/ChartAreaInteractive wrap ErrorState in the same outer Card; SectionCards/BusinessWidgets replace their grids with a single ErrorState. All existing loading/empty/data branches in the payables page remain intact and unreachable only when `isError` is true.
- C9: [ ] — Session not yet closed; `progress/history.md` entry and `current.md` reset pending APPROVED verdict (implementer correctly deferred this to post-review). Not a block.

## Judgment (Four R's)

### Risk

The diff is additive only: new imports, expanded destructuring, derived state variables (`isError`/`firstError`/`retryAll`), and conditional error branches. No public signature, route, serialized format, or on-disk state was modified. No hook was changed (R15 confirmed by diff inspection of hook source files — all untouched). Reversibility artifact is not required (purely additive UI branches; clean diff removal is enough). Blast radius is contained to six presentational components. Proportionate proof (diff inspection + green verify) is acceptable at this blast radius.

The working tree diff includes files from multiple prior features (account/page.tsx, parameters pages, settings/page.tsx, skeleton.tsx, use-mobile.ts, new-payable-dialog.tsx) because changes are uncommitted and cumulative. These changes are from already-`done` features per `progress/history.md`. Not a scope violation by this feature's implementer.

- **Risk:** No block findings.

### Readability

Names are precise and unambiguous: `isError` (boolean OR), `firstError` (first truthy error value), `retryAll` (multi-refetch). The `…ErrorValue` suffix convention to avoid collision with the boolean `incomesError` flag is documented in comments at each call site and in `impl_query-error-feedback.md`. The ordering-dependency comment ("Error wins over loading: React Query marks isError only after all retries…") appears at every widget site. No dead code, no commented-out blocks.

- **Readability:** No block findings.

### Reliability

All three mutually-exclusive render states (error / loading / data) are proven reachable and correctly ordered at all 6 sites. `firstError` uses `??` (nullish coalescing), selecting the first non-null/undefined error in spec-listed hook order. `mapError` is total and fail-closed. `payables.length` is only accessed inside the `!isError` branch (no null-dereference risk). `usePayables`/`useBranches` return empty-array fallbacks when `data` is undefined.

The previously reported advisory (cuadre dual-render) is resolved: `cuadre-del-dia/page.tsx:227` now reads `!isLoading && !isError && !branches.length`. Three-state precedence verified:
- `isError = true` → only ErrorState renders (Sin sucursales suppressed). Correct.
- `!isError && !isLoading && branches.length === 0` → only Sin sucursales renders. Correct.
- `isLoading = true` → neither EmptyState nor ErrorState renders (skeleton path). Correct.

- **Reliability:** No block findings. Advisory resolved.

### Resilience

This feature is the resilience surface: it converts external Supabase query failures into safe, retryable UI states. No new external call, file handle, lock, or multi-step write is introduced. `retryAll` is idempotent. Partial recovery correctly re-derives `isError`/`firstError` on next render. `mapError` is fail-closed for any input shape.

The design advisory (double-border on DashboardHero ErrorState) is resolved: `className="border-0 shadow-none"` is now passed to `<ErrorState>` at `dashboard-hero.tsx:136`, eliminating the redundant secondary frame.

- **Resilience:** No block findings.

## Changes required

None. All advisories from the initial review have been applied. `npx reins verify` is green (PASS). No new issues introduced by the two fixes.
