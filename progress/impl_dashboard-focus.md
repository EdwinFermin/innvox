# Implementation — dashboard-focus

## Summary

Simplified the dashboard home so month KPIs live in one place and the misleading "trend
badges" tell the truth. Deleted `section-cards.tsx` entirely and consolidated its
Facturación del mes metric into the hero's three-box KPI row (Facturación del mes / Ingresos /
Gastos), replacing the old fabricated-percentage badges with a discriminated `computeTrend`
helper that renders a **real** signed percentage only when there is a positive previous-month
baseline, "Nuevo" when the metric is brand-new this month, and **nothing** when both months are
zero. Removed every cobros/pagos surface from the home: the hero's "Presion operativa" +
Por cobrar/Por pagar panel (CTA buttons preserved in a slim "Acciones rapidas" card) and the
BusinessWidgets "Pendientes y alertas" sub-card, dropping the `useReceivables`, `usePayables`,
and `useOperatingCostAlerts` hook calls that fed only those removed blocks. `OperatingCostAlertsBanner`
and `ChartAreaInteractive` are untouched (R10); the four-block home order is now
DashboardHero → OperatingCostAlertsBanner → ChartAreaInteractive → BusinessWidgets (R11).

Scope stayed inside `src/components/dashboard/`. No new dependencies, no migrations, no changes
to hooks, types, or any file outside the five named in the design.

## Files changed

| File | Task | Requirement(s) | Change |
| --- | --- | --- | --- |
| `src/components/dashboard/section-cards.tsx` | T1 | R2, R8 | **Deleted entirely.** It was the second KPI surface duplicating the hero's data and the only call-site (besides loading) of `DashboardKpiCardsSkeleton`. |
| `src/components/dashboard/home-content.tsx` | T2 | R8, R11 | Removed the `SectionCards` import and its `<SectionCards />` JSX. Resulting render order is DashboardHero → OperatingCostAlertsBanner → ChartAreaInteractive → BusinessWidgets. |
| `src/components/dashboard/dashboard-hero.tsx` | T3–T8 | R1–R7, R12, R15, R16 | Added module-level `TrendResult` / `computeTrend` and a small `TrendBadge` renderer; added `previousMonthKey` (mirrors the deleted section-cards pattern); swapped `useReceivables`/`usePayables` for `useInvoices`; rewrote `totals` to add `facturacionMes`/`facturacionPrev`/`prevNetFlow` and drop `receivablePending`/`payablePending`; updated `isLoading`/`isError`/`firstError`/`retryAll` for the new hook set; replaced the three-box KPI row with Facturación del mes (trend badge) / Ingresos (no badge) / Gastos (no badge); added a trend badge to the Flujo neto pill; replaced the right-column "Presion operativa" + Por cobrar/Por pagar panel with a slim "Acciones rapidas" card that keeps the two CTA buttons. |
| `src/components/dashboard/business-widgets.tsx` | T9–T11 | R1, R9, R13 | Removed `useReceivables`/`usePayables`/`useOperatingCostAlerts` imports + calls, the `Badge` import, `isPendingStatus`, `getDaysUntil`, the `parseDateOnly` import, and the derived state feeding only the removed sub-card (`receivablesPending`, `payablesPending`, `receivablesPendingTotal`, `payablesPendingTotal`, `pendingOperatingCostAlerts`, `alerts`). Removed the "Pendientes y alertas" Card JSX and collapsed the two-column grid wrapper so "Actividad reciente" sits in the single-column outer grid. Updated `isError`/`firstError`/`retryAll`/`isLoading` to the remaining hooks (branches, clients, invoices, incomes, expenses). "Actividad reciente" and "Pulso operativo por sucursal" kept working. |
| `src/components/dashboard/dashboard-loading.tsx` | T12 | R14 | Removed the `DashboardKpiCardsSkeleton` export and its call inside `DashboardHomeLoading`; kept `DashboardHomeLoading`, `DashboardChartSkeleton`, `DashboardWidgetsSkeleton`. |
| `specs/dashboard-focus/tasks.md` | — | — | Checked off T1–T25 with verification notes. |

