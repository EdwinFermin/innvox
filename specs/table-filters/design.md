# Design — table-filters

## No new dependencies

This feature introduces zero new npm packages. Date inputs use native
`<input type="date">`. The `Select` primitive is the existing Radix-UI-based
component at `src/components/ui/select.tsx`.

---

## Status values confirmed

Search across migrations, dialogs, and page files confirms three real status values for
both payables and receivables:

| Value | Source |
| --- | --- |
| `"pendiente"` | `new-payable-dialog.tsx:201`, `new-receivable-dialog.tsx:208`, migration `018` |
| `"pagado"` | `new-payable-dialog.tsx:202`, `new-receivable-dialog.tsx:209`, migration `018` |
| `"parcial"` | migration `018_withdrawals_and_receivable_payments.sql:101` (`v_status := CASE WHEN v_new_paid >= v_rec.amount THEN 'pagado' ELSE 'parcial' END`) |
| `"vencido"` | **not found** — excluded from filter options |

---

## Files to touch

| File | Change |
| --- | --- |
| `src/components/filters/filter-field.tsx` | **Create.** Shared `FilterField` component. |
| `src/components/filters/active-filter-chip.tsx` | **Create.** Shared `ActiveFilterChip` component. |
| `src/components/filters/select-filter.tsx` | **Create.** Shared `SelectFilter` component wrapping the `Select` primitive. |
| `src/components/filters/date-range-filter.tsx` | **Create.** Shared `DateRangeFilter` (Desde/Hasta native inputs). |
| `src/components/filters/index.ts` | **Create.** Barrel re-export for all four components. |
| `src/app/dashboard/payables/page.tsx` | Add status `SelectFilter` in `<TableToolbar filters>` slot; add active chips + reset; wire into `filteredPayables`. |
| `src/app/dashboard/receivables/page.tsx` | Same as payables: status `SelectFilter`, chips, reset. |
| `src/app/dashboard/transactions/incomes/page.tsx` | Replace raw filter panel with `DateRangeFilter` + `SelectFilter` in toolbar slot; fix search+date composition; add chips + reset. |
| `src/app/dashboard/transactions/expenses/page.tsx` | Same as incomes. |
| `src/app/dashboard/bank-accounts/page.tsx` | Remove in-file `FilterField` / `ActiveFilterChip` functions; import and use the shared components; replace four inline `<Select>` blocks with `SelectFilter`; no layout or behavior change. |

---

## Shared component signatures

```typescript
// src/components/filters/filter-field.tsx
type FilterFieldProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  htmlFor?: string;
  children: React.ReactNode;
};

export function FilterField({ label, icon: Icon, htmlFor, children }: FilterFieldProps): React.JSX.Element;
// Renders:
//   <div className="space-y-2 min-w-0">
//     <label htmlFor={htmlFor}
//            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
//       <Icon className="h-3.5 w-3.5" />
//       {label}
//     </label>
//     {children}
//   </div>


// src/components/filters/active-filter-chip.tsx
type ActiveFilterChipProps = {
  label: string;
  onRemove: () => void;
};

export function ActiveFilterChip({ label, onRemove }: ActiveFilterChipProps): React.JSX.Element;
// Renders:
//   <button
//     type="button"
//     onClick={onRemove}
//     className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
//     aria-label={`Quitar filtro ${label}`}
//   >
//     <span>{label}</span>
//     <X className="h-3.5 w-3.5 text-muted-foreground" />
//   </button>


// src/components/filters/select-filter.tsx
type SelectFilterOption = {
  value: string;   // never "all"
  label: string;
};

type SelectFilterProps = {
  value: string;                       // "all" or one of the option values
  onValueChange: (value: string) => void;
  options: SelectFilterOption[];
  allLabel: string;                    // label for the implicit "all" option
  ariaLabel?: string;
  className?: string;
};

export function SelectFilter({
  value,
  onValueChange,
  options,
  allLabel,
  ariaLabel,
  className,
}: SelectFilterProps): React.JSX.Element;
// Renders:
//   <Select value={value} onValueChange={onValueChange}>
//     <SelectTrigger
//       aria-label={ariaLabel}
//       className={cn("h-11 w-full rounded-2xl border-border/70 bg-muted data-[size=default]:h-11", className)}
//     >
//       <SelectValue />
//     </SelectTrigger>
//     <SelectContent>
//       <SelectItem value="all">{allLabel}</SelectItem>
//       {options.map(opt => (
//         <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
//       ))}
//     </SelectContent>
//   </Select>


// src/components/filters/date-range-filter.tsx
type DateRangeFilterProps = {
  startDate: string;     // "YYYY-MM-DD" or ""
  endDate: string;       // "YYYY-MM-DD" or ""
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startLabel?: string;   // default "Desde"
  endLabel?: string;     // default "Hasta"
};

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "Desde",
  endLabel = "Hasta",
}: DateRangeFilterProps): React.JSX.Element;
// Renders two div.space-y-1 blocks, each with a <label> and
// <input type="date" className="h-11 w-full rounded-2xl border border-input bg-background px-3" />.


// src/components/filters/index.ts  (barrel)
export { FilterField } from "./filter-field";
export { ActiveFilterChip } from "./active-filter-chip";
export { SelectFilter } from "./select-filter";
export { DateRangeFilter } from "./date-range-filter";
```

