# Design — table-toolbar

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/table-column-toggle.tsx` | **Create.** Standalone column-visibility dropdown extracted from all 8 pages. |
| `src/components/ui/table-pagination.tsx` | **Create.** Footer row extracted from all 8 pages (optional visibilityControl slot, TablePageSize, row count, Anterior/Siguiente). |
| `src/components/ui/table-toolbar.tsx` | **Create.** Grid wrapper for the 7 grid pages: controlled search input, internally-rendered TableColumnToggle, and a `filters` slot reserved for `table-filters`. |
| `src/app/dashboard/payables/page.tsx` | Adopt TableToolbar (lines 338–375) + TablePagination (lines 459–489). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/receivables/page.tsx` | Adopt TableToolbar (lines 360–397) + TablePagination (lines 456–487). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/branches/page.tsx` | Adopt TableToolbar (lines 297–337) + TablePagination (lines 395–420). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/clients/page.tsx` | Adopt TableToolbar (lines 224–265) + TablePagination (lines 323–349). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/invoices/page.tsx` | Adopt TableToolbar (lines 358–399) + TablePagination (lines 457–488). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/transactions/incomes/page.tsx` | Adopt TableToolbar (lines 527–565) + TablePagination (lines 687–717). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/transactions/expenses/page.tsx` | Adopt TableToolbar (lines 519–554) + TablePagination (lines 676–706). Remove now-unused DropdownMenu, ChevronDown, Input imports if fully replaced. |
| `src/app/dashboard/bank-accounts/page.tsx` | Replace column-dropdown block (lines 758–779) with TableColumnToggle; replace desktop footer (lines 1081–1108) with TablePagination. Do NOT touch filter Card, mobile footer, or responsive split. |

## Approach

1. Create `TableColumnToggle` — pure extraction of the column dropdown present verbatim across all 8 pages. Accepts a generic `Table<TData>` and a `columnLabels` map; renders the trigger button and checkbox items identically.
2. Create `TablePagination` — pure extraction of the footer row. Accepts a generic `Table<TData>`, `totalFiltered` (a pre-computed number passed by the page so bank-accounts can pass `filteredAccounts.length` and grid pages pass `table.getFilteredRowModel().rows.length`), an optional `visibilityControl` ReactNode slot, and optional `pageSizeOptions`. The row-count label always uses the caller-supplied `totalFiltered` value to avoid changing per-page counting logic.
3. Create `TableToolbar` — composes TableColumnToggle internally. Accepts controlled search props, `table`, `columnLabels`, and an empty `filters` slot. Uses the same `isMobile`-conditional class that every grid page uses today: `grid-cols-[minmax(0,1fr)_auto]` on desktop, `grid-cols-1` on mobile. The `isMobile` boolean is passed as a prop (not re-derived inside the component) so the toolbar does not add a hook that could cause hydration issues — pages already have `useIsMobile()` and pass its result.
4. Adopt the 7 grid pages: replace the inline toolbar div and the pagination footer div with the two new components, wiring search exactly as each page does today (state value for pattern-A pages, column filter getter/setter for pattern-B pages). Each page keeps its local `getColumnLabel`/`columnLabels` map unchanged and passes it in.
5. Adopt bank-accounts partially: swap only the column-dropdown block and the desktop pagination footer; leave the filter Card and mobile footer untouched.
6. Run `npm run lint`, `npm run typecheck`, `npm run build` to verify no regressions.

Note: this feature is implemented after `table-states` completes. Both features touch the same 8 page files but in disjoint regions — `table-states` modifies the `<TableBody>` contents, while `table-toolbar` modifies the toolbar div above and the footer div below. There is no conflict as long as `table-states` is merged first (per the `dependsOn` constraint).

## Signatures / data shapes

```typescript
// src/components/ui/table-column-toggle.tsx
import type { Table } from "@tanstack/react-table";

type TableColumnToggleProps<TData> = {
  table: Table<TData>;
  columnLabels: Record<string, string>;
};

export function TableColumnToggle<TData>({
  table,
  columnLabels,
}: TableColumnToggleProps<TData>): React.JSX.Element;
// Renders:
//   <div className="w-full sm:w-auto">
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="outline" className="h-11 w-full rounded-2xl border-border/70 bg-background/80">
//           Columnas <ChevronDown />
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end">
//         {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
//           <DropdownMenuCheckboxItem
//             key={column.id}
//             className="capitalize"
//             checked={column.getIsVisible()}
//             onCheckedChange={(value) => column.toggleVisibility(!!value)}
//           >
//             {columnLabels[column.id] ?? column.id}
//           </DropdownMenuCheckboxItem>
//         ))}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   </div>


