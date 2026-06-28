# Implementation — table-states

> Feature: `table-states` — Standardize loading/empty/error across the eight
> dashboard list pages with a shared `<TableStateBody>` body-layer wrapper.
> Implemented strictly to the approved spec in `specs/table-states/`.

## Summary

Added one new presentational helper, `<TableStateBody>`, that lives inside each
page's `<TableBody>` and owns exactly three branches — loading skeleton, colSpan
empty row, passthrough children. Migrated the payables reference page onto it
(no visual regression), retrofitted six list pages (receivables, branches,
clients, invoices, incomes, expenses) with a filter-aware dual `<EmptyState>`
plus an outer `<ErrorState>` guard, and aligned bank-accounts (the highest-risk
page) without touching its mobile/desktop split or filter logic. No hook changes,
no toolbar/search/filter behavior changes. The three pre-existing shared
components (`empty-state.tsx`, `error-state.tsx`, `table-skeleton.tsx`) are
reused verbatim and untouched.

## Files changed

| File | Task | Requirements | Change |
| --- | --- | --- | --- |
| `src/components/ui/table-state-body.tsx` | T1 | R1–R5 | **New.** `TableStateBody` named export; three branches (loading → `<TableSkeleton>`, isEmpty → colSpan `<TableRow>/<TableCell>`, else → children). Renders body rows only, never its own `<TableBody>`. |
| `src/app/dashboard/payables/page.tsx` | T2 | R1–R3, R8, R14, R15 | Replaced the inline `isLoading ? <TableSkeleton> : rows ? <rows> : <dual empty>` conditional with `<TableStateBody>`; preserved `payables.length === 0` discrimination; dropped now-unused `TableSkeleton` import. Outer error guard left as-is. **Post-review copy alignment:** no-results description changed from "Ajusta la búsqueda o limpia el filtro." to the canonical "Ajusta o limpia el filtro." (design.md:208) so the reference page matches the other seven. |
| `src/app/dashboard/receivables/page.tsx` | T3 | R6–R8, R10–R12 | Destructured `isError`/`error`/`refetch`; added outer `<ErrorState>` guard; replaced `SpinnerLabel` row + plain-text empty with `<TableStateBody>` + dual `<EmptyState>`; swapped `SpinnerLabel` import for `EmptyState`/`ErrorState`/`TableStateBody`/`mapError`. |
| `src/app/dashboard/branches/page.tsx` | T4 | R6–R8, R10–R12 | Same retrofit; no-results action clears the `name` column filter. |
| `src/app/dashboard/clients/page.tsx` | T5 | R6–R8, R10–R12 | Same retrofit; no-data action `<NewClientDialog />` guarded by `can(user?.type, PERMISSIONS.clientsCreate)`; no-results clears the `name` column filter. |
| `src/app/dashboard/invoices/page.tsx` | T6 | R6–R8, R10–R12 | Same retrofit; discrimination by unfiltered `invoices.length === 0`; no-results clears the `id` column filter. |
| `src/app/dashboard/transactions/incomes/page.tsx` | T7 | R6–R8, R10–R12 | Same retrofit; discrimination by `incomes.length === 0`; no-results calls `setSearchTerm("")`. |
| `src/app/dashboard/transactions/expenses/page.tsx` | T8 | R6–R8, R10–R12 | Same retrofit; discrimination by `expenses.length === 0`; no-results calls `setSearchTerm("")`. |
| `src/app/dashboard/bank-accounts/page.tsx` | T9 | R16–R21 | Removed bespoke `AccountsEmptyState`; call site now renders shared `<EmptyState icon={Landmark}>` with the filter-aware copy/actions; inline red error `<div>` → `<ErrorState onRetry={refetch} description={mapError(error)} />`; added `error` to hook destructuring; desktop `<TableBody>` wraps its row map in a passthrough `<TableStateBody isLoading={false} isEmpty={false}>` (R18). Mobile branch, early-return skeleton, and `hasActiveFilters` logic untouched. |
| `specs/table-states/tasks.md` | — | — | Checked off T1–T10. |

## Key decisions

### TableStateBody contract (T1)
- Props match the design.md signature exactly: `isLoading`, `isEmpty`, `colSpan`,
  `loadingRows`, `empty`, `children`. Returns `JSX.Element`. Imports `TableRow`/
  `TableCell` from `@/components/ui/table` and `TableSkeleton` from
  `@/components/ui/table-skeleton`. Named export only; no `<TableBody>` of its own
  (R5) — the caller owns the surrounding `<TableBody>`.