## Key design decisions

### Trend-badge logic — the heart of the feature (R4–R7)

The old `section-cards.tsx` `getVariation()` returned `0` when `previous === 0`, so a
brand-new metric showed a flat `+0%` — a fabricated, misleading badge. The fix is a
**discriminated union** so the three real cases are distinct and exhaustive:

```ts
type TrendResult =
  | { kind: "percent"; value: number }   // previous > 0  → signed % to 1 decimal
  | { kind: "new" }                      // previous === 0 && actual > 0
  | { kind: "none" };                    // previous === 0 && actual === 0
```

- `previous > 0` → `Number((((actual - previous) / previous) * 100).toFixed(1))` (R4).
- `previous === 0 && actual > 0` → `{ kind: "new" }`, rendered as the text "Nuevo" (R5).
- both `0` → `{ kind: "none" }`, and `TrendBadge` returns `null` so **no** element is emitted (R6).

`TrendBadge` is a tiny module-level component so the three branches render identically wherever
a trend appears, and the discriminant guarantees the compiler enforces all cases. The badge is
applied to **exactly two** metrics: Facturación del mes and the Flujo neto pill (R4–R6).
Ingresos and Gastos render with **no** `TrendBadge` at all (R7) — they are absolute current-month
figures with no variation indicator. The sign prefix is `value > 0 ? "+" : ""`, so `-5.0%`
keeps its native minus and `+12.4%` gets an explicit plus (matching the spec's examples).

### Facturación / previous-month sourcing (R3, R12)

Facturación is sourced from `useInvoices`, replacing the receivables/payables hooks the hero no
longer needs. The month aggregation mirrors the deleted `section-cards.tsx` exactly so values
match what users saw before:

- `currentMonthKey = getTodayDateKey().slice(0, 7)` — already present in the hero.
- `previousMonthKey` is computed with the same `new Date(currentYear, currentMonth - 2, 1)`
  trick used by section-cards (lines 88–91 of the deleted file), which correctly rolls a
  January current month back to the prior December.
- `facturacionMes` / `facturacionPrev` sum `Number(invoice.amount || 0)` over invoices whose
  `getTimestampMonthKey(inv.created_at)` equals the respective key — the same util and `created_at`
  field section-cards used, so the figure is identical.
- `prevNetFlow` is computed inline inside the same `totals` memo as `prevIncome - prevExpense`,
  using the existing `getDateOnlyMonthKey` over `incomes`/`expenses` filtered to `previousMonthKey`
  (the same fields the current-month `monthIncome`/`monthExpense` already use). This is the real
  prior-month net flow that the Flujo neto trend badge compares against.

The memo dependency array is `[bankAccounts, currentMonthKey, previousMonthKey, expenses, incomes,
invoices]` — `payables`/`receivables` removed, `invoices`/`previousMonthKey` added.

### Right-column restructure (R1)

The "Presion operativa" panel showed `payablePending` and the sub-grid showed Por cobrar/Por
pagar — all cobros/pagos data, all removed. The two CTA buttons (Registrar ingreso / Ver
cuentas) were inside that panel and had to survive, so I kept them in a slimmed card titled
"Acciones rapidas" with neutral copy and **no** financial data. The card reuses the existing
hero surface styling (same `rounded-[1.8rem] border-white/12 bg-white/10` treatment) so it does
not introduce a new look.

### BusinessWidgets grid collapse (R9)

The "Pendientes y alertas" card was the second child of the `xl:grid-cols-[1.05fr_0.95fr]`
two-column wrapper. With only "Actividad reciente" left in that wrapper, I removed the wrapper
`<div>` entirely so "Actividad reciente" becomes a direct child of the single-column outer
`grid grid-cols-1 gap-4` — a clean single-column layout with no orphaned half-width grid. The
"Actividad reciente" body was dedented one level to match. `getDaysUntil`/`parseDateOnly`/
`isPendingStatus` were exclusively used by the removed `alerts` memo and pending totals, so they
were removed; `Badge` was only used inside the removed alert list, so its import went too. The
`CircleAlert`, `ArrowDownLeft`, `ArrowUpRight` lucide icons stay (still used by the Pulso footer
and Actividad reciente).

### `DashboardKpiCardsSkeleton` removal (R14)

Its only two call-sites were `section-cards.tsx` (deleted) and `DashboardHomeLoading`. I removed
both the export definition and the call, so `DashboardHomeLoading` now renders just the chart +
widgets skeletons. `DashboardChartSkeleton` and `DashboardWidgetsSkeleton` are unchanged
(`DashboardWidgetsSkeleton` is still used by `business-widgets.tsx`).

## Requirement → coverage (no unit runner; verified by gates + inspection)

> `reins.config.json` sets `commands.test: null` (the `unit` check reports "no command
> configured") and `CLAUDE.md` forbids adding test infrastructure. Per `tasks.md`, the
> "Manual / unit" tasks are covered statically by the deterministic gates and code inspection of
> the discriminated `computeTrend`/`TrendBadge` branches. No `*.test.tsx` was added and no test
> was weakened or deleted.

| Req | Task(s) | Implemented in | Proven by |
| --- | --- | --- | --- |
| R1 — cobros/pagos absent from home | T8, T9, T10 | hero right column → "Acciones rapidas" (no data); BW "Pendientes y alertas" card + pending totals removed | `grep` shows no Por cobrar/Por pagar/Pendiente neto/Presion operativa/Cobros/Pagos labels in touched files; typecheck + lint + build |
| R2 — KPIs once in hero, no SectionCards | T1, T2, T7 | `section-cards.tsx` deleted; hero three-box row is the sole KPI surface | deletion in `git status`; build; code inspection |
| R3 — Facturación del mes in hero from `useInvoices` + `getTimestampMonthKey` | T4, T5, T7 | `useInvoices` call; `totals.facturacionMes`; first KPI box | typecheck + build; code inspection |
| R4 — signed % when previous > 0 | T3, T7 | `computeTrend` `kind: "percent"` branch; `TrendBadge` `${value>0?"+":""}${value}%` | typecheck + lint; discriminant inspection |
| R5 — "Nuevo" when previous === 0 && actual > 0 | T3, T7 | `computeTrend` `kind: "new"` branch; `TrendBadge` renders "Nuevo" | typecheck + lint; discriminant inspection |
| R6 — no badge when both 0 | T3, T7 | `computeTrend` `kind: "none"`; `TrendBadge` returns `null` | typecheck + lint; discriminant inspection |
| R7 — Ingresos/Gastos no badge | T7 | those two KPI boxes contain no `TrendBadge` | code inspection; build |
| R8 — SectionCards file deleted | T1, T2 | file removed; import removed from `home-content.tsx` | `D src/components/dashboard/section-cards.tsx` in `git status`; build |
| R9 — BW shows only Actividad + Pulso | T9, T10, T11 | "Pendientes y alertas" Card removed; grid collapsed | code inspection; build |
| R10 — banner + chart untouched | T2 | `home-content.tsx` keeps both with same props; no edits to those two files | `git log` shows both files last touched in a prior commit, not this session |
| R11 — home composition order | T2 | DashboardHero → OperatingCostAlertsBanner → ChartAreaInteractive → BusinessWidgets | code inspection of `home-content.tsx` |
| R12 — hero hooks: drop receivables/payables, add invoices | T4, T5 | `useInvoices` added; `useReceivables`/`usePayables` removed | typecheck + lint (unused-symbol clean); code inspection |
| R13 — BW drops receivables/payables/operatingCostAlerts | T9, T11 | all three hook imports + calls removed | typecheck + lint; code inspection |
| R14 — `DashboardKpiCardsSkeleton` removed | T12 | export + `DashboardHomeLoading` call removed | `grep` shows zero references in `src/`; typecheck + build |
| R15 — hero loading covers new hook set | T6 | `isLoading` gates on bankAccounts/incomes/expenses/invoices; loading branch retained | code inspection; build |
| R16 — hero error covers new hook set | T6 | `isError`/`firstError`/`retryAll` use the new hook set; error branch + retry retained | code inspection; build |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** the diff is confined to the five files named in `design.md` plus `tasks.md`
  bookkeeping. No drive-by refactors; the only non-trivial "formatting" change is the deliberate
  dedent of the "Actividad reciente" block after its grid wrapper was removed (a direct
  consequence of T10, not churn).
- **Blast radius:** `DashboardHero`, `BusinessWidgets`, and `SectionCards` are leaf components
  consumed only by `home-content.tsx` (the dashboard home). I grepped the fan-in of the **removed**
  exports: `SectionCards`, `section-cards`, and `DashboardKpiCardsSkeleton` have **zero** remaining
  references anywhere in `src/`. The removed hooks (`useReceivables`, etc.) are still exported and
  used by their own pages — I only dropped *call-sites* in two components, changing no hook
  contract.
- **Reversibility:** every change is a local component edit; no public signature, route, serialized
  format, or on-disk/migration state was changed, so no reversibility artifact is required. The
  deletion is a `git` revert away. `progress/history.md` is untouched (append-only respected).
- **Proportionality:** the home is a high-traffic surface, but this is a UI-composition change with
  no executable test runner in the project; correctness is proven by the deterministic gates
  (lint, typecheck, build, design slop scan, traceability) plus inspection of the exhaustive
  `computeTrend` discriminant.

### Readability — recoverable intent for the next cold agent
- Names match behavior after the change: `computeTrend`, `TrendResult`, `TrendBadge`,
  `facturacionMes`/`facturacionPrev`/`prevNetFlow`. The "Acciones rapidas" card name describes what
  it now is (CTA-only), not the old "Presion operativa" it replaced.
- The non-obvious `previousMonthKey` arithmetic (`currentMonth - 2`, month roll-back) carries a
  comment, and the `computeTrend` branch semantics are documented in a comment above the type and
  in this report. The `TrendResult` discriminant makes the three trend cases self-evident from the
  signature.
- No dead code or commented-out blocks: every removed symbol (`getDaysUntil`, `isPendingStatus`,
  `parseDateOnly` import, `Badge` import, the pending-state memos, `DashboardKpiCardsSkeleton`) was
  deleted, not stubbed — lint's no-unused rule (clean) is the proof.

### Reliability — right answer for in-contract inputs
- `computeTrend` is correct across the finite case set the spec defines, exhaustively:
  `previous > 0` (real %), `previous === 0 && actual > 0` ("Nuevo"), `previous === 0 && actual === 0`
  (no badge). Negative `actual` with `previous > 0` still yields a correct signed negative %
  (e.g. `-5.0%`). The `.toFixed(1)` → `Number()` round-trip pins the value to one decimal (R4).
- The aggregation reducers handle the empty-data boundary: `useInvoices`/`useIncomes`/`useExpenses`
  return a stable `EMPTY` array, so `[].reduce(..., 0)` yields `0` and `computeTrend(0, 0)` →
  `none` (no crash, no badge) — the exact R6 path.
- Output is deterministic: the only time input is `getTodayDateKey()` (business-timezone month
  key, the same source section-cards used), no locale/map-order/randomness dependence beyond the
  intentional `Intl.NumberFormat` currency display that already existed. A re-render is idempotent.
- The Facturación figure matches the deleted section-cards because it reuses the identical util
  (`getTimestampMonthKey`), field (`created_at`), and amount coercion (`Number(amount || 0)`).

### Resilience — fails safe when the world breaks
- The hero already guards external failure: if **any** of bankAccounts/incomes/expenses/invoices
  errors, `isError` short-circuits to the inline `ErrorState` with `retryAll` refetching exactly
  that new hook set (R16); while any is loading, the skeleton renders (R15). I preserved both
  branches and re-pointed them at the updated hook set — no fault path was removed, and the retry
  re-fetches everything the populated view depends on.
- These are pure presentational components: no file handle, lock, network/DB call, subprocess, or
  multi-step on-disk write is introduced, so there is nothing to time out, leak, or leave
  half-written; React Query (unchanged) owns the fetch lifecycle, timeouts, and bounded retries.
- External response shapes are guarded the same way they were before: every consumer reads through
  `Number(x || 0)` and the hooks' `EMPTY` fallback, so an empty or partial invoices/incomes/expenses
  payload degrades to `0`, never a throw.

## Final verify output

```
$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  7.5s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.9s
  ✓ design        12 advisory slop tell(s)  50ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  6ms
  ✓ traceability  every requirement maps to a task  5ms
Result: PASS

$ npm run lint        → clean (eslint, no output)
$ npm run typecheck   → clean (tsc --noEmit, no output)
$ npm run build       → success; no warnings/errors on touched files
$ git status          → section-cards.tsx shows D (deleted); only the 5 intended
                        dashboard files changed this session (chart-area-interactive.tsx
                        and the non-dashboard files were already modified in the working
                        tree before this session and were not touched here)
```

The 12/15 design "advisory slop tell(s)" are **pre-existing** in these dashboard surfaces (the
gradient hero backgrounds, `backdrop-blur` cards, and a few off-scale `[…rem]/[…px]` spacing
values that existed before this feature). They are advisory (non-blocking), and this change
**removed** surfaces rather than adding new tells; no new slop tell was introduced.

## Post-review revision — design-reviewer findings

The reviewer approved; the design-reviewer requested four fixes, all applied in the same files
already touched (minimal diffs, no scope change):

1. **(Block) Accent typo — `dashboard-hero.tsx`.** The new CTA card heading "Acciones rapidas"
   → "Acciones rápidas" to match the sidebar's quick-actions label (`app-sidebar.tsx` uses the
   accented form — verified by grep).
2. **(Block) Skeleton/layout-shift mismatch — `dashboard-loading.tsx` `DashboardWidgetsSkeleton`.**
   The skeleton still rendered the **old** two-column widgets layout
   (`xl:grid-cols-[1.2fr_0.8fr]` with three card slots), so at XL viewports it flashed two
   columns then snapped to the now-single-column populated `BusinessWidgets`. Rewrote it to a
   single-column `grid-cols-1` with exactly **two** stacked card skeletons — a list-style card
   (mirrors "Actividad reciente") followed by a `DashboardChartSkeleton` (mirrors the "Pulso por
   sucursal" chart card) — so the skeleton-to-content swap no longer shifts the layout. A comment
   records why. This is the correct follow-through to T10's grid collapse: design.md §7's "keep
   the skeleton unchanged" assumed the widgets grid stayed 2-col, which it no longer does.
3. **(Advisory) `business-widgets.tsx`** — "Ultimos" → "Últimos" (Actividad reciente description).
4. **(Advisory) `business-widgets.tsx`** — "Aun no hay" → "Aún no hay" (empty-state copy).

Re-verified after the fixes: `npm run lint` clean, `npm run typecheck` clean, `npm run build`
"✓ Compiled successfully" with no warnings/errors, and `npx reins verify --changed` → **PASS**
(lint, security, design [12 advisory, unchanged], feature-list, traceability all green; `unit` =
no runner configured).

## Handoff

Ready for review. Do not mark `done` until the reviewer returns `APPROVED`.
