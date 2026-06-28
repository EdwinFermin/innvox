# Review — dashboard-focus
Verdict: APPROVED

## Checkpoints

- C1: [x] `reins doctor` reports HEALTHY — harness files, agent definitions, and docs all present.
- C2: [x] Exactly one feature `in_progress` (`dashboard-focus`); all states valid. `npx reins verify --only feature-list` passes.
- C3: [x] `npx reins verify --only lint` and `npm run lint` exit 0. `npm run typecheck` exits 0 (tsc --noEmit clean). No new errors or warnings.
- C4: [x] `reins.config.json` sets `test: null`; CLAUDE.md forbids adding test infrastructure. Unit gate skips (`∘`). Correctness is covered by: (a) typecheck gate confirming the discriminated `TrendResult` union is exhaustive, (b) grep confirming zero dead imports or removed symbols remain in src/, (c) the `computeTrend` discriminant whose three branches are verifiable by direct code inspection against the spec's finite case set, and (d) build passing clean. No test was weakened or deleted.
- C5: [x] `npx reins verify --only security` passes — 0 vulnerabilities >= high, no secrets found.
- C6: [x] `npx reins verify --only design` passes at block threshold — 15 advisory slop tells, zero block-severity. The 15 tells are pre-existing (gradient hero backgrounds, backdrop-blur cards, off-scale rem/px spacing values that predated this feature). The feature removed surfaces (SectionCards, Pendientes y alertas card) rather than adding new tells.
- C7: [x] `npx reins verify --only traceability` passes — every R1–R16 maps to at least one task in `tasks.md` traceability table.
- C8: [x] Implementation verified line-by-line against all 16 requirements (detail below). All satisfied.
- C9: [~] `progress/history.md` does not yet contain a `dashboard-focus` entry — expected at hand-off time; the leader closes the session after APPROVED. `current.md` shows "(none)" in-progress (stale vs. feature_list.json which correctly shows `in_progress`) — bookkeeping gap, not a correctness issue. Advisory.

## Specification verification (C8 detail)

### R1 — Cobros/pagos absent
`grep -n "Por cobrar|Por pagar|Pendiente neto|Presion operativa|Cobros|Pagos|receivable|payable"` returns zero results in both `dashboard-hero.tsx` and `business-widgets.tsx`. No cobros/pagos labels, hook calls, or derived totals remain in any touched file. PASS.

### R2 — KPIs once in hero, no SectionCards row
`section-cards.tsx` is deleted (D in git status). `home-content.tsx` diff confirms the `SectionCards` import and `<SectionCards />` JSX are both removed. The hero's `sm:grid-cols-3` grid is the sole KPI surface. PASS.

### R3 — Facturación del mes sourced from useInvoices + getTimestampMonthKey
`dashboard-hero.tsx:15` imports `useInvoices`; line 89 calls it. `totals.facturacionMes` at line 118–122 aggregates via `getTimestampMonthKey(invoice.created_at) === currentMonthKey` — identical util and field to the deleted `section-cards.tsx`. PASS.

### R4 — computeTrend: signed % when previous > 0
`dashboard-hero.tsx:34–38`: `previous > 0` → `Number((((actual - previous) / previous) * 100).toFixed(1))`. Matches the spec formula exactly. Sign prefix at line 53: `value > 0 ? "+" : ""`. PASS.

### R5 — computeTrend: "Nuevo" when previous === 0 && actual > 0
`dashboard-hero.tsx:40–41`: after the `previous > 0` guard fails, `actual > 0` → `{ kind: "new" }`. `TrendBadge` line 53 renders the literal string "Nuevo". PASS.

### R6 — No badge when both 0
`dashboard-hero.tsx:43`: fallthrough returns `{ kind: "none" }`. `TrendBadge` line 47–49 returns `null` for `kind === "none"` — no DOM element emitted. PASS.

### R7 — Ingresos and Gastos no badge
`dashboard-hero.tsx:243–256`: the Ingresos and Gastos boxes contain no `TrendBadge` invocation. Confirmed by grep: `TrendBadge` appears only at lines 228 (Flujo neto pill) and 236 (Facturación del mes). PASS.

### R8 — SectionCards file deleted
`git status` confirms `D src/components/dashboard/section-cards.tsx`. `grep -rn "section-cards|SectionCards" src/` returns zero results. PASS.

### R9 — BusinessWidgets shows only Actividad reciente and Pulso operativo por sucursal
`business-widgets.tsx` JSX (lines 219–351) contains exactly two `<Card>` elements: "Actividad reciente" (line 221) and "Pulso operativo por sucursal" (line 281). No "Pendientes y alertas" card or cobros/pagos amounts present. PASS.

### R10 — OperatingCostAlertsBanner and ChartAreaInteractive untouched
`operating-cost-alerts-banner.tsx`: diff from HEAD is empty — file is unchanged. `chart-area-interactive.tsx`: has working-tree modifications but the conversation-start gitStatus snapshot (provided by the harness before this session) already shows it as `M` (modified) — the changes predate this feature session and were not made by the implementer. `home-content.tsx` diff confirms both components are included with unchanged props. PASS (pre-existing modifications to `chart-area-interactive.tsx` are out of scope).

### R11 — Home composition order
`home-content.tsx:24–30`: DashboardHero → OperatingCostAlertsBanner → `<div><ChartAreaInteractive /></div>` → BusinessWidgets. The `<div>` wrapper around ChartAreaInteractive is pre-existing (visible in the diff context lines). Order matches the spec. PASS.