### Per-page `isEmpty` and discrimination
- **`isEmpty` is the same expression on every page:** `table.getRowModel().rows?.length === 0`.
  This is the exact negation of the pre-migration `table.getRowModel().rows?.length ? <rows> : <empty>`
  branch, so the visible empty-vs-rows behavior is unchanged (R9, R14).
- **No-data vs no-results discrimination (passed as the `empty` prop):** uses the
  **raw, unfiltered hook array length**, because the react-table instance is fed
  the *filtered* data on every page:
  - payables → `payables.length === 0` (preserved from the reference, R15)
  - receivables → `receivables.length === 0`
  - branches → `branches.length === 0` (table data is the raw `branches`; search is a `name` column filter)
  - clients → `clients.length === 0` (table data is the raw `clients`; search is a `name` column filter)
  - invoices → `invoices.length === 0` (the **unfiltered hook** array, not `filteredInvoices`)
  - incomes → `incomes.length === 0`
  - expenses → `expenses.length === 0`
  - bank-accounts → handled at the Card level via `hasActiveFilters` (unchanged), not via `TableStateBody`
- **Clear-search calls (no-results action):**
  - payables / receivables → `setSearchQuery("")`
  - incomes / expenses → `setSearchTerm("")`
  - branches → `table.getColumn("name")?.setFilterValue("")`
  - clients → `table.getColumn("name")?.setFilterValue("")`
  - invoices → `table.getColumn("id")?.setFilterValue("")`
  - bank-accounts → `resetFilters()` (existing callback, unchanged)

### Empty-state action wiring (reuse existing dialogs)
- `NewReceivableDialog`, `NewBranchDialog`, `NewClientDialog`, `NewIncomeDialog`,
  `NewExpenseDialog`, and `NewBankAccountDialog` each render **their own trigger
  button** and own their internal `open` state, so the no-data action simply
  renders `<NewXDialog />` (matching the spec's "action opens NewXDialog" and the
  bank-accounts `action: <NewBankAccountDialog />` mapping). No dialog API was
  changed — staying inside scope (no hook/dialog changes).
- **invoices exception:** `NewInvoiceDialog` requires an `onSuccess` prop and is
  also used in edit/print mode at the header. The empty-state action renders a
  **create-only** `<NewInvoiceDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })} />`.
  The header's print-on-create path keys off `invoices.find(...)`, which is moot
  when the table is empty; invalidating the query refreshes the list after the
  first create. This avoids splitting the header dialog's edit/print state into a
  second instance.
- **payables** keeps its pre-existing **controlled** dialog (`dialogOpen`/
  `setDialogOpen`) and the in-table `<Button onClick={() => setDialogOpen(true)}>` —
  unchanged from the reference, so no visual/behavioral regression (R14).

### bank-accounts passthrough rationale (R18)
The desktop `<TableBody>` only ever renders when (a) `isLoading` is false (an
`if (isLoading) return <AccountsPageSkeleton />` early return guards it), (b)
`isError` is false, and (c) `table.getRowModel().rows.length !== 0` — all
resolved at the Card level *above* the table. So at that point the data is always
present and non-empty. Wrapping the row map in `<TableStateBody isLoading={false}
isEmpty={false} empty={null}>` is a **structural passthrough**: it satisfies the
R18 body-layer contract consistently with the other seven pages while changing
zero behavior. A code comment at the call site records this so a cold reader does
not mistake the fixed-`false` props for a bug. The mobile card grid (R19), the
mobile/desktop `isMobile` split (R20), and the `hasActiveFilters`/`hasFilters`
discrimination (R21) are all untouched.

### bank-accounts EmptyState action mapping (R16)
The old `AccountsEmptyState` rendered `<NewBankAccountDialog />` in *both* states
(always) plus a "Limpiar filtros" button when filtered. The shared `<EmptyState>`
takes a single `action`, so per the design.md copy table the action is now
state-specific: filtered → `<Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>`;
no-filters → `<NewBankAccountDialog />`. The Landmark icon and both title/description
strings are preserved verbatim.

## Requirement → coverage table

