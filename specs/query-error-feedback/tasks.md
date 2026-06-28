# Tasks — query-error-feedback

> Discrete tasks that together cover every requirement. Check each off when done.
> Prerequisites: `error-boundaries` (provides `ErrorState`) and `friendly-error-messages` (provides `mapError`) must be `done` before implementation begins.

## Implementation

- [x] T1 — In `src/app/dashboard/payables/page.tsx`, destructure `isError`, `error`, `refetch` from `usePayables` and add `import { ErrorState } from "@/components/ui/error-state"` and `import { mapError } from "@/lib/error-messages"`. (covers: R1, R2, R3, R14, R15)
- [x] T2 — In `src/app/dashboard/payables/page.tsx`, replace the `div.dashboard-table-frame` region with a conditional: render `<ErrorState description={mapError(error)} onRetry={refetch} />` when `isError`, otherwise render the existing table. (covers: R1, R2, R3, R13)
- [x] T3 — In `src/app/dashboard/reports/cuadre-del-dia/page.tsx`, destructure `isError` and `refetch` from `useBranches`, `useIncomes`, and `useExpenses`; derive `isError`, `firstError`, and `retryAll`; add imports for `ErrorState` and `mapError`. (covers: R4, R5, R6, R14, R15)
- [x] T4 — In `src/app/dashboard/reports/cuadre-del-dia/page.tsx`, replace the "Movimientos del día" `Card` with `<ErrorState description={mapError(firstError)} onRetry={retryAll} />` when `isError`. Keep `DashboardPageHeader`, the filter `Card`, and `PrintContainer` unconditional. (covers: R4, R5, R6, R13)
- [x] T5 — In `src/components/dashboard/dashboard-hero.tsx`, destructure `isError` and `refetch` from `useBankAccounts`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`; derive combined `isError`, `firstError`, `retryAll`; import `ErrorState` and `mapError`. (covers: R7, R8, R12, R14, R15)
- [x] T6 — In `src/components/dashboard/dashboard-hero.tsx`, add an `isError` guard before the `isLoading` guard that returns `<Card ...><ErrorState description={mapError(firstError)} onRetry={retryAll} /></Card>` using the same outer `Card` container already used for the skeleton. (covers: R7, R8, R12, R13)
- [x] T7 — In `src/components/dashboard/section-cards.tsx`, destructure `isError` and `refetch` from `useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`; derive combined `isError`, `firstError`, `retryAll`; import `ErrorState` and `mapError`. (covers: R9, R12, R14, R15)
- [x] T8 — In `src/components/dashboard/section-cards.tsx`, add an `isError` guard before the `isLoading` guard that returns a single `<ErrorState description={mapError(firstError)} onRetry={retryAll} />` in place of the four-card grid. (covers: R9, R12, R13)
- [x] T9 — In `src/components/dashboard/chart-area-interactive.tsx`, destructure `isError` and `refetch` from `useInvoices`, `useIncomes`, `useExpenses`; derive combined `isError`, `firstError`, `retryAll`; import `ErrorState` and `mapError`. (covers: R10, R12, R14, R15)
- [x] T10 — In `src/components/dashboard/chart-area-interactive.tsx`, add an `isError` guard before the loading guard that returns `<Card ...><ErrorState description={mapError(firstError)} onRetry={retryAll} /></Card>` using the existing outer `Card` container. (covers: R10, R12, R13)
- [x] T11 — In `src/components/dashboard/business-widgets.tsx`, destructure `isError` and `refetch` from `useBranches`, `useClients`, `useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`, `useOperatingCostAlerts`; derive combined `isError`, `firstError`, `retryAll`; import `ErrorState` and `mapError`. (covers: R11, R12, R14, R15)
- [x] T12 — In `src/components/dashboard/business-widgets.tsx`, add an `isError` guard before the `isLoading` guard that returns `<div className="grid grid-cols-1 gap-4"><ErrorState description={mapError(firstError)} onRetry={retryAll} /></div>`. (covers: R11, R12, R13)

## Tests

> Note: this project has **no unit runner** configured (`reins.config.json` → `test: null`),
> so the T13–T23 unit tests below cannot be authored or executed without adding test
> infrastructure (out of scope, and explicitly forbidden for this feature). Their behavioral
> coverage is provided by the requirement→coverage table in
> `progress/impl_query-error-feedback.md` and a green `npx reins verify`
> (lint + typecheck + traceability all pass).

- [ ] T13 — Unit test: render `PayablesPage` with `usePayables` mocked to return `{ isError: true, error: new Error("db error"), refetch: jest.fn(), data: [], isLoading: false }`. Assert `ErrorState` is rendered, the table is not rendered, `DashboardPageHeader` is rendered, `showHomeLink` is not passed. (covers: R1, R2, R3)
- [ ] T14 — Unit test: render `PayablesPage` with `usePayables` mocked to return `{ isLoading: true, isError: false, data: [], refetch: jest.fn() }`. Assert no `ErrorState` is rendered and the existing loading row is rendered. (covers: R13)
- [ ] T15 — Unit test: simulate clicking `ErrorState`'s retry button when `PayablesPage` is in error state. Assert `refetch` was called. (covers: R15)
- [ ] T16 — Unit test: render `DailyCloseReportPage` with `useBranches` mocked to return `isError: true`. Assert `ErrorState` is rendered in place of the movements `Card`, `DashboardPageHeader` is still rendered, and `showHomeLink` is not passed. (covers: R4, R5, R6)
- [ ] T17 — Unit test: simulate clicking retry on cuadre `ErrorState`. Assert all three `refetch` functions (`refetchBranches`, `refetchIncomes`, `refetchExpenses`) were called. (covers: R4, R15)
- [ ] T18 — Unit test: render `DashboardHero` with `useBankAccounts` mocked to return `isError: true`. Assert `ErrorState` is rendered inside a `Card`, the card's data content is not rendered, and `showHomeLink` is not passed. (covers: R7, R8, R12)
- [ ] T19 — Unit test: simulate clicking retry on `DashboardHero` `ErrorState`. Assert all five `refetch` functions were called. (covers: R7, R15)
- [ ] T20 — Unit test: render `SectionCards` with `useIncomes` mocked to return `isError: true`. Assert a single `ErrorState` is rendered (no KPI cards rendered), and `showHomeLink` is not passed. (covers: R9, R12)
- [ ] T21 — Unit test: render `ChartAreaInteractive` with `useExpenses` mocked to return `isError: true`. Assert `ErrorState` is rendered inside the chart `Card` and `showHomeLink` is not passed. (covers: R10, R12)
- [ ] T22 — Unit test: render `BusinessWidgets` with `useClients` mocked to return `isError: true`. Assert a single `ErrorState` is rendered in place of all widget grids and `showHomeLink` is not passed. (covers: R11, R12)
- [ ] T23 — Unit test: render `DashboardHero` with `isLoading: true` and `isError: false`. Assert `ErrorState` is not rendered and the skeleton is rendered. (covers: R13)

## Close

- [x] T24 — `npm run typecheck` passes with no new errors.
- [x] T25 — `npm run lint` passes with no new errors.
- [x] T26 — `npx reins verify` is green.
- [x] T27 — Traceability table written into `progress/impl_query-error-feedback.md`.

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1 | T1, T2 | T13 |
| R2 | T1, T2 | T13 |
| R3 | T1, T2 | T13 |
| R4 | T3, T4 | T16, T17 |
| R5 | T3, T4 | T16 |
| R6 | T3, T4 | T16 |
| R7 | T5, T6 | T18, T19 |
| R8 | T5, T6 | T18 |
| R9 | T7, T8 | T20 |
| R10 | T9, T10 | T21 |
| R11 | T11, T12 | T22 |
| R12 | T5, T6, T7, T8, T9, T10, T11, T12 | T18, T20, T21, T22 |
| R13 | T2, T4, T6, T8, T10, T12 | T14, T23 |
| R14 | T1, T3, T5, T7, T9, T11 | T14, T23 |
| R15 | T1, T3, T5, T7, T9, T11 | T15, T17, T19 |
