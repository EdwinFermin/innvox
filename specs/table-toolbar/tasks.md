# Tasks — table-toolbar

> Discrete tasks that together cover every requirement. Implement the three components first, then adopt page-by-page (bank-accounts last). Each adoption task must verify that the page's search, column-toggle, and pagination still behave identically after the change.
>
> Prerequisite: `table-states` must be `done` before this feature begins (same files, disjoint regions).

---

## Build the shared components

- [x] T1 — Create `src/components/ui/table-column-toggle.tsx` with the `TableColumnToggle<TData>` component reproducing the exact column-visibility dropdown (trigger text "Columnas" + ChevronDown, `h-11 rounded-2xl` button, `getCanHide` filter, `DropdownMenuCheckboxItem` per column, label via `columnLabels[id] ?? id`). (covers: R1, R2, R3, R4)

- [x] T2 — Create `src/components/ui/table-pagination.tsx` with the `TablePagination<TData>` component reproducing the exact footer row (optional `visibilityControl` leading slot, `TablePageSize` forwarding `pageSizeOptions`, `"{totalFiltered} filas"` label, "Anterior" / "Siguiente" buttons gated by `getCanPreviousPage` / `getCanNextPage`). (covers: R5, R6, R7, R8, R9, R10, R11)

- [x] T3 — Create `src/components/ui/table-toolbar.tsx` with the `TableToolbar<TData>` component: `isMobile`-conditional grid class, controlled `<Input>` bound to `searchValue`/`onSearchChange`/`searchPlaceholder`/`searchAriaLabel`, internally-rendered `<TableColumnToggle>`, and the `filters?: React.ReactNode` slot rendered after the main row. (covers: R12, R13, R14, R15, R16, R17)

---

## Adopt: payables page

- [x] T4 — In `payables/page.tsx`, replace the toolbar div (lines 338–375) with `<TableToolbar>` wiring `searchValue={searchQuery}` / `onSearchChange={(e) => setSearchQuery(e.target.value)}` / `searchPlaceholder` / `searchAriaLabel` / `table` / `columnLabels` derived from the existing `getColumnLabel` map. Replace the pagination footer (lines 459–489) with `<TablePagination table={table} totalFiltered={table.getFilteredRowModel().rows.length} visibilityControl={<ListVisibilityControl …/>} />`. Remove now-unused inline DropdownMenu/ChevronDown/Input imports. (covers: R18, R20, R33)

---

## Adopt: receivables page

- [x] T5 — In `receivables/page.tsx`, replace the toolbar div and pagination footer with `<TableToolbar>` and `<TablePagination>` following the same wiring as T4 (pattern A, `searchQuery`). (covers: R18, R21, R33)

---

## Adopt: branches page

- [x] T6 — In `branches/page.tsx`, replace the toolbar div and pagination footer with `<TableToolbar>` and `<TablePagination>`. Wire search as pattern B: `searchValue={(table.getColumn("name")?.getFilterValue() as string) ?? ""}` and `onSearchChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}`. No `visibilityControl` in footer. Pass `totalFiltered={table.getFilteredRowModel().rows.length}`. The existing row-count label in branches reads `{selected} de {total} filas seleccionadas.` — this is a bespoke label; pass it as a custom child or preserve it by passing `totalFiltered` and noting the label difference is acceptable (branches uses selection-count text which differs from the standard `"{n} filas"` — if the design requires exact reproduction, extend `TablePagination` with an optional `rowCountNode?: React.ReactNode` override prop, falling back to `"{totalFiltered} filas"` when absent). (covers: R19, R22, R33)

---

## Adopt: clients page

- [x] T7 — In `clients/page.tsx`, replace the toolbar div and pagination footer with `<TableToolbar>` and `<TablePagination>`. Wire search as pattern B on `"name"` column. No `visibilityControl`. (covers: R19, R23, R33)

---

## Adopt: invoices page

- [x] T8 — In `invoices/page.tsx`, replace the toolbar div and pagination footer with `<TableToolbar>` and `<TablePagination>`. Wire search as pattern B on `"id"` column. Include `visibilityControl={<ListVisibilityControl …/>}` in footer. (covers: R19, R24, R33)

---

## Adopt: incomes page

- [x] T9 — In `transactions/incomes/page.tsx`, replace the toolbar div (lines 527–565) and pagination footer (lines 687–717) with `<TableToolbar>` and `<TablePagination>`. Wire search as pattern A (`searchTerm`/`setSearchTerm`). Include `visibilityControl={<ListVisibilityControl …/>}` in footer. (covers: R18, R25, R33)

---

## Adopt: expenses page

- [x] T10 — In `transactions/expenses/page.tsx`, replace the toolbar div (lines 519–554) and pagination footer (lines 676–706) with `<TableToolbar>` and `<TablePagination>`. Wire search as pattern A (`searchTerm`/`setSearchTerm`). Include `visibilityControl={<ListVisibilityControl …/>}` in footer. (covers: R18, R26, R33)

---

## Adopt: bank-accounts page (partial)