> No unit runner exists (`reins.config.json` `test: null`), so coverage is by the
> structural location of each branch in the diff plus a green `npx reins verify`
> (lint + security + design slop scan), `npm run typecheck`, and `npm run build`.

| Req | Covered by (file:location) |
| --- | --- |
| R1 — TableStateBody renders skeleton when isLoading | `table-state-body.tsx` — `if (isLoading) return <TableSkeleton rows={loadingRows} columns={colSpan} />` |
| R2 — empty colSpan row when isEmpty | `table-state-body.tsx` — `if (isEmpty) return <TableRow><TableCell colSpan={colSpan}>{empty}</TableCell></TableRow>` |
| R3 — children otherwise | `table-state-body.tsx` — `return <>{children}</>` |
| R4 — prop contract | `table-state-body.tsx` `TableStateBodyProps` (all six props typed); verified by `npm run typecheck` |
| R5 — lives inside `<TableBody>`, renders no own `<TableBody>` | `table-state-body.tsx` (no `<TableBody>` in output) + every call site wraps it in `<TableBody>` |
| R6 — `<ErrorState>` on all 8 pages | payables:377, receivables (outer guard), branches, clients, invoices, incomes, expenses (outer guard), bank-accounts (`isError ? <ErrorState … />`) |
| R7 — retry calls refetch | every `<ErrorState … onRetry={refetch} />` (8 pages) |
| R8 — skeleton rows=pageSize, columns=visible leaf count | every `<TableStateBody loadingRows={table.getState().pagination.pageSize} colSpan={table.getVisibleLeafColumns().length}>` |
| R9 — skeleton replaced by rows/empty after load | `TableStateBody` branch order: loading precedes empty precedes children; mutually exclusive |
| R10 — no-data `Inbox` EmptyState | receivables/branches/clients/invoices/incomes/expenses `empty` prop, `<rawArray>.length === 0` arm; bank-accounts `Landmark` no-filters arm |
| R11 — no-data action opens create dialog | each no-data arm renders `<NewXDialog />` (or guarded for clients); bank-accounts `<NewBankAccountDialog />` |
| R12 — no-results `SearchX` EmptyState | each `empty` prop else arm; bank-accounts `Landmark` filtered arm with `resetFilters` |
| R13 — pages without search → no no-results variant | N/A (all eight pages have a text search) |
| R14 — payables no visual regression | `payables/page.tsx` — same icons/copy/actions/discrimination; only the tbody conditional shape moved into `<TableStateBody>` |
| R15 — payables discrimination preserved | `payables/page.tsx` — `payables.length === 0` arm intact in the `empty` prop |
| R16 — bank-accounts `AccountsEmptyState` replaced | `bank-accounts/page.tsx` — component definition removed; call site renders shared `<EmptyState icon={Landmark}>` |
| R17 — bank-accounts error replaced | `bank-accounts/page.tsx` — inline red `<div>` → `<ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} />` |
| R18 — bank-accounts desktop TableBody uses TableStateBody | `bank-accounts/page.tsx` desktop `<TableBody>` — passthrough `<TableStateBody isLoading={false} isEmpty={false}>` wrapping the row map |
| R19 — mobile card grid unchanged | `bank-accounts/page.tsx` `isMobile` branch — no diff to the card grid |
| R20 — mobile/desktop split preserved | `bank-accounts/page.tsx` — `isError ? … : empty ? … : isMobile ? <cards> : <table>` chain intact |
| R21 — filter-aware empty preserved | `bank-accounts/page.tsx` — `hasActiveFilters` still drives title/description/action |
| R22 — lint passes | `npm run lint` exit 0 |
| R23 — typecheck passes | `npm run typecheck` exit 0 |
| R24 — build passes | `npm run build` exit 0 |

## Self-review (Four R's)

### Risk — *blast radius + reversibility*
- Diff stayed inside scope: one new presentational component plus exactly the
  eight pages named in design.md, plus the spec's `tasks.md` checkboxes. No
  drive-by refactors, renames, or formatting churn; untouched code was not
  reformatted. Confirmed `git diff --stat` shows only those 8 pages, and the three
  protected components (`empty-state.tsx`, `error-state.tsx`, `table-skeleton.tsx`)
  show **no diff**.
- **No public-signature change.** `TableStateBody` is a brand-new export (additive,
  zero fan-in to break). No dialog/hook API was modified. The bank-accounts hook
  destructuring only **added** `error` to an existing `useBankAccounts` spread — a
  read of an already-returned field, not a contract change.
