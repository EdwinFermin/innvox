# Implementation — query-error-feedback

Surface React Query fetch errors with an inline, retryable `<ErrorState>` across the
reference pages and dashboard widgets. The prerequisites (`error-boundaries` →
`ErrorState`, `friendly-error-messages` → `mapError`) are both `done` and consumed as-is;
no hook signature, no React Query retry config, and no new dependency was touched.

## Files changed

| File | Change |
| --- | --- |
| `src/app/dashboard/payables/page.tsx` | Imported `ErrorState` (`mapError` was already imported). Destructured `isError`, `error`, `refetch` from `usePayables`. Wrapped `div.dashboard-table-frame` in `{isError ? <ErrorState …/> : (…table…)}`. (T1, T2) |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Imported `ErrorState` + `mapError`. Destructured `isError`/`error`/`refetch` from `useBranches`, `useIncomes`, `useExpenses`. Derived `isError`, `firstError`, `retryAll`. Replaced the "Movimientos del día" `Card` with `<ErrorState>` on error. (T3, T4) |
| `src/components/dashboard/dashboard-hero.tsx` | Imported `ErrorState` + `mapError`. Destructured error fields from all 5 hooks. Derived combined `isError`/`firstError`/`retryAll`. Added an `isError` guard **before** the `isLoading` guard, returning `<ErrorState>` inside the same outer gradient `<Card>` used for the skeleton. (T5, T6) |
| `src/components/dashboard/section-cards.tsx` | Imported `ErrorState` + `mapError`. Destructured error fields from all 5 hooks. Derived combined error. Added an `isError` guard before the `isLoading` guard, returning a single `<ErrorState>` in place of the 4-card grid. (T7, T8) |
| `src/components/dashboard/chart-area-interactive.tsx` | Imported `ErrorState` + `mapError`. Destructured error fields from `useInvoices`/`useIncomes`/`useExpenses`. Derived combined error. Added an `isError` guard before the loading guard, returning `<ErrorState>` inside the existing outer chart `<Card>`. (T9, T10) |
| `src/components/dashboard/business-widgets.tsx` | Imported `ErrorState` + `mapError`. Destructured error fields from all 8 hooks. Derived combined error. Added an `isError` guard before the `isLoading` guard, returning `<div className="grid grid-cols-1 gap-4"><ErrorState …/></div>`. (T11, T12) |
| `specs/query-error-feedback/tasks.md` | Checked off T1–T12, T24–T27; annotated the Tests section (no unit runner). |

No hook files were modified; all 9 hooks (`usePayables`, `useBranches`, `useIncomes`,
`useExpenses`, `useReceivables`, `useBankAccounts`, `useInvoices`, `useClients`,
`useOperatingCostAlerts`) spread `...queryResult` from `useQuery`, so `isError`, `error`,
and `refetch` are already exposed at every call site. Verified by reading each hook source
before editing.

## Key design decisions

