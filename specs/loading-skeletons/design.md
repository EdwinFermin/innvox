# Design — loading-skeletons

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/table-skeleton.tsx` | Create. Exports `TableSkeleton({ rows, columns })`. Uses `TableRow`, `TableCell`, and `Skeleton` primitives. No new dependencies. |
| `src/app/dashboard/payables/page.tsx` | Replace the `isLoading` branch (lines 381–388) that renders a single `SpinnerLabel` `<TableRow>` with `<TableSkeleton rows={table.getState().pagination.pageSize} columns={table.getVisibleLeafColumns().length} />`. Add import for `TableSkeleton`. Remove import of `SpinnerLabel` if it is no longer used elsewhere in the file. |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Replace the `isLoading` ternary branch (lines 257–259) that renders "Cargando movimientos..." with a dedicated `{isLoading ? <TableSkeleton rows={8} columns={5} /> : null}` block rendered before the empty-state row, keeping the existing `<TableBody>` structure. Add import for `TableSkeleton`. |

## Approach

1. Create `src/components/ui/table-skeleton.tsx`. The component receives `rows: number` and `columns: number`. It renders a React fragment containing `rows` copies of `<TableRow>`, each containing `columns` copies of `<TableCell>` with a `<Skeleton className="h-4 w-full" />` inside. Use `Array.from({ length: n })` with index keys — stable enough for a static loading state. No `"use client"` directive is required since the component contains no hooks or browser APIs; the parent pages are already `"use client"`.

2. Wire payables (`src/app/dashboard/payables/page.tsx`). In the `<TableBody>` branch:
   - Before: single `<TableRow><TableCell colSpan={columns.length}><SpinnerLabel /></TableCell></TableRow>`.
   - After: `<TableSkeleton rows={table.getState().pagination.pageSize} columns={table.getVisibleLeafColumns().length} />`.
   - The page size is read from TanStack table state (`table.getState().pagination.pageSize`), which defaults to `10` (set by `getPaginationRowModel()` with no explicit `initialState`). The column count is read from `table.getVisibleLeafColumns().length` to respect any column-visibility toggles the user may have applied before the data loads.

3. Wire cuadre (`src/app/dashboard/reports/cuadre-del-dia/page.tsx`). The current structure renders a single `<TableRow>` for either "Cargando movimientos..." or "Sin movimientos..." based on `isLoading` or empty `report.movementRows`. Restructure the `<TableBody>` body so that:
   - When `isLoading` is `true`: render `<TableSkeleton rows={8} columns={5} />`.
   - When `isLoading` is `false` and `report.movementRows.length === 0`: render the "Sin movimientos..." empty row.
   - Otherwise: render the mapped movement rows.
   - The fixed `rows={8}` is the documented fallback for pages without a pagination control; `columns={5}` matches the five static `<TableHead>` cells (Hora, Tipo, Descripción, Cuenta / origen, Monto).

4. Run `npm run lint` and `npm run typecheck` after all edits. No migrations or new dependencies needed.

## Signatures / data shapes

```tsx
// src/components/ui/table-skeleton.tsx

import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows: number;
  columns: number;
}

export function TableSkeleton({ rows, columns }: TableSkeletonProps): JSX.Element;
```

Usage in payables page:
```tsx
// rows  = table.getState().pagination.pageSize  (TanStack; default 10)
// columns = table.getVisibleLeafColumns().length (respects column visibility)
<TableSkeleton
  rows={table.getState().pagination.pageSize}
  columns={table.getVisibleLeafColumns().length}
/>
```

Usage in cuadre page:
```tsx
// rows  = 8  (fixed fallback; cuadre has no pagination control)
// columns = 5 (Hora | Tipo | Descripción | Cuenta / origen | Monto)
<TableSkeleton rows={8} columns={5} />
```

## Rejected alternative

**Option B — bespoke skeleton per page** — rejected because two tables share the same visual shape (rows of uniform cells), so a shared `TableSkeleton(rows, columns)` eliminates duplication and keeps the skeleton consistent if the Skeleton primitive's aesthetic ever changes. Bespoke per-page skeletons (as used for the dashboard KPI cards and charts, which have distinct non-tabular shapes) are appropriate only when the layout is unique; table body rows are not unique.