---

## Per-table filter map

| Page | Filters added / changed | Renders in | Active chips | Reset |
| --- | --- | --- | --- | --- |
| `payables/page.tsx` | Status (`SelectFilter`, options: Todas/Pendiente/Pagado/Parcial) | `<TableToolbar filters>` slot | Yes — one chip per active filter | "Limpiar todo" → status back to `"all"` |
| `receivables/page.tsx` | Status (`SelectFilter`, same options) | `<TableToolbar filters>` slot | Yes | "Limpiar todo" → status back to `"all"` |
| `transactions/incomes/page.tsx` | Replace raw Desde/Hasta with `DateRangeFilter`; replace raw branch/type `<Select>` with `SelectFilter`; **fix search+date composition** | `<TableToolbar filters>` slot | Yes — chip per active date/branch/type | "Limpiar todo" → today/today, ALL, ALL |
| `transactions/expenses/page.tsx` | Same changes as incomes | `<TableToolbar filters>` slot | Yes | Same reset |
| `bank-accounts/page.tsx` | Refactor in-file `FilterField` / `ActiveFilterChip` / four inline `<Select>` → shared components. Filter Card layout unchanged. | Existing filter Card (NOT `<TableToolbar filters>`) | Yes (already present — no behavior change) | `resetFilters()` unchanged |

---

## Search + date composition fix (incomes and expenses)

### Current broken behavior — incomes page

In `src/app/dashboard/transactions/incomes/page.tsx` at line 309:

```typescript
const hasSearch = searchTerm.trim().length > 0;
const { data: incomes, isLoading } = useIncomes(
  user?.id || "",
  hasSearch ? {} : { startDate, endDate },   // <-- date range suppressed when searching
);
```

And inside the `filteredIncomes` `useMemo` (lines 375–378):

```typescript
if (!normalizedSearch) {
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
}
```

Both guards combine to make the date range completely inert while `searchTerm` is
non-empty.

### Corrected behavior

1. Pass `{ startDate, endDate }` unconditionally to `useIncomes` (remove the
   `hasSearch ?` ternary). The hook already fetches all rows for the user — narrowing
   the date on the server is an optimization, not a correctness requirement; but making
   it always active is strictly correct.
2. Remove the `if (!normalizedSearch)` guard in `filteredIncomes` so the date
   comparison always runs.

Corrected `useIncomes` call:
```typescript
const { data: incomes, isLoading } = useIncomes(
  user?.id || "",
  { startDate, endDate },
);
```

Corrected date block inside `filteredIncomes`:
```typescript
const dateKey = normalizeDateKey(income.date);
if (!dateKey) return false;
if (startDate && dateKey < startDate) return false;
if (endDate && dateKey > endDate) return false;
```

The same two changes apply verbatim to `src/app/dashboard/transactions/expenses/page.tsx`
(replace `useIncomes` with `useExpenses`, `filteredIncomes` with `filteredExpenses`,
`income` with `expense`). The expenses page does not have the `hasSearch` ternary in the
hook call (it currently calls `useExpenses(user?.id || "")` with no date params), so only
step 2 (remove `if (!normalizedSearch)`) applies there; step 1 means adding the date
params to the `useExpenses` call.

---

## bank-accounts refactor detail

The existing bank-accounts page defines two in-file React functions that duplicate what
the new shared components will provide:

- `FilterField` at lines 121–144: **delete** and import from `@/components/filters`.
- `ActiveFilterChip` at lines 146–164: **delete** and import from `@/components/filters`.

Each `<Select>` block inside the filter Card (status, type, branch, currency) is wrapped
in an ad-hoc `<FilterField>` + inline `<SelectTrigger>` / `<SelectContent>` /
`<SelectItem>` chain (lines 800–865). These are replaced with `<SelectFilter>` inside
the same `<FilterField>`, preserving:

- The outer `FilterField` label and icon for each filter.
- The `className` on the `SelectTrigger` (`"h-11 w-full rounded-2xl border-border/70 bg-muted data-[size=default]:h-11"`) — already the `SelectFilter` default.
- The option values and labels verbatim.
- The `xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]` layout grid (line 783).
- The active chips + "Limpiar todo" at lines 869–889.
- `resetFilters` at lines 690–696 — function body unchanged.

---

## Rejected alternative

**Placing shared filter components under `src/components/ui/`** — rejected because
`src/components/ui/` is reserved for generic design-system primitives (Button, Input,
Select, etc.) that have no domain semantics. Filter components (`FilterField`,
`SelectFilter`, `DateRangeFilter`) have semantic relationships to the concept of
"filtering a list" and compose domain-specific label text and layout. A dedicated
`src/components/filters/` directory keeps this distinction clear, matches the
convention of one-concern-per-directory, and mirrors the upcoming `table-toolbar` and
`table-states` additions which also live in `src/components/ui/` (generic) rather than
mixing domain-specific layout into the primitive layer.
