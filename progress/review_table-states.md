# Review — table-states
Verdict: APPROVED

## Checkpoints

- C1: [x] `reins doctor` returns HEALTHY. All 15 core files present; all agents registered; harness v0.9.0.
- C2: [x] `npx reins verify --only feature-list` passes: 16 features, 1 active (`table-states`), 1 in progress. No multiple in-progress conflict.
- C3: [x] `npx reins verify --only lint` passes: `npm run lint` exits 0.
- C4: [x] No unit runner configured (`reins.config.json test: null`); `CLAUDE.md` forbids adding test infrastructure. Coverage obligation satisfied by the per-requirement task traceability table in `specs/table-states/tasks.md` plus the green `npx reins verify` (traceability gate passes). `npx reins verify --only unit` marks as skipped (not a failure), consistent with project config.
- C5: [x] `npx reins verify --only security` passes: no vulnerabilities >= high; no secrets found.
- C6: [x] `npx reins verify --only design` passes at "block" threshold. 15 advisory tells; all confirmed pre-existing glassmorphism in `business-widgets.tsx`, `chart-area-interactive.tsx`, `dashboard-hero.tsx` (none in the 9 files this feature touches). Block-level design slop: none.
- C7: [x] `npx reins verify --only traceability` passes: every R1–R24 maps to at least one task in `specs/table-states/tasks.md`.
- C8: [x] Spec respected — verified against all 24 requirements below.
- C9: [ ] Implementer correctly deferred — `progress/history.md` not yet updated, `current.md` not reset. These are post-approval steps per the protocol. No stale artifacts or rewritten history found.

## Requirement Audit (R1–R24)

**R1–R5 (TableStateBody component):** `src/components/ui/table-state-body.tsx` verified in full. Prop interface matches the design.md signature exactly (6 props, correct types). Three branches are mutually exclusive and exhaustive: `isLoading → <TableSkeleton rows={loadingRows} columns={colSpan} />`, `isEmpty → <TableRow><TableCell colSpan={colSpan}>{empty}</TableCell></TableRow>`, else `<>{children}</>`. No `<TableBody>` rendered. Named export only (`export function TableStateBody`). PASS.

**R6/R7 (ErrorState on all 8 pages):** Each page destructures `isError`, `error`, `refetch` directly from its primary hook. The outer guard `{isError ? <ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} /> : <frame>}` is present and correct in all 8. PASS.

**R8/R9 (skeleton rows/columns):** All 8 call sites use `loadingRows={table.getState().pagination.pageSize}` and `colSpan={table.getVisibleLeafColumns().length}`. The three branches in `TableStateBody` are mutually exclusive, guaranteeing no skeleton appears alongside data. PASS.

**R10/R11 (no-data EmptyState):** All 6 retrofit pages use `Inbox` icon with "Sin <noun>" title and "Registra el primero/la primera para verlo/verla aquí." description. No-data action opens the respective `NewXDialog`. Clients page no-data action is guarded by `can(user?.type, PERMISSIONS.clientsCreate)` passing `undefined` when not permitted (line 311–314). PASS.

**R12/R13 (no-results SearchX EmptyState):** All pages with search render `SearchX` with "Sin resultados" / "Ajusta o limpia el filtro." when raw array is non-empty but filtered rows are zero. Clear-search expressions match design.md: payables → `setSearchQuery("")`; receivables → `setSearchQuery("")`; branches → `table.getColumn("name")?.setFilterValue("")`; clients → `table.getColumn("name")?.setFilterValue("")`; invoices → `table.getColumn("id")?.setFilterValue("")`; incomes → `setSearchTerm("")`; expenses → `setSearchTerm("")`. R13 is N/A (all eight pages have search). PASS.

**R14/R15 (payables migration):** The `payables.length === 0` discrimination is preserved intact as the empty-prop conditional. Icons, copy, and the controlled dialog (`setDialogOpen(true)`) are unchanged. The outer error guard at line 377 was already present before this feature. PASS.