- Coverage is proportional to blast radius: the highest-reach artifact is the
  shared component, which is structurally exercised by all eight call sites in the
  same diff; the per-page edits are leaf UI. `progress/history.md` left untouched
  (append-only).

### Readability — *recover the why*
- The two non-obvious decisions carry their *why* at the source: the bank-accounts
  passthrough has a call-site comment explaining the fixed-`false` props; the
  TableStateBody doc-comment states it renders body rows only and never its own
  `<TableBody>`. The invoices create-only-dialog and the per-page discrimination
  choices are recorded above.
- Names match behavior (`TableStateBody`, `isEmpty`, `loadingRows`). `isEmpty` is
  the same expression everywhere, so a reader learns the pattern once. No dead code,
  no commented-out blocks, no vestigial params; removed the now-unused
  `SpinnerLabel`/`TableSkeleton` imports (lint-verified clean).

### Reliability — *right answer for in-contract inputs*
- The three `TableStateBody` branches are **mutually exclusive and exhaustive** for
  the no-rows space: loading → skeleton; not-loading + zero rows → the `empty`
  node; otherwise → children. No input falls through to a blank tbody.
- Per-page no-data vs no-results partitions exhaustively: raw hook array empty →
  `Inbox` create state; raw array non-empty but filtered to zero rows → `SearchX`
  clear state. The clear-search/clear-filter action restores the full list
  deterministically (`setSearchQuery("")` / `setSearchTerm("")` / `setFilterValue("")`).
- Loading skeleton dimensions are derived from live table state
  (`pagination.pageSize`, `getVisibleLeafColumns().length`), so the skeleton always
  matches the rendered column count and page size — no hardcoded off-by-one.
- bank-accounts: `error` is now in scope, so `mapError(error)` receives the actual
  thrown value instead of `undefined`; `mapError` is null-safe by contract
  (returns the generic fallback for unrecognized inputs).

### Resilience — *fails safe when the world breaks*
- No new external calls, FS, locks, subprocesses, or on-disk state — every change
  is React render-layer. The error path is the *feature*: when a fetch fails
  (`isError`), each page now renders `<ErrorState onRetry={refetch}>` instead of a
  blank/half-rendered table, and the retry is a bounded single `refetch()` call
  (no unbounded loop).
- `mapError` is fail-closed and never throws (per its own contract), so a garbage
  error shape degrades to a safe generic Spanish string rather than leaking DB
  internals or crashing the boundary.
- The entry motion lives entirely in the reused shared components, all behind the
  `motion-safe:` variant — a `prefers-reduced-motion: reduce` environment renders
  statically. No JS animation that could strand the UI mid-state if interrupted.

## Final verify output

```
$ npm run lint
> eslint
(clean)

$ npm run typecheck
> tsc --noEmit
(clean)

$ npm run build
> next build
✓ Compiled successfully — all dashboard routes built
  (/dashboard/payables, /receivables, /branches, /clients, /invoices,
   /transactions/incomes, /transactions/expenses, /bank-accounts)

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  16.8s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.9s
  ✓ design        12 advisory slop tell(s)  75ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  6ms
  ✓ traceability  every requirement maps to a task  7ms

Result: PASS
```

> All 12 design advisories are pre-existing glassmorphism tells in
> `src/components/dashboard/{business-widgets,chart-area-interactive,dashboard-hero}.tsx`
> — **none** originate from the eight pages or the new component touched by this
> feature (confirmed via `npx reins verify --only design --changed --json`).

## Post-review follow-up

Both reviewers approved. One spec-alignment fix applied after review: the payables
no-results `EmptyState` description was changed from "Ajusta la búsqueda o limpia
el filtro." to the canonical "Ajusta o limpia el filtro." (design.md:208), so the
reference page now matches the other seven pages verbatim. One-string diff,
re-verified clean:

```
$ npm run lint        → exit 0 (clean)
$ npm run typecheck   → exit 0 (clean)
```

The other design advisory raised in review — adding `aria-busy` to the loading
skeleton — is intentionally out of scope for this feature and was not touched.

## Handoff

Not marking `done`. Requesting the reviewer. After `APPROVED`, set `table-states`
to `done` and move this summary into `progress/history.md`.
