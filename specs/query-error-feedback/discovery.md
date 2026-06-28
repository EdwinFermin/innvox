# Discovery — query-error-feedback

## Request

Surface React Query failures in the UI with a retry affordance, reusing `ErrorState` (from `error-boundaries`) and `mapError` (from `friendly-error-messages`), so failed fetches stop showing blank/stuck screens. Scope: reference pages.

## Findings

- **Query errors are silently swallowed today.** Pages destructure only `isLoading`/`data`, never `isError`/`error`/`refetch`:
  - `src/app/dashboard/payables/page.tsx:231` → `const { data: payables, isLoading } = usePayables(...)`. On failure the table just renders empty.
  - `src/hooks/use-payables.ts` spreads the full `useQuery` result (so `isError`, `error`, `refetch` are already available — no hook change needed). Same idiom in `use-incomes`, `use-expenses`, `use-branches`, `use-daily-close-report`.
  - `src/lib/react-query.ts` has no global error handling and default retry (3×) — fine to keep.
- **Cuadre page aggregates several queries** (`src/app/dashboard/reports/cuadre-del-dia/page.tsx`): `useBranches`, `useIncomes`, `useExpenses`, `useBankAccounts`, `useDailyCloseReport`. It computes `isLoading = isBranchesLoading || isIncomesLoading || isExpensesLoading` (line 143) but no combined `isError`. A combined error + retry-all is the natural pattern.
- **Dashboard home is fragmented.** `src/components/dashboard/home-content.tsx` renders independent self-fetching widgets (`DashboardHero`, `SectionCards`, `ChartAreaInteractive`, `BusinessWidgets`), each with its own query. There is no single data region; per-widget error handling would touch many components. It also gates on a `mounted` flag (a separate loading concern).
- Dependencies ready: `ErrorState` (`src/components/ui/error-state.tsx`, supports `onRetry`) and `mapError` (`src/lib/error-messages.ts`).

## Affected areas

- `src/app/dashboard/payables/page.tsx` — read `isError`/`error`/`refetch`; render `ErrorState` in the data region.
- `src/app/dashboard/reports/cuadre-del-dia/page.tsx` — combined `isError` + retry-all; render `ErrorState` in the movements region.
- Hooks unchanged (they already expose the full query result). Possibly expose `refetch`/`isError` from `useDailyCloseReport` if it wraps/renames fields.

## Approaches considered

- **Option A — Page-level error region, retry via `refetch`.** When `isError`, replace the table/movements region (keep page header + filters visible so the user can retry or change params) with `<ErrorState description={mapError(error)} onRetry={refetch} />`. For cuadre, combine the queries' `isError` and a single retry that refetches all. *Leaning toward this.*
- **Option B — Whole-page replacement.** Simpler but hides the header/filters; worse UX and inconsistent with keeping context. Rejected.
- **Dashboard home** — defer to a follow-up (per-widget error states), or include a minimal version now. Open question below.

Leaning toward: **Option A**, scoped to payables + cuadre.

## Open questions ← a human must answer these

1. **Dashboard home scope:** Include it now (wire `ErrorState` into each major widget's query — more files), or scope this feature to **payables + cuadre** and handle dashboard widgets in the later app-wide rollout?
2. **Error region placement:** Confirm keeping the page header + filters visible and replacing only the table/movements region with `ErrorState` (vs. replacing the whole page body)?
3. **Cuadre granularity:** One combined `ErrorState` when *any* of the cuadre queries fail (retry refetches all) — acceptable, rather than per-query messages?

## Assumptions

- Retry uses React Query's `refetch`; the existing default retry (3×) stays.
- `ErrorState` description text comes from `mapError(error)`.
- No hook signature changes beyond surfacing already-present fields; no new dependencies.

## Resolution ← filled in after the human answers

- Q1 (dashboard home) → **Include it.** Wire `ErrorState` into each major home widget's query (`DashboardHero`, `SectionCards`, `ChartAreaInteractive`, `BusinessWidgets` under `src/components/dashboard/`). Each widget shows its own contained error+retry within its card region (not a single page-wide error).
- Q2 (placement) → **Keep header + filters visible.** Replace only the table/movements/widget data region with `ErrorState`; page header and filters stay rendered so the user can retry or change params.
- Q3 (cuadre granularity) → **Combined** `ErrorState` when any cuadre query fails; the retry refetches all of them.
- Decision: **Option A**, applied to **payables, cuadre-del-dia, and dashboard home widgets**. Use `<ErrorState description={mapError(error)} onRetry={refetch} />` (no `showHomeLink` inside in-page regions). Hooks already expose `isError`/`error`/`refetch`; surface them where renamed. No new dependencies.