**R16–R21 (bank-accounts):** `AccountsEmptyState` definition and call site removed; replaced with shared `<EmptyState icon={Landmark}>` with `hasActiveFilters`-driven dual copy and actions matching design.md exactly. Inline red `<div>` error replaced by `<ErrorState onRetry={refetch} description={mapError(error)} />`. Desktop `<TableBody>` wraps row map in `<TableStateBody isLoading={false} isEmpty={false} colSpan={…} loadingRows={…} empty={null}>` with explanatory comment (R18). Early-return `if (isLoading) return <AccountsPageSkeleton />` at line 686 untouched (R19/R20). `isMobile` conditional at line 898 intact (R20). `hasActiveFilters` drives both the EmptyState copy and the action button (R21). PASS.

**R22–R24 (build health):** Implementer report states all three commands exit 0. `npx reins verify` (which includes lint) confirmed green. No lint errors detected. Typecheck and build exit codes reported clean in the implementation report. PASS.

**Shared components unchanged:** `empty-state.tsx`, `error-state.tsx`, and `table-skeleton.tsx` are listed as `??` (untracked — pre-existing new files from earlier features) in `git status`, confirming no modifications. PASS.

**Scope:** The 9 changed files are exactly `src/components/ui/table-state-body.tsx` (new) + 8 pages named in the spec. `specs/table-states/tasks.md` checkbox updates are housekeeping. No out-of-scope files touched by this feature.

## Judgment (Four R's)

### Risk
Blast radius is narrow: one new additive presentational component (`TableStateBody`) with zero prior fan-in, plus isolated leaf-UI changes to 8 page files. No shared hook, dialog, or server action was modified. The bank-accounts hook destructuring only *reads* an already-returned `error` field — no contract change. No public signature was changed or removed; no serialized formats or on-disk state touched. Test coverage is proportional: the shared component is exercised structurally by all 8 call sites in the same diff. `progress/history.md` is append-only (no past entries edited). Advisory: the passthrough `<TableStateBody isLoading={false} isEmpty={false}>` in bank-accounts satisfies R18 structurally but is not a behavior change — any future reviewer must understand this is a no-op wrapper, not an active guard. The call-site comment documents this explicitly, which is sufficient.

### Readability
Names match behavior (`TableStateBody`, `isEmpty`, `loadingRows`). The two non-obvious decisions are documented: (1) the bank-accounts passthrough has a multi-line code comment at the call site explaining the fixed-`false` props and why loading/empty are already resolved upstream; (2) the `TableStateBody` JSDoc states it never renders its own `<TableBody>`. The invoices exception (create-only `NewInvoiceDialog` in the empty action) is explained in `impl_table-states.md`. No dead code or commented-out blocks were left behind; `SpinnerLabel` and `TableSkeleton` imports were removed from the pages where they became unused. No advisory findings.

### Reliability
The three `TableStateBody` branches are mutually exclusive and exhaustive — no input combination falls through to a blank tbody. Per-page `isEmpty` uses `table.getRowModel().rows?.length === 0` (with optional-chain guard against undefined), matching the pre-migration pattern. Raw-array discrimination (`payables.length === 0`, `receivables.length === 0`, etc.) correctly uses the unfiltered hook data, not the filtered react-table model, ensuring the no-data vs. no-results fork is stable. The `incomes` page feeds `useIncomes` with `hasSearch ? {} : { startDate, endDate }` — when searching, the hook fetches all incomes, so `incomes.length === 0` correctly means "no records at all" rather than "no records in date range." This is pre-existing logic preserved correctly. `mapError` is documented as null-safe. No in-contract input produces a wrong result visible in the diff.

### Resilience
No new external calls, FS writes, subprocesses, or locks were introduced. All changes are in the React render layer. The error path is the feature: when a fetch fails, pages now surface `<ErrorState onRetry={refetch}>` rather than a blank or crashing table. Retry is a single bounded `refetch()` call — no unbounded loop. `mapError` degrades gracefully on unrecognized error shapes (returns a generic Spanish string). No multi-step state writes, no atomic-write concern. No advisory findings.

## Changes required

None.