- [x] T11 — In `bank-accounts/page.tsx`, replace the inline column-dropdown block (lines 758–779) inside the filter Card with `<TableColumnToggle table={table} columnLabels={columnLabels} />`, preserving the surrounding Card/badge/flex structure. Do NOT touch the filter Card inputs, FilterField wrappers, or mobile footer. (covers: R27, R29, R33)

- [x] T12 — In `bank-accounts/page.tsx`, replace the desktop pagination footer (lines 1081–1108) with `<TablePagination table={table} totalFiltered={filteredAccounts.length} />` (no visibilityControl; bank-accounts has bespoke page-info text — if `TablePagination` does not match the existing "Pagina X de Y · N cuentas en vista" label, keep the existing label node in a `rowCountNode` override prop or leave the label as-is). Do NOT touch the mobile card-grid footer (lines 1018–1045). (covers: R28, R29, R33)

---

## Tests

- [x] T13 — Write a render test for `TableColumnToggle`: assert trigger text "Columnas" is present; assert one checkbox item per hideable column; assert label falls back to `column.id` when key absent; assert `toggleVisibility` is called on check. (covers: R1, R2, R3, R4)

- [x] T14 — Write a render test for `TablePagination`: assert "Anterior" is disabled when `getCanPreviousPage` returns false; assert "Siguiente" is disabled when `getCanNextPage` returns false; assert clicking "Anterior" calls `previousPage()`; assert clicking "Siguiente" calls `nextPage()`; assert `visibilityControl` slot renders when provided and is absent when not; assert row-count label shows `"{n} filas"`. (covers: R5, R6, R7, R8, R9, R10, R11)

- [x] T15 — Write a render test for `TableToolbar`: assert Input renders with correct `value`, `placeholder`, and `aria-label`; assert `onSearchChange` is called with the input event; assert `TableColumnToggle` is rendered (trigger text visible); assert `filters` slot renders its content when provided; assert `filters` renders nothing when absent; assert desktop grid class is applied when `isMobile=false` and single-column class when `isMobile=true`. (covers: R12, R13, R14, R15, R16, R17)

- [x] T16 — Write an integration smoke test for each of the 7 grid-page adoption sites: render the page with mocked data, confirm the search input is present with the correct aria-label, confirm the "Columnas" button is present, confirm "Anterior" and "Siguiente" buttons are present. (covers: R18, R19, R20, R21, R22, R23, R24, R25, R26, R33)

- [x] T17 — Write a smoke test for bank-accounts: confirm `TableColumnToggle` trigger is present inside the filter Card; confirm the desktop pagination buttons are present; confirm the filter Card inputs (status, type, currency, branch selects and search input) are still present and unchanged. (covers: R27, R28, R29, R33)

---

## Close

- [x] T18 — Run `npm run lint` and confirm exit code 0. (covers: R30)
- [x] T19 — Run `npm run typecheck` and confirm exit code 0. (covers: R31)
- [x] T20 — Run `npm run build` and confirm no errors. (covers: R32)
- [x] T21 — Write traceability table into `progress/impl_table-toolbar.md`. (meta)

---

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1 — TableColumnToggle trigger renders "Columnas" + chevron | T1 | T13 |
| R2 — One checkbox item per hideable column | T1 | T13 |
| R3 — Label via columnLabels map with id fallback | T1 | T13 |
| R4 — toggleVisibility called on check | T1 | T13 |
| R5 — TablePagination renders all footer elements | T2 | T14 |
| R6 — "Anterior" disabled when cannot go back | T2 | T14 |
| R7 — "Siguiente" disabled when cannot go forward | T2 | T14 |
| R8 — "Anterior" click calls previousPage() | T2 | T14 |
| R9 — "Siguiente" click calls nextPage() | T2 | T14 |
| R10 — visibilityControl absent when not provided | T2 | T14 |
| R11 — pageSizeOptions forwarded to TablePageSize | T2 | T14 |
| R12 — TableToolbar desktop two-column grid | T3 | T15 |
| R13 — TableToolbar mobile single-column | T3 | T15 |
| R14 — Controlled search input wired correctly | T3 | T15 |
| R15 — TableColumnToggle rendered internally | T3 | T15 |
| R16 — filters slot renders when provided | T3 | T15 |
| R17 — filters slot absent when not provided | T3 | T15 |
| R18 — Pattern-A pages wired to state variable | T4, T5, T9, T10 | T16 |
| R19 — Pattern-B pages wired to column filter | T6, T7, T8 | T16 |
| R20 — payables adoption identical output | T4 | T16 |
| R21 — receivables adoption identical output | T5 | T16 |
| R22 — branches adoption identical output | T6 | T16 |
| R23 — clients adoption identical output | T7 | T16 |
| R24 — invoices adoption identical output | T8 | T16 |
| R25 — incomes adoption identical output | T9 | T16 |
| R26 — expenses adoption identical output | T10 | T16 |
| R27 — bank-accounts TableColumnToggle inside Card | T11 | T17 |
| R28 — bank-accounts desktop TablePagination | T12 | T17 |
| R29 — bank-accounts filter Card / mobile footer untouched | T11, T12 | T17 |
| R30 — lint passes | T18 | T18 |
| R31 — typecheck passes | T19 | T19 |
| R32 — build passes | T20 | T20 |
| R33 — no behavioral regression on any page | T4–T12 | T16, T17 |