### R12 — Hero hooks: drop useReceivables/usePayables, add useInvoices
`grep -n "useReceivables|usePayables" dashboard-hero.tsx` → zero results. `grep -n "useInvoices"` → lines 15 (import) and 89 (call). PASS.

### R13 — BusinessWidgets drops useReceivables, usePayables, useOperatingCostAlerts
`grep -n "useReceivables|usePayables|useOperatingCostAlerts|getDaysUntil|parseDateOnly|Badge|isPendingStatus" business-widgets.tsx` → zero results. All removed symbols confirmed absent. PASS.

### R14 — DashboardKpiCardsSkeleton removed
`dashboard-loading.tsx` contains no `DashboardKpiCardsSkeleton` definition or call. `DashboardHomeLoading` (line 50–61) renders only `DashboardChartSkeleton` and `DashboardWidgetsSkeleton`. `grep -rn "DashboardKpiCardsSkeleton" src/` → zero results. PASS.

### R15 — Hero loading state covers new hook set
`dashboard-hero.tsx:158–163`: `isLoading = !userId || bankAccountsLoading || incomesLoading || expensesLoading || invoicesLoading`. Loading branch at line 182–199 renders the inline skeleton. PASS.

### R16 — Hero error state covers new hook set
`dashboard-hero.tsx:140–144`: `isError = bankAccountsError || incomesError || expensesError || invoicesError`. Error branch at line 167–180 renders `ErrorState` with `mapError(firstError)` and `retryAll` refetching all four hooks. PASS.

## Judgment (Four R's)

### Risk
- Blast radius: `DashboardHero`, `BusinessWidgets`, `section-cards.tsx`, and `dashboard-loading.tsx` are leaf/page-level components consumed only by `home-content.tsx` (the dashboard home). The removed exports (`SectionCards`, `DashboardKpiCardsSkeleton`) have zero remaining callers — grep confirmed. The removed hook call-sites (`useReceivables`, `usePayables`, `useOperatingCostAlerts`) are dropped from two components only; the hook contracts themselves are unchanged. Blast radius is contained. [advisory]
- Reversibility: All changes are local component edits. No public API contract, route, serialized format, or database migration was touched. A `git revert` is sufficient to undo. No reversibility artifact required. [advisory]
- Scope fidelity: Diff is confined to the five files declared in `design.md`. The `tasks.md` and `feature_list.json` bookkeeping updates are the only additional changes. No drive-by refactors. `chart-area-interactive.tsx` modifications shown in `git diff` are pre-existing (confirmed by conversation-start gitStatus snapshot) and not part of this session. [advisory]
- Proportionality: High-traffic surface (dashboard home); no executable test runner in the project. The discriminated `computeTrend` union is compiler-enforced and statically exhaustive. Proportionate to the project's testing contract. [advisory]

### Readability
- Names match behavior: `computeTrend`, `TrendResult`, `TrendBadge`, `facturacionMes`, `facturacionPrev`, `prevNetFlow`, "Acciones rapidas". All self-describing. [advisory — no findings]
- Non-obvious arithmetic: `previousMonthKey` uses `currentMonth - 2` (month is 1-indexed, `Date` constructor month is 0-indexed — subtracting 2 gives the prior calendar month) with a comment at `dashboard-hero.tsx:93–94` and a rationale in `impl_dashboard-focus.md`. Adequate documentation. [advisory]
- The `computeTrend` branch semantics are documented above the type declaration at lines 25–27. Discriminant makes all three cases self-evident from the type signature. [advisory — no findings]
- No dead code: all removed symbols (getDaysUntil, parseDateOnly, isPendingStatus, Badge, DashboardKpiCardsSkeleton, receivablePending/payablePending memos) are deleted, not stubbed. Lint confirms no unused symbols. [advisory — no findings]

### Reliability
- `computeTrend` covers the three in-spec cases exhaustively. The TypeScript discriminated union enforces compiler completeness on the consumer side (`TrendBadge`). [advisory — no findings]
- Boundary: `previous < 0` (possible when `prevNetFlow` is negative) falls through to `{ kind: "none" }` — no badge shown. This case is not in the spec (R4–R6 define behavior only for `previous > 0` and `previous === 0`). The silent "no badge" fallthrough is a sensible default. Not a bug against any in-contract input the spec defines. [advisory]
- Empty-data path: `[].reduce(..., 0)` yields 0; `computeTrend(0, 0)` → `kind: "none"` → no badge. Correct per R6. [advisory — no findings]
- The Facturación figure reuses `getTimestampMonthKey` + `invoice.created_at` + `Number(amount || 0)` — identical to the deleted `section-cards.tsx`. Value continuity confirmed. [advisory — no findings]

### Resilience
- Components are purely presentational; no new file handles, DB calls, network calls, locks, or multi-step state writes are introduced. React Query (unchanged) owns the fetch lifecycle, retries, and error surfacing. [advisory — no findings]
- Error and loading guards are retained and re-pointed at the updated hook set. `retryAll` refetches all four hooks the populated hero depends on. No fault path was removed; no resource is acquired that can leak. [advisory — no findings]
- External shape guards: all values read through `Number(x || 0)` and hooks' `EMPTY` array fallbacks — partial or empty payloads degrade to 0, no throw possible. [advisory — no findings]

No block-severity findings under any R.

## Changes required

None.
