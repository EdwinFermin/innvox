# Requirements — table-states

> EARS notation: "WHEN/WHILE/IF … the system SHALL …"
> Each requirement is independently verifiable.

---

## Component: TableStateBody

**R1** WHEN `isLoading` is `true`, the `<TableStateBody>` component SHALL render `<TableSkeleton rows={loadingRows} columns={colSpan} />` and SHALL NOT render `children` or the empty node.

**R2** WHEN `isLoading` is `false` AND `isEmpty` is `true`, the `<TableStateBody>` component SHALL render a single `<TableRow>` containing a `<TableCell colSpan={colSpan}>` that wraps the `empty` prop node, and SHALL NOT render `children`.

**R3** WHEN `isLoading` is `false` AND `isEmpty` is `false`, the `<TableStateBody>` component SHALL render `children` only, with no wrapping row or cell.

**R4** The `<TableStateBody>` component SHALL accept exactly the following props with the following types:
- `isLoading: boolean`
- `isEmpty: boolean`
- `colSpan: number`
- `loadingRows: number`
- `empty: React.ReactNode`
- `children: React.ReactNode`

**R5** The `<TableStateBody>` component SHALL be placed inside a `<TableBody>` element; it SHALL NOT render `<TableBody>` itself.

---

## Error guard — all eight pages

**R6** WHEN a data fetch fails (`isError === true`) on any of the eight pages (payables, receivables, branches, clients, invoices, incomes, expenses, bank-accounts), the page SHALL render an `<ErrorState>` component with `onRetry={refetch}` and `description={mapError(error)}` in place of the table frame.

**R7** WHEN the user activates the retry control rendered by `<ErrorState>`, the page SHALL call `refetch()` from the page's primary data hook.

---

## Loading skeleton — all eight pages

**R8** WHILE the primary data hook is loading (`isLoading === true`) and no error has occurred, each of the eight pages SHALL display a `<TableSkeleton>` (via `<TableStateBody>`) with `rows` equal to `pagination.pageSize` and `columns` equal to `table.getVisibleLeafColumns().length`, keeping the `<TableHeader>` visible.

**R9** WHEN the loading state resolves, the `<TableSkeleton>` SHALL be replaced by either the data rows or an empty state; it SHALL NOT persist alongside rendered data rows.

---

## Empty state — no-data variant (all eight pages)

**R10** WHEN `isLoading` is `false`, `isError` is `false`, the raw (unfiltered) data set is empty, and no search or filter is active, each page SHALL render an `<EmptyState>` with icon `Inbox`, a page-specific title of the form "Sin \<noun\>", and a description "Registra el primero para verlo aquí." (or equivalent per-page phrasing from the discovery copy table).

**R11** WHEN the page has a create action and the no-data empty state is visible, the `<EmptyState>` SHALL render an action button that opens that page's create dialog.

---

## Empty state — no-results variant (pages with a text search)

**R12** WHEN `isLoading` is `false`, `isError` is `false`, the raw data set is non-empty, and the current search or filter yields zero rows, the pages that have a text search input (receivables, branches, clients, invoices, incomes, expenses, bank-accounts) SHALL render an `<EmptyState>` with icon `SearchX`, title "Sin resultados", description "Ajusta o limpia el filtro.", and an action button that clears the search/filter.

**R13** Pages that do NOT have a text search input SHALL NOT render the no-results `<EmptyState>` variant; they SHALL render only the no-data variant (R10).

---

## Payables migration (no visual regression)

**R14** WHEN the payables page is migrated to use `<TableStateBody>`, the visible loading, empty, and error states SHALL be indistinguishable from the pre-migration behavior for the same data conditions. The existing copy, icons (`Inbox`, `SearchX`), and dual empty behavior SHALL be preserved.

**R15** IF the payables page currently uses `payables.length === 0` to discriminate no-data from no-results, the migrated version SHALL preserve the same discrimination logic.

---

## bank-accounts — constrained alignment

**R16** The bank-accounts page SHALL replace the custom `AccountsEmptyState` component (currently lines 204–234 of `src/app/dashboard/bank-accounts/page.tsx`) with the shared `<EmptyState>` component, preserving: the `Landmark` icon, the filter-aware dual messaging ("No hay cuentas con esos filtros" vs "Todavia no hay cuentas financieras"), and the create-account / clear-filters actions.

**R17** The bank-accounts page SHALL replace the inline red error `<div>` (currently lines 896–907) with the shared `<ErrorState>` component with `onRetry={refetch}` and `description={mapError(error)}`.

**R18** The bank-accounts desktop table body (`<TableBody>` inside the non-mobile branch, currently line 1063) SHALL use `<TableStateBody>` for its loading and empty branching, consistent with R1–R5.

**R19** The bank-accounts mobile card-grid layout SHALL NOT be altered; it SHALL continue to render card rows, not pass through `<TableStateBody>`.

**R20** The bank-accounts page SHALL NOT regress the mobile/desktop split: the `isMobile` conditional that routes to card rendering vs. table rendering SHALL be preserved.

**R21** The bank-accounts page SHALL NOT regress the filter-aware behavior of the empty state: the `hasFilters` / `hasActiveFilters` flag SHALL continue to control which copy and actions are displayed.

---

## Build health

**R22** AFTER all migrations, `npm run lint` SHALL exit with code 0.

**R23** AFTER all migrations, `npm run typecheck` SHALL exit with code 0.

**R24** AFTER all migrations, `npm run build` SHALL exit with code 0.
