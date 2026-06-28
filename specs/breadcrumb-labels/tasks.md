# Tasks — breadcrumb-labels

> Discrete tasks that together cover every requirement. Check each off when done.

## Implementation

- [x] T1 — In `src/components/ui/dynamic-breadcrumb.tsx`, add the `isDynamicSegment(segment: string): boolean` helper function before `translateSegment`. It must match UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) and purely numeric strings (`/^\d+$/`). (covers: R5)
- [x] T2 — At the top of `translateSegment`, add `if (isDynamicSegment(segment)) return "Detalle";` before the map lookup. (covers: R5)
- [x] T3 — In the `map` literal, rename key `"Income-types"` to `"income-types"`. (covers: R1)
- [x] T4 — In the `map` literal, rename key `"Expense-types"` to `"expense-types"`. (covers: R2)
- [x] T5 — In the `map` literal, add entry `"sync-cuadres": "Sincronizar Envíos RD"`. (covers: R3)
- [x] T6 — In the `map` literal, add entry `"formulario-dgii": "Formulario DGII"`. (covers: R4)
- [x] T7 — In the `map` literal, change the value for `"cuadre-del-dia"` from `"Cuadre del dia"` to `"Cuadre del día"`. (covers: R6)
- [x] T8 — In the `map` literal, change the value for `"parameters"` from `"Parametros"` to `"Parámetros"`. (covers: R7)
- [x] T9 — Verify that `receivables: "CxC"` and `payables: "CxP"` remain unchanged in the map. (covers: R8)

## Verification

- [x] T10 — Run `npm run lint` — must pass with no new errors. (covers: R9)
- [x] T11 — Run `npm run typecheck` — must pass with no new errors. (covers: R9)
- [ ] T12 — Manual: navigate to `/dashboard/parameters/income-types`; confirm the breadcrumb trail ends with `"Tipos de ingresos"`. (covers: R1)
- [ ] T13 — Manual: navigate to `/dashboard/parameters/expense-types`; confirm the breadcrumb trail ends with `"Tipos de gastos"`. (covers: R2)
- [ ] T14 — Manual: navigate to `/dashboard/reports/sync-cuadres` (or equivalent); confirm the breadcrumb renders `"Sincronizar Envíos RD"`. (covers: R3)
- [ ] T15 — Manual: navigate to `/dashboard/reports/formulario-dgii` (or equivalent); confirm the breadcrumb renders `"Formulario DGII"`. (covers: R4)
- [ ] T16 — Manual: navigate to `/dashboard/bank-accounts/<any-uuid>`; confirm the breadcrumb renders `"Detalle"` for the uuid segment. (covers: R5)
- [ ] T17 — Manual: navigate to `/dashboard/reports/cuadre-del-dia`; confirm the breadcrumb renders `"Cuadre del día"` (with accent). (covers: R6)
- [ ] T18 — Manual: navigate to `/dashboard/parameters`; confirm the breadcrumb renders `"Parámetros"` (with accent). (covers: R7)

## Close

- [x] T19 — `npx reins verify` is green.
- [x] T20 — Traceability table written into `progress/impl_breadcrumb-labels.md`.

## Traceability

| Requirement | Task(s) | Verification |
| --- | --- | --- |
| R1 — income-types key fix | T3 | T12 |
| R2 — expense-types key fix | T4 | T13 |
| R3 — sync-cuadres mapping | T5 | T14 |
| R4 — formulario-dgii mapping | T6 | T15 |
| R5 — dynamic id guard | T1, T2 | T16 |
| R6 — cuadre-del-dia accent | T7 | T17 |
| R7 — parameters accent | T8 | T18 |
| R8 — CxC/CxP unchanged | T9 | T12 (regression) |
| R9 — no regressions | T10, T11 | T10, T11 |
