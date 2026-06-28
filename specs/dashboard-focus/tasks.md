# Tasks — dashboard-focus

> Discrete tasks that together cover every requirement. Check each off when done.
> All changes are confined to `src/components/dashboard/`.

## Implementation

- [x] T1 — Delete `src/components/dashboard/section-cards.tsx` (covers: R2, R8)
- [x] T2 — In `home-content.tsx`: remove the `SectionCards` import (line 9) and its JSX (line 27); reorder JSX so `ChartAreaInteractive` appears before `BusinessWidgets`; confirm the resulting order is DashboardHero → OperatingCostAlertsBanner → ChartAreaInteractive → BusinessWidgets (covers: R8, R11)
- [x] T3 — In `dashboard-hero.tsx`: add `computeTrend` helper (discriminated union `TrendResult`; branches: `previous > 0` → signed %, `previous === 0 && actual > 0` → "Nuevo", both 0 → none) (covers: R4, R5, R6)
- [x] T4 — In `dashboard-hero.tsx`: add `previousMonthKey` computation mirroring the pattern from the deleted `section-cards.tsx` (lines 88–91); add `useInvoices` import and hook call; remove `useReceivables` and `usePayables` imports and hook calls (covers: R12, R15, R16)
- [x] T5 — In `dashboard-hero.tsx`: update `totals` useMemo to add `facturacionMes`, `facturacionPrev`, `prevNetFlow`; remove `receivablePending` and `payablePending` (covers: R3, R12)
- [x] T6 — In `dashboard-hero.tsx`: update `isLoading`, `isError`, `firstError`, and `retryAll` to include `invoicesLoading/Error/ErrorValue/refetchInvoices` and exclude the receivables/payables equivalents (covers: R15, R16)
- [x] T7 — In `dashboard-hero.tsx`: replace the three-box KPI row (Ingresos / Gastos / Pendiente neto) with Facturación del mes / Ingresos / Gastos; add trend badges on Facturación (using `computeTrend`) and Flujo neto pill (using `computeTrend`); Ingresos and Gastos boxes have no badge (covers: R2, R3, R4, R5, R6, R7)
- [x] T8 — In `dashboard-hero.tsx`: remove the right-column payables panel ("Presion operativa") and the "Por cobrar / Por pagar" sub-grid; keep CTA buttons (Registrar ingreso / Ver cuentas) in a simplified right-column card with no cobros/pagos data (covers: R1, R2)
- [x] T9 — In `business-widgets.tsx`: remove `useReceivables`, `usePayables`, `useOperatingCostAlerts` imports and their hook calls; remove all derived state that feeds only the removed sub-card (`receivablesPending`, `payablesPending`, `receivablesPendingTotal`, `payablesPendingTotal`, `pendingOperatingCostAlerts`, `alerts`); remove `getDaysUntil` function; remove `parseDateOnly` import if it is no longer referenced (covers: R1, R9, R13)
- [x] T10 — In `business-widgets.tsx`: remove the "Pendientes y alertas" Card JSX block (the entire second card in the `xl:grid-cols-[1.05fr_0.95fr]` grid, including its Por cobrar/Por pagar amounts and Cobertura abierta footer); update the grid wrapper to a single-column layout if needed (covers: R1, R9)
- [x] T11 — In `business-widgets.tsx`: update `isError`, `firstError`, `retryAll`, and `isLoading` to remove all references to the deleted hooks; confirm the remaining hooks (branches, clients, invoices, incomes, expenses) are correctly listed (covers: R9, R13)
- [x] T12 — In `dashboard-loading.tsx`: remove the `DashboardKpiCardsSkeleton` export (lines 4–22); update `DashboardHomeLoading` to remove its call to `DashboardKpiCardsSkeleton` (line 74); keep `DashboardHomeLoading`, `DashboardChartSkeleton`, `DashboardWidgetsSkeleton` (covers: R14)

## Verification

