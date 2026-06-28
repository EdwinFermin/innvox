# Requirements — table-toolbar

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test. This is a pure refactor — identical rendered output is the top-level acceptance criterion.

---

## Component: TableColumnToggle

### R1

WHEN `TableColumnToggle` is rendered with a `table` instance and a `columnLabels` map, the system SHALL render a `<DropdownMenu>` whose trigger button displays the text "Columnas" followed by a chevron-down icon, reproducing the exact trigger style (`h-11 w-full rounded-2xl border-border/70 bg-background/80`) present in every page today.

### R2

WHEN the `TableColumnToggle` dropdown is opened, the system SHALL render one `<DropdownMenuCheckboxItem>` for every column where `column.getCanHide()` returns `true`, in the order returned by `table.getAllColumns()`.

### R3

WHEN a `<DropdownMenuCheckboxItem>` is rendered inside `TableColumnToggle`, the system SHALL display `columnLabels[column.id]` as the item label, falling back to `column.id` if the key is absent from the map.

### R4

WHEN a `<DropdownMenuCheckboxItem>` inside `TableColumnToggle` is checked or unchecked by the user, the system SHALL call `column.toggleVisibility(!!value)` on the corresponding column, making that column visible or hidden in the table immediately.

---

## Component: TablePagination

### R5

WHEN `TablePagination` is rendered with a `table` instance and a `totalFiltered` number, the system SHALL render a flex footer row containing: an optional leading slot (occupied by `visibilityControl` when provided), a `<TablePageSize>` control, a row-count label reading `"{totalFiltered} filas"`, and two buttons labeled "Anterior" and "Siguiente".

### R6

WHEN `TablePagination` is rendered and `table.getCanPreviousPage()` returns `false`, the system SHALL render the "Anterior" button with `disabled={true}`.

### R7

WHEN `TablePagination` is rendered and `table.getCanNextPage()` returns `false`, the system SHALL render the "Siguiente" button with `disabled={true}`.

### R8

WHEN the user clicks "Anterior" in `TablePagination`, the system SHALL call `table.previousPage()`.

### R9

WHEN the user clicks "Siguiente" in `TablePagination`, the system SHALL call `table.nextPage()`.

### R10

WHEN `TablePagination` is rendered without the `visibilityControl` prop, the system SHALL omit the leading slot entirely, producing no visible placeholder.

### R11

WHEN `TablePagination` is rendered with the `pageSizeOptions` prop, the system SHALL forward that array to the nested `<TablePageSize options={pageSizeOptions} />` call.

---

## Component: TableToolbar

### R12

WHEN `TableToolbar` is rendered on a non-mobile viewport, the system SHALL lay out its children in a two-column grid (`grid-cols-[minmax(0,1fr)_auto]`) matching the existing toolbar grid class used on all 7 grid pages.

### R13

WHEN `TableToolbar` is rendered on a mobile viewport (as determined by the page's `isMobile` state passed via className or the same `useIsMobile` hook), the system SHALL collapse to a single-column grid (`grid-cols-1`), matching the current mobile behavior.

### R14

WHEN `TableToolbar` is rendered, the system SHALL render a controlled `<Input>` whose `value` is `searchValue`, whose `onChange` handler calls `onSearchChange` with the event, whose `placeholder` is `searchPlaceholder`, and whose `aria-label` is `searchAriaLabel` — reproducing the exact Input style (`h-11 rounded-2xl border-border/70 bg-background/80`).

### R15

WHEN `TableToolbar` is rendered, the system SHALL internally render a `<TableColumnToggle table={table} columnLabels={columnLabels} />` in the second grid column, using the `table` and `columnLabels` props passed to `TableToolbar`.

### R16

WHEN `TableToolbar` is rendered with the `filters` prop, the system SHALL render `filters` as a `React.ReactNode` slot inside the toolbar, positioned after the search/column-toggle row, available for `table-filters` to populate in a later feature.

### R17

WHEN `TableToolbar` is rendered without the `filters` prop, the system SHALL render no extra markup for the filters slot.

---

## Controlled-search contract

### R18

WHEN a grid page (pattern A — state-driven search: payables, receivables, incomes, expenses) adopts `TableToolbar`, the system SHALL wire `searchValue` to the page's existing search state variable and `onSearchChange` to the page's existing state setter, so that the page's `matchesSearch` / `normalizedSearch` filter logic continues to receive the same value it does today with zero behavioral change.

### R19

WHEN a grid page (pattern B — column-filter search: branches, clients, invoices) adopts `TableToolbar`, the system SHALL wire `searchValue` to `(table.getColumn("<key>")?.getFilterValue() as string) ?? ""` and `onSearchChange` to `(e) => table.getColumn("<key>")?.setFilterValue(e.target.value)`, so that TanStack Table's built-in column filtering continues to operate identically to today.

---

## Per-page adoption

### R20

WHEN the payables page is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace the existing inline toolbar grid (lines 338–375) and pagination footer (lines 459–489) with the two new components, producing rendered output identical to the pre-refactor output (search input, column dropdown, ListVisibilityControl, row count, Anterior/Siguiente).

### R21

WHEN the receivables page is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output.

### R22

WHEN the branches page is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output (no ListVisibilityControl in footer, selection-count label text preserved).

### R23

WHEN the clients page is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output.

### R24

WHEN the invoices page is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output.

### R25

WHEN the incomes page (`transactions/incomes/page.tsx`) is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output.

### R26

WHEN the expenses page (`transactions/expenses/page.tsx`) is updated to adopt `TableToolbar` and `TablePagination`, the system SHALL replace its inline toolbar grid and pagination footer with the two new components, producing rendered output identical to the pre-refactor output.

---

## bank-accounts partial adoption

### R27

WHEN the bank-accounts page is updated to adopt `TableColumnToggle`, the system SHALL replace the inline column-visibility `<DropdownMenu>` block (lines 758–779) inside the bespoke filter Card with `<TableColumnToggle table={table} columnLabels={columnLabels} />`, producing identical rendered output for that dropdown.

### R28

WHEN the bank-accounts page is updated to adopt `TablePagination`, the system SHALL replace the desktop pagination footer (lines 1081–1108) with `<TablePagination>`, producing identical rendered output.

### R29

WHILE the bank-accounts page is updated, the system SHALL leave the bespoke filter Card structure (lines 741–892, search input, status/type/currency/branch selects, the `FilterField` wrapper), the mobile card-grid pagination footer (lines 1018–1045), and all responsive split logic entirely untouched.

---

## No-regression

### R30

AFTER the refactor is complete, `npm run lint` SHALL exit with code 0.

### R31

AFTER the refactor is complete, `npm run typecheck` SHALL exit with code 0.

### R32

AFTER the refactor is complete, `npm run build` SHALL complete without errors.

### R33

AFTER the refactor is complete, no page SHALL have had its column-visibility behavior, search behavior, pagination behavior, or row-count label altered in any way that differs from its pre-refactor behavior.
