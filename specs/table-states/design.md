# Design — table-states

## Overview

Introduce one new shared component (`<TableStateBody>`) and migrate all eight dashboard list pages to use it. No hook changes. No toolbar/search/filter changes (those are scoped to later features).

---

## New file: `src/components/ui/table-state-body.tsx`

### Purpose

A focused body-layer helper that lives inside the caller's `<TableBody>`. It owns exactly three branches — loading skeleton, colSpan empty row, and passthrough children — keeping each page's header, toolbar, and row markup untouched.

### Signature

```ts
import type { JSX } from "react";

interface TableStateBodyProps {
  isLoading: boolean;
  isEmpty: boolean;
  colSpan: number;
  loadingRows: number;
  empty: React.ReactNode;       // a fully configured <EmptyState> instance
  children: React.ReactNode;    // the mapped data rows
}

export function TableStateBody({
  isLoading,
  isEmpty,
  colSpan,
  loadingRows,
  empty,
  children,
}: TableStateBodyProps): JSX.Element
```

### Render contract

```
if isLoading:
  return <TableSkeleton rows={loadingRows} columns={colSpan} />

if isEmpty:
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        {empty}
      </TableCell>
    </TableRow>
  )

else:
  return <>{children}</>
```

### Dependencies (imports)

- `TableRow`, `TableCell` from `@/components/ui/table`
- `TableSkeleton` from `@/components/ui/table-skeleton`
- `React` from `react`

No new npm packages.

---

## Existing shared components (unchanged)

| File | Props used | Notes |
|---|---|---|
| `src/components/ui/empty-state.tsx` | `icon`, `title`, `description`, `action?` | Presentational only; no changes |
| `src/components/ui/error-state.tsx` | `title`, `description`, `onRetry?` | Presentational only; no changes |
| `src/components/ui/table-skeleton.tsx` | `rows`, `columns` | Renders body rows only; no changes |

---

## Per-page change table

### Shared pattern for the six retrofit pages

For each retrofit page the implementer SHALL:
1. Destructure `isError`, `error`, `refetch` from the primary hook (they are already returned via the `useQuery` spread).
2. Wrap the table frame in `{isError ? <ErrorState … /> : <frame>}`.
3. Replace the `SpinnerLabel` colSpan row with `<TableStateBody>`.
4. Replace the plain-text empty cell with a filter-aware dual `<EmptyState>` passed as the `empty` prop.
5. Remove the `SpinnerLabel` import if no longer used.
6. Add imports for `EmptyState`, `ErrorState`, `TableStateBody`, and `mapError`.

### payables — migrate (reference implementation)

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/payables/page.tsx` | same |
| Loading (lines 405–409) | `<TableSkeleton>` directly in `<TableBody>` | `<TableStateBody isLoading isEmpty colSpan loadingRows empty>` wrapping existing row map |
| Empty (lines 426–456) | Inline `payables.length === 0` two-branch conditional | Same logic, passed as `empty` prop to `<TableStateBody>` |
| Error (lines 377–382) | `{isError ? <ErrorState> : <frame>}` | Unchanged (already correct) |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` (already used in loading branch) |
| Has search | Yes (`searchQuery` state) | Yes — no-results variant preserved |