- **Combined-error derivation.** At each multi-hook site: `isError = a.isError || b.isError
  || …` (logical OR across the hooks in the spec's listed order); `firstError = aError ?? bError
  ?? …` (nullish coalescing picks the **first truthy** error in that order); `retryAll = () => {
  a.refetch(); b.refetch(); … }` calls **every** hook's `refetch` so a single click recovers all
  failed queries. To avoid name collisions where a widget already binds `incomesError`-style
  identifiers for the boolean flag, the *error value* bindings use the `…ErrorValue` suffix
  (e.g. `incomesError` = boolean flag, `incomesErrorValue` = the `error` object). On the cuadre
  page there was no such collision, so it follows the spec's literal `branchesError`/`incomesError`/
  `expensesError` value names.
- **Guard ordering (error before loading).** On every widget the `if (isError)` guard is placed
  **before** the `if (isLoading)` guard (per T6/T8/T10/T12). React Query only flips `isError` to
  `true` after exhausting its default retries, by which point `isLoading` is already `false`, so
  this ordering both (a) keeps the loading skeleton visible during the retry window (R13/R14) and
  (b) shows `ErrorState` only once the query has truly failed. The default retry config is
  untouched (R14/R15). The page-level files (payables, cuadre) keep the error check inline in JSX
  (the table region / movements card) rather than as an early `return`, so the surrounding chrome
  stays rendered.
- **Always through `mapError`, never `showHomeLink`.** Every `<ErrorState>` is fed
  `description={mapError(error|firstError)}` — never a raw `error.message` — so no raw DB/network
  string can reach the user (`docs/security.md` fail-closed; `mapError` collapses any raw-DB-origin
  text to a friendly Spanish string). `showHomeLink` is never passed at any of the 6 sites: these
  are inline regions, not route boundaries (R3/R6/R12).
- **`title` prop.** `ErrorState.title` is a **required** prop (`ErrorStateProps`), so omitting it —
  as the spec's illustrative JSX snippets do — would fail `tsc`. The requirements constrain only
  `description`, `onRetry`, and the absence of `showHomeLink`; they neither forbid nor specify
  `title`. I pass the established `"Algo salió mal"` used by the existing boundary surfaces
  (`src/app/dashboard/error.tsx`, `src/app/global-error.tsx`) for visual/voice consistency.
- **Chrome preservation.** Payables keeps `DashboardPageHeader` + search `Input` + columns
  `DropdownMenu` above the error region (R2). Cuadre keeps `DashboardPageHeader` + filter `Card` +
  `PrintContainer` (R5). `DashboardHero`/`ChartAreaInteractive` wrap `ErrorState` in the same outer
  `<Card>` (with its gradient classes and a `CardContent` padding wrapper) used for the skeleton
  (R8). `SectionCards` returns a bare `ErrorState` (replacing the 4-card grid) (R9).
  `BusinessWidgets` returns `<div className="grid grid-cols-1 gap-4"><ErrorState/></div>` (R11).

## Requirement → coverage table

> The project has **no unit runner** (`reins.config.json` → `test: null`); the spec's T13–T23
> unit tests cannot be authored/run without forbidden test infrastructure. Coverage below is by
> diff inspection plus a green `npx reins verify` (lint + typecheck + traceability). The
> "Covered by" column names the exact code site that satisfies each requirement.

| Req | Covered by (code site) |
| --- | --- |
| R1 | `payables/page.tsx`: `{isError ? <ErrorState description={mapError(error)} onRetry={refetch}/> : <div className="dashboard-table-frame">…</div>}` |
| R2 | `payables/page.tsx`: `DashboardPageHeader`, search `Input`, columns `DropdownMenu` all rendered unconditionally above the `{isError ? …}` region |
| R3 | `payables/page.tsx`: `<ErrorState>` call passes no `showHomeLink` |
| R4 | `cuadre/page.tsx`: `isError = isBranchesError||isIncomesError||isExpensesError`; `firstError = branchesError ?? incomesError ?? expensesError`; `retryAll` calls all three `refetch`; movements `Card` replaced by `<ErrorState description={mapError(firstError)} onRetry={retryAll}/>` |
| R5 | `cuadre/page.tsx`: `DashboardPageHeader`, filter `Card`, `PrintContainer` rendered unconditionally |
| R6 | `cuadre/page.tsx`: `<ErrorState>` passes no `showHomeLink` |
| R7 | `dashboard-hero.tsx`: combined `isError` over the 5 hooks; `firstError` nullish-chain; `retryAll` calls all 5 `refetch`; `<ErrorState>` returned in place of card content |
| R8 | `dashboard-hero.tsx`: error branch returns the same outer gradient `<Card>` (+ `CardContent`) used by the loading branch |
| R9 | `section-cards.tsx`: error branch returns a single `<ErrorState>` (replacing the 4-card grid) |
| R10 | `chart-area-interactive.tsx`: combined `isError` over 3 hooks; error branch returns `<ErrorState>` inside the outer chart `<Card>` |
| R11 | `business-widgets.tsx`: combined `isError` over 8 hooks; error branch returns `<div className="grid grid-cols-1 gap-4"><ErrorState/></div>` |
| R12 | All 4 widget `<ErrorState>` calls pass no `showHomeLink` |
| R13 | All 6 sites: the `isLoading` skeleton/loading branch is unchanged and still reached when `isLoading && !isError`; error guard placed before the loading guard so loading is not pre-empted while `isError` is false |
| R14 | No hook or React Query retry config modified; error branch keyed on `isError` only (flips true after default retries exhausted) |
| R15 | `onRetry` is wired to `refetch` (payables) or `retryAll` (every other site), which calls each hook's unmodified `refetch()`; no hook param added |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope
- **Scope:** the diff touches exactly the 6 files named in the spec's "Files to touch" plus the
  spec's own `tasks.md`. No drive-by refactors, renames, or formatting churn; the only edits are
  added imports, expanded destructuring, derived `isError`/`firstError`/`retryAll`, and the
  `ErrorState` branches. No hook, no shared module, no public signature changed.
- **Reversibility:** purely additive UI branches — no public signature, route, serialized format,
  or on-disk state changed, so no migration/flag/down-path is required. Reverting is a clean diff
  removal.
- **Proof proportional to reach:** the change is contained to presentational error branches; the
  `mapError`/`ErrorState` units it depends on are already covered by their own (done) features.
  Coverage here is diff inspection + green verify, proportional to the contained blast radius.

### Readability — can the next cold agent recover the why
- The non-obvious decisions carry their **why** in comments at the code site: each combined-error
  derivation notes "first truthy error in the spec's listed hook order"; each error guard carries
  "Error wins over loading: React Query marks isError only after all retries, so by then isLoading
  is already false (R13/R14)". The `…ErrorValue` naming rationale and the required-`title`
  rationale are captured above in **Key design decisions**.
- Names match behavior: `isError` (boolean flag) vs `firstError` (the error object) vs `retryAll`
  (the multi-refetch handler) are unambiguous. No dead code, no commented-out blocks, no vestigial
  params introduced.

### Reliability — right answer for in-contract inputs
- `firstError` uses `??` (nullish), so it selects the **first non-null/undefined** error in the
  spec's hook order — the exact "first truthy error" the requirements demand — and is stable
  regardless of how many hooks fail. `isError` uses `||`, true iff **any** listed hook errored.
- The error branch only renders when `isError` is true, and `isLoading` only renders otherwise, so
  the three states (error / loading / data) are mutually exclusive and ordered (error → loading →
  data); the loading path (R13) is provably still reachable. `mapError` is total and never throws
  (it has a top-level try/catch fallback), so `description` is always a safe string even for a
  `null`/`undefined`/garbage error value.

### Resilience — fails safe when the world breaks
- This feature **is** the resilience surface: it converts an external failure (a failed Supabase
  fetch surfaced by React Query's `isError`) into a safe, recoverable UI state instead of a blank
  region or a thrown render. No new external call, handle, lock, or multi-step on-disk write is
  introduced, so there is nothing to leak or leave half-written. `retryAll` is idempotent — calling
  every `refetch()` again simply re-issues the queries; React Query dedupes/handles in-flight
  state, and a partially-recovered set (some queries now succeed, others still fail) re-derives
  `isError`/`firstError` correctly on the next render.
- **No raw leak (security-adjacent robustness):** every `description` is funneled through
  `mapError`, never a raw `error.message`; `mapError` is fail-closed and collapses any raw-DB-origin
  text to a friendly Spanish string, so no internal/DB detail reaches the user even on an
  unrecognized error shape.

## Final verify output

```
npm run typecheck  → exit 0  (tsc --noEmit, no errors)
npm run lint       → exit 0  (eslint, no errors)

npx reins verify --changed → PASS
  ✓ lint          npm run lint  5.1s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.9s
  ✓ design        17 advisory slop tell(s)  49ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  3ms
  ✓ traceability  every requirement maps to a task  4ms
  Result: PASS
```

Design scan: all advisory `backdrop-blur` glassmorphism tells are on **pre-existing** dashboard
chrome lines (populated data cards) not authored by this diff; the inserted `ErrorState` regions
add **zero** new slop tells (`ErrorState` is the design-system primitive, reused as-is with real
Spanish copy and `motion-safe:`-gated motion).

## Post-review fixes

All three reviewers approved (APPROVED + SECURITY_OK + DESIGN_OK, no blocks). Two follow-ups
applied before close, diff kept minimal (other advisories left as recorded):

- **Fix 1 (correctness).** `src/app/dashboard/reports/cuadre-del-dia/page.tsx`: the pre-existing
  "Sin sucursales" EmptyState guard `!isLoading && !branches.length` did not exclude the error
  case, so on a `useBranches` error (`branches.length === 0`, `!isLoading`) it rendered **alongside**
  the new `ErrorState`. Added `&& !isError` (the same combined `isError` derived for this feature) →
  guard is now `!isLoading && !isError && !branches.length`. Precedence verified by inspection: on
  branches-error only the `ErrorState` shows; the plain empty case (no branches, no error) still
  shows "Sin sucursales".
- **Fix 2 (visible polish).** `src/components/dashboard/dashboard-hero.tsx`: the `ErrorState` inside
  the dark-gradient `Card` showed a double border (Card border + ErrorState's own border/shadow).
  Added `className="border-0 shadow-none"` to that `ErrorState` call. Confirmed `ErrorState`
  forwards `className` into its root `cn(...)` (`src/components/ui/error-state.tsx:49-53`), so the
  override lands on the root surface.

Re-verified after fixes: `npm run typecheck` exit 0, `npm run lint` exit 0,
`npx reins verify` → PASS (lint ✓, security ✓, design 21 advisory tells / no block, feature-list ✓,
traceability ✓). The full-tree design advisory count (21) is higher than the earlier `--changed`
run (17) only because the full run scans every UI file, not the changed subset; all advisories are
pre-existing `backdrop-blur` glassmorphism on dashboard chrome — **none** introduced by this diff.
The chart-area duplicated className and section-cards padding advisories were intentionally left
untouched per the review instruction.

## Handoff

Implementation complete, reviewed (3x approved), post-review fixes applied and re-verified. **Not**
marking the feature `done` myself — the leader closes it out. On confirmation the summary moves
into `progress/history.md`.
