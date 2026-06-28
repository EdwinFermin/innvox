# Requirements — dashboard-focus

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1 — Cobros/Pagos absent from the home

WHEN a user loads the dashboard home page, the system SHALL NOT render any receivable (cobros) pending balance or payable (pagos) pending balance on that page — neither "Por cobrar", "Por pagar", "Pendiente neto", "Presion operativa", "Cobros pendientes", "Pagos comprometidos", nor any "Pendientes y alertas" sub-card.

## R2 — KPI surface consolidated once in the hero

WHEN the dashboard home renders successfully, the system SHALL display the month KPIs (Facturación del mes, Ingresos, Gastos) exactly once, inside the DashboardHero component, and SHALL NOT render a separate SectionCards row.

## R3 — Facturación del mes added to hero KPI row

WHEN the dashboard home renders successfully, the system SHALL display a "Facturación del mes" KPI box in the DashboardHero's three-box row, sourcing its value from `useInvoices` data aggregated for the current calendar month using `getTimestampMonthKey`.

## R4 — Trend badge: signed real percentage when previous > 0

WHEN the dashboard hero renders a trend badge for Facturación del mes or Flujo neto del mes AND the previous-month value is greater than 0, the system SHALL display a signed numeric percentage (e.g. "+12.4%" or "-5.0%") computed as `((actual - previous) / previous) * 100` rounded to one decimal place.

## R5 — Trend badge: "Nuevo" when previous === 0 and actual > 0

WHEN the dashboard hero renders a trend badge for Facturación del mes or Flujo neto del mes AND the previous-month value is 0 AND the current-month value is greater than 0, the system SHALL display the text "Nuevo" instead of a percentage.

## R6 — Trend badge: no badge when both previous === 0 and actual === 0

WHEN the dashboard hero renders a trend badge for Facturación del mes or Flujo neto del mes AND both the previous-month value and the current-month value are 0, the system SHALL NOT render any trend badge for that metric.

## R7 — Ingresos and Gastos boxes carry no trend badge

WHEN the dashboard home renders successfully, the system SHALL display the Ingresos and Gastos KPI boxes inside DashboardHero WITHOUT any trend badge or variation indicator.

## R8 — SectionCards file deleted

WHEN the dashboard home is rendered, the system SHALL NOT mount the SectionCards component; the file `src/components/dashboard/section-cards.tsx` SHALL be deleted and its import SHALL be removed from `home-content.tsx`.

## R9 — BusinessWidgets shows only Actividad reciente and Pulso operativo por sucursal

WHEN the dashboard home renders successfully, the system SHALL display two sub-cards inside BusinessWidgets: "Actividad reciente" and "Pulso operativo por sucursal". The system SHALL NOT render the "Pendientes y alertas" sub-card (including its Por cobrar/Por pagar amounts and Cobertura abierta footer).

## R10 — OperatingCostAlertsBanner and ChartAreaInteractive untouched

WHEN the dashboard home renders, the system SHALL include the OperatingCostAlertsBanner and ChartAreaInteractive components in the same position and with the same props as before this change. No implementation change SHALL be made to those two files.

## R11 — Home composition order

WHEN the dashboard home renders successfully, the system SHALL render the four blocks in this order: DashboardHero, OperatingCostAlertsBanner, ChartAreaInteractive, BusinessWidgets.

## R12 — Hero hooks updated: drop useReceivables and usePayables; add useInvoices

WHEN the DashboardHero component mounts, the system SHALL call `useInvoices` to supply Facturación data and SHALL NOT call `useReceivables` or `usePayables` (those hooks are no longer needed by the hero after removing cobros/pagos panels).

## R13 — BusinessWidgets drops useReceivables, usePayables, and useOperatingCostAlerts

WHEN BusinessWidgets mounts after this change, the system SHALL NOT call `useReceivables`, `usePayables`, or `useOperatingCostAlerts`, because those hooks were exclusively consumed by the removed "Pendientes y alertas" sub-card.

## R14 — DashboardKpiCardsSkeleton removed from dashboard-loading.tsx

WHEN section-cards.tsx is deleted, `DashboardKpiCardsSkeleton` SHALL be removed from `src/components/dashboard/dashboard-loading.tsx` because its only call-sites are inside section-cards.tsx (line 216) and inside `DashboardHomeLoading` (line 74 of dashboard-loading.tsx). `DashboardHomeLoading` SHALL be updated to no longer call `DashboardKpiCardsSkeleton`. The `DashboardHomeLoading` export itself SHALL be kept.

## R15 — Hero loading state covers new hook set

WHILE the DashboardHero is waiting for any of its data hooks (bankAccounts, incomes, expenses, invoices) to resolve, the system SHALL render the hero's inline loading skeleton and SHALL NOT render the populated hero content.

## R16 — Hero error state covers new hook set

WHEN any of the DashboardHero's data hooks (bankAccounts, incomes, expenses, invoices) returns an error, the system SHALL render the hero's inline ErrorState and SHALL NOT render the populated hero content.