### receivables

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/receivables/page.tsx` | same |
| Loading (lines 420–427) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` with `loadingRows={table.getState().pagination.pageSize}` `colSpan={table.getVisibleLeafColumns().length}` |
| Empty (lines 444–453) | Plain text "No se encontraron cuentas por cobrar." | `Inbox` no-data EmptyState with `NewReceivableDialog` action; `SearchX` no-results with clear-search (`setSearchQuery("")`) |
| Error | None | `{isError ? <ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (`searchQuery` state) | Yes — dual empty |

### branches

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/branches/page.tsx` | same |
| Loading (lines 359–366) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` |
| Empty (lines 383–392) | Plain text "No se encontraron sucursales." | `Inbox` no-data with `NewBranchDialog` action; `SearchX` no-results with `table.getColumn("name")?.setFilterValue("")` |
| Error | None | `{isError ? <ErrorState … /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (react-table column filter on `name`) | Yes — dual empty |

### clients

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/clients/page.tsx` | same |
| Loading (lines 287–294) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` |
| Empty (lines 311–319) | Plain text "No se encontraron clientes." | `Inbox` no-data with `NewClientDialog` action (guarded by `can(user?.type, PERMISSIONS.clientsCreate)`); `SearchX` no-results with `table.getColumn("name")?.setFilterValue("")` |
| Error | None | `{isError ? <ErrorState … /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (react-table column filter on `name`) | Yes — dual empty |

### invoices

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/invoices/page.tsx` | same |
| Loading (lines 421–428) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` |
| Empty (lines 445–454) | Plain text "No se encontraron facturas." | `Inbox` no-data with `NewInvoiceDialog` trigger; `SearchX` no-results with `table.getColumn("id")?.setFilterValue("")` |
| Error | None | `{isError ? <ErrorState … /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (react-table column filter on `id`) | Yes — dual empty |
| Hook destructuring | `const { data: invoices, isLoading } = useInvoices(…)` | Add `isError`, `error`, `refetch` |

### incomes (transactions/incomes)

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/transactions/incomes/page.tsx` | same |
| Loading (lines 651–658) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` |
| Empty (lines 675–683) | Plain text "No se encontraron ingresos." | `Inbox` no-data with `NewIncomeDialog` action; `SearchX` no-results with `setSearchTerm("")` (has text search at line 530–535 plus date filter; discriminate by `incomes.length === 0`) |
| Error | None | `{isError ? <ErrorState … /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (`searchTerm` state, line 303) | Yes — dual empty |
| Hook destructuring | `const { data: incomes, isLoading } = useIncomes(…)` | Add `isError`, `error`, `refetch` |

### expenses (transactions/expenses)

| Aspect | Before | After |
|---|---|---|
| File | `src/app/dashboard/transactions/expenses/page.tsx` | same |
| Loading (lines 640–647) | `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>` | `<TableStateBody>` |
| Empty (lines 664–673) | Plain text "No se encontraron gastos." | `Inbox` no-data with `NewExpenseDialog` action; `SearchX` no-results with `setSearchTerm("")` (discriminate by `expenses.length === 0`) |
| Error | None | `{isError ? <ErrorState … /> : <frame>}` |
| colSpan source | `columns.length` | `table.getVisibleLeafColumns().length` |
| Has search | Yes (`searchTerm` state, line 322) | Yes — dual empty |
| Hook destructuring | `const { data: expenses, isLoading } = useExpenses(…)` | Add `isError`, `error`, `refetch` |

---

## bank-accounts — special handling

bank-accounts is handled last because it has the highest structural risk (mobile/desktop split, early-return skeleton, bespoke layout).

### Structural rules

- `AccountsPageSkeleton` (lines 166–202): may be kept as-is or rebuilt from `Skeleton` leaf components — implementer's call; no visual regression.
- `AccountsEmptyState` (lines 204–234): **replace** with shared `<EmptyState icon={Landmark} …>`. The `hasFilters` prop maps to the no-results vs no-data discrimination. The create action (`<NewBankAccountDialog />`) and clear-filters action are passed as the `action` prop.
- Inline error alert (lines 896–907): **replace** with `<ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} />`.
- Mobile card branch (lines 910–1046): **no changes**. The card grid, `DropdownMenu` per row, and mobile pagination remain untouched.
- Desktop table `<TableBody>` (line 1063): the current pattern already renders rows directly (loading/empty/error are handled at the Card level above). The implementer SHALL add `<TableStateBody>` to the desktop `<TableBody>` only for the loading and empty branches — which are currently absent at that level (they resolve at the Card level). If the current card-level loading and empty are correct, `<TableStateBody>` may be a thin passthrough (`isLoading={false}` `isEmpty={false}`) at this location, since the bank-accounts page uses an early-return for loading (line 713) and an outer empty check (line 908–909) before reaching the table. The implementer SHALL verify the actual control flow and apply `<TableStateBody>` where it eliminates duplication without changing behavior.
- `hasFilters` / `hasActiveFilters` discrimination logic: **unchanged**.

### bank-accounts empty-state copy mapping

| Condition | Icon | Title | Description | Action |
|---|---|---|---|---|
| No accounts, no filters | `Landmark` | "Todavia no hay cuentas financieras" | "Crea una cuenta bancaria o caja para empezar…" | `<NewBankAccountDialog />` |
| Filtered set empty | `Landmark` | "No hay cuentas con esos filtros" | "Prueba ajustando la busqueda, sucursal o estado…" | `<Button onClick={onReset}>Limpiar filtros</Button>` |

---

## Empty-state copy table (per page)

| Page | No-data icon | No-data title | No-data action | Has search | No-results icon | No-results action |
|---|---|---|---|---|---|---|
| payables | `Inbox` | "Sin cuentas por pagar" | Open `NewPayableDialog` | Yes | `SearchX` | `setSearchQuery("")` |
| receivables | `Inbox` | "Sin cuentas por cobrar" | Open `NewReceivableDialog` | Yes | `SearchX` | `setSearchQuery("")` |
| branches | `Inbox` | "Sin sucursales" | Open `NewBranchDialog` | Yes | `SearchX` | Clear name column filter |
| clients | `Inbox` | "Sin clientes" | `NewClientDialog` (if permitted) | Yes | `SearchX` | Clear name column filter |
| invoices | `Inbox` | "Sin facturas" | Open `NewInvoiceDialog` | Yes | `SearchX` | Clear id column filter |
| incomes | `Inbox` | "Sin ingresos" | Open `NewIncomeDialog` | Yes | `SearchX` | `setSearchTerm("")` |
| expenses | `Inbox` | "Sin gastos" | Open `NewExpenseDialog` | Yes | `SearchX` | `setSearchTerm("")` |
| bank-accounts | `Landmark` | (see bank-accounts section) | (see bank-accounts section) | Yes (filter-aware) | `Landmark` | `resetFilters()` |

All no-data descriptions follow: "Registra el primero para verlo aquí." (or the existing bank-accounts phrasing).
All no-results descriptions: "Ajusta o limpia el filtro."

---

## Rejected alternative: Wrapper B — full data-table shell

A component that accepts the full react-table instance and renders the entire frame (header + body + error + pagination + toolbar) was considered.

**Rejected because:** it would have to generalize row click handlers, row selection, print triggers, payment dialogs, and per-page toolbar markup across seven distinct pages. The surface area of the abstraction exceeds the duplication it removes, and any subtle behavior difference would silently break a page. `<TableStateBody>` removes the highest-value duplication (the tbody conditional and the error guard) with near-zero coupling to each page's bespoke structure.