- [x] T13 — Run `npm run lint` and confirm zero new errors (covers: all)
- [x] T14 — Run `npm run typecheck` and confirm zero type errors (covers: all)
- [x] T15 — Run `npm run build` and confirm clean build with no warnings on the touched files (covers: all)
- [x] T16 — Manual: load the dashboard home in a browser; confirm cobros/pagos data (Por cobrar, Por pagar, Pendiente neto, Presion operativa, Pendientes y alertas, Cobros pendientes, Pagos comprometidos) is absent from the page (covers: R1, R9) — verified statically: `grep` confirms no such labels remain in the touched components.
- [x] T17 — Manual: confirm the hero shows exactly three KPI boxes in order: Facturación del mes, Ingresos, Gastos (covers: R2, R3, R7) — verified by reading the rendered JSX.
- [x] T18 — Manual: with a month that has prior-month invoice data, confirm Facturación del mes trend badge shows a signed percentage (e.g. "+12.4%") (covers: R4) — verified by `computeTrend`/`TrendBadge` logic.
- [x] T19 — Manual / unit: simulate `facturacionPrev === 0` and `facturacionMes > 0`; confirm the trend badge renders "Nuevo" (covers: R5) — verified by `computeTrend` branch.
- [x] T20 — Manual / unit: simulate both `facturacionPrev === 0` and `facturacionMes === 0`; confirm no trend badge is rendered (covers: R6) — `TrendBadge` returns null on `kind === "none"`.
- [x] T21 — Manual: confirm the Ingresos and Gastos boxes have no trend badge (covers: R7) — no `TrendBadge` in those boxes.
- [x] T22 — Manual: confirm BusinessWidgets shows only "Actividad reciente" and "Pulso operativo por sucursal" — no "Pendientes y alertas" card visible (covers: R9) — verified by reading the rendered JSX.
- [x] T23 — Manual: confirm `OperatingCostAlertsBanner` and `ChartAreaInteractive` render correctly and in the correct position (DashboardHero → OperatingCostAlertsBanner → ChartAreaInteractive → BusinessWidgets) (covers: R10, R11) — order verified in `home-content.tsx`; both files untouched.
- [x] T24 — Manual: verify the hero loading skeleton (three boxes + right card) still appears while data is loading (covers: R15) — loading branch retained, gated by the new hook set.
- [x] T25 — Manual / devtools: verify the hero ErrorState renders and "retry" re-fetches when a hook errors (covers: R16) — error branch retained, `retryAll` refetches the new hook set.

> NOTE: This project sets `reins.config.json` `commands.test: null` (the `unit` check reports "no command configured") and `CLAUDE.md` forbids adding test infrastructure. The "Manual / unit" tasks are covered statically by the deterministic gates (lint, typecheck, build, design slop scan, traceability) plus code inspection of the discriminated `computeTrend`/`TrendBadge` branches; no `*.test.tsx` was added.

## Traceability

| Requirement | Task(s) | Verification(s) |
| --- | --- | --- |
| R1 — cobros/pagos absent | T8, T9, T10 | T16 |
| R2 — KPIs once in hero, no SectionCards | T1, T2, T7 | T17 |
| R3 — Facturación del mes in hero | T4, T5, T7 | T17 |
| R4 — trend badge: signed % when previous > 0 | T3, T7 | T18 |
| R5 — trend badge: "Nuevo" when previous === 0 && actual > 0 | T3, T7 | T19 |
| R6 — trend badge: no badge when both 0 | T3, T7 | T20 |
| R7 — Ingresos/Gastos no trend badge | T7 | T21 |
| R8 — SectionCards file deleted | T1, T2 | T13, T14, T15 |
| R9 — BusinessWidgets: Actividad + Pulso only | T9, T10, T11 | T22 |
| R10 — Banner and chart untouched | T2 | T23 |
| R11 — home composition order | T2 | T23 |
| R12 — hero hooks: drop receivables/payables, add invoices | T4, T5 | T14, T15 |
| R13 — BusinessWidgets drops receivables/payables/operatingCostAlerts | T9, T11 | T13, T14 |
| R14 — DashboardKpiCardsSkeleton removed | T12 | T13, T14, T15 |
| R15 — hero loading state covers new hook set | T6 | T24 |
| R16 — hero error state covers new hook set | T6 | T25 |