// src/components/ui/table-pagination.tsx
import type { Table } from "@tanstack/react-table";

type TablePaginationProps<TData> = {
  table: Table<TData>;
  totalFiltered: number;
  visibilityControl?: React.ReactNode;
  pageSizeOptions?: number[];
};

export function TablePagination<TData>({
  table,
  totalFiltered,
  visibilityControl,
  pageSizeOptions,
}: TablePaginationProps<TData>): React.JSX.Element;
// Renders:
//   <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
//     {visibilityControl}                       {/* optional leading slot */}
//     <TablePageSize table={table} options={pageSizeOptions} />
//     <div className="text-muted-foreground flex-1 text-sm">{totalFiltered} filas</div>
//     <div className="space-x-2">
//       <Button variant="outline" size="sm" className="rounded-xl"
//               onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
//         Anterior
//       </Button>
//       <Button variant="outline" size="sm" className="rounded-xl"
//               onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
//         Siguiente
//       </Button>
//     </div>
//   </div>


// src/components/ui/table-toolbar.tsx
import type { Table } from "@tanstack/react-table";

type TableToolbarProps<TData> = {
  table: Table<TData>;
  columnLabels: Record<string, string>;
  isMobile: boolean;           // passed from the page's useIsMobile() to avoid duplicate hook
  searchValue: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filters?: React.ReactNode;   // composition seam for table-filters; empty now
};

export function TableToolbar<TData>({
  table,
  columnLabels,
  isMobile,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
}: TableToolbarProps<TData>): React.JSX.Element;
// Renders:
//   <div className={`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
//     <Input
//       aria-label={searchAriaLabel}
//       placeholder={searchPlaceholder}
//       value={searchValue}
//       onChange={onSearchChange}
//       className="h-11 rounded-2xl border-border/70 bg-background/80"
//     />
//     <TableColumnToggle table={table} columnLabels={columnLabels} />
//     {filters}
//   </div>
```

### `filters` slot — composition contract for `table-filters`

The `filters?: React.ReactNode` prop on `TableToolbar` is deliberately empty in this feature. The next feature, `table-filters`, will pass its filter controls (status dropdown, date-range pickers, branch select, etc.) into this slot without re-extracting or re-wrapping the toolbar. `table-filters` SHALL NOT re-extract `TableToolbar`; it SHALL only populate the `filters` prop. This contract must be recorded in the `table-filters` discovery when that feature begins.

### Per-page adoption table

| Page file | Search pattern | Search state / getter | TableToolbar? | TablePagination? | visibilityControl in footer? |
| --- | --- | --- | --- | --- | --- |
| `payables/page.tsx` | A (state) | `searchQuery` / `setSearchQuery` | Yes | Yes | Yes (`ListVisibilityControl`) |
| `receivables/page.tsx` | A (state) | `searchQuery` / `setSearchQuery` | Yes | Yes | Yes (`ListVisibilityControl`) |
| `branches/page.tsx` | B (column filter, key `"name"`) | `table.getColumn("name")?.getFilterValue()` | Yes | Yes | No |
| `clients/page.tsx` | B (column filter, key `"name"`) | `table.getColumn("name")?.getFilterValue()` | Yes | Yes | No |
| `invoices/page.tsx` | B (column filter, key `"id"`) | `table.getColumn("id")?.getFilterValue()` | Yes | Yes | Yes (`ListVisibilityControl`) |
| `transactions/incomes/page.tsx` | A (state) | `searchTerm` / `setSearchTerm` | Yes | Yes | Yes (`ListVisibilityControl`) |
| `transactions/expenses/page.tsx` | A (state) | `searchTerm` / `setSearchTerm` | Yes | Yes | Yes (`ListVisibilityControl`) |
| `bank-accounts/page.tsx` | N/A (bespoke filter Card) | — | No (TableColumnToggle standalone inside Card) | Yes (desktop footer only) | No |

Notes:
- branches has a bespoke row-count label: `{selected} de {total} filas seleccionadas.` — this is passed as `totalFiltered` from the page, which must compute and pass `table.getFilteredSelectedRowModel().rows.length` separately, or the label can be passed as a `rowCountLabel` prop. See the task notes for the chosen approach.
- bank-accounts passes `filteredAccounts.length` as `totalFiltered` to `TablePagination` (not the table's filtered row model, since it filters before feeding the table).

## Rejected alternative

**Centralizing all column labels into a single shared dictionary** — rejected because column labels are page-domain knowledge tied to per-domain column definitions. A central catalog would couple unrelated pages, require a single file to be touched for every future column addition anywhere in the app, and would not reduce any runtime behavior. Keeping labels local and passing them as a prop achieves the same deduplication of the dropdown rendering logic with zero cross-page coupling.
