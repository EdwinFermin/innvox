# Tasks — table-filters

## Execution order

Build shared components first (T1–T5), then payables/receivables (T6–T7), then
incomes/expenses including the composition fix (T8–T9), then the bank-accounts
refactor (T10 — highest regression risk), then cross-cutting verification (T11–T14).

---

## Tasks

### T1 — Create `FilterField` shared component ✅

- **File:** `src/components/filters/filter-field.tsx` (create)
- **What:** Promote the in-file `FilterField` from `bank-accounts/page.tsx` (lines
  121–144) into a standalone exported component matching the signature in `design.md`.
- **Covers:** R1
- **Test:** Render `<FilterField label="Test" icon={SomeIcon}>child</FilterField>` and
  assert the label text, icon element, and child are present in the output; assert
  `aria-label` is absent (the label element itself carries the text).

### T2 — Create `ActiveFilterChip` shared component ✅

- **File:** `src/components/filters/active-filter-chip.tsx` (create)
- **What:** Promote the in-file `ActiveFilterChip` from `bank-accounts/page.tsx` (lines
  146–164) into a standalone exported component matching the signature in `design.md`.
- **Covers:** R2, R37
- **Test:** Render `<ActiveFilterChip label="Estado" onRemove={fn} />`; assert
  `aria-label="Quitar filtro Estado"` is on the button; click it and assert `fn` was
  called.

### T3 — Create `SelectFilter` shared component ✅

- **File:** `src/components/filters/select-filter.tsx` (create)
- **What:** A labeled `Select` wrapper with an implicit "all" first option. Uses the
  existing `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
  from `src/components/ui/select.tsx`. Implements the signature in `design.md`.
- **Covers:** R3, R4
- **Test:** Render with `options=[{value:"a", label:"A"}]`, `allLabel="Todas"`,
  `value="all"`; assert the "Todas" option is first; assert `onValueChange` is called
  with `"a"` when the "A" option is selected.

### T4 — Create `DateRangeFilter` shared component ✅

- **File:** `src/components/filters/date-range-filter.tsx` (create)
- **What:** Two native `<input type="date">` controls labelled "Desde"/"Hasta" (or
  custom `startLabel`/`endLabel`). No new dependency. Implements the signature in
  `design.md`.
- **Covers:** R5, R6, R7
- **Test:** Render with `startDate="2026-01-01"`, `endDate="2026-01-31"`; assert two
  `input[type=date]` elements with the correct values; change startDate input and
  assert `onStartDateChange` is called; change endDate input and assert
  `onEndDateChange` is called.

### T5 — Create barrel export `src/components/filters/index.ts` ✅

- **File:** `src/components/filters/index.ts` (create)
- **What:** Re-export all four components: `FilterField`, `ActiveFilterChip`,
  `SelectFilter`, `DateRangeFilter`.
- **Covers:** (enables T6–T10 to import from `@/components/filters`)
- **Test:** TypeScript compilation via `npm run typecheck` (no dedicated test needed).

### T6 — Add status filter to payables page ✅

- **File:** `src/app/dashboard/payables/page.tsx` (edit)
- **What:**
  1. Add `statusFilter` state: `React.useState<string>("all")`.
  2. Wire filter into `filteredPayables` (client-side): add a guard
     `if (statusFilter !== "all" && (payable.status ?? "").toLowerCase() !== statusFilter) return false`.
  3. Build `activeFilterChips` array and `resetFilters` callback.
  4. Pass `<SelectFilter>` (status) into `<TableToolbar filters={…}>`.
  5. Render `ActiveFilterChip`s and "Limpiar todo" below the toolbar (or inside the
     filters slot — match the pattern of bank-accounts).
  - Status options: `{ value: "pendiente", label: "Pendiente" }`, `{ value: "pagado", label: "Pagado" }`, `{ value: "parcial", label: "Parcial" }`. `allLabel="Todas"`.
- **Covers:** R8, R9, R10, R11, R12, R13, R36, R37, R38
- **Test:** With `statusFilter="pendiente"`, assert only rows with `status === "pendiente"` pass through. With `statusFilter="all"`, assert all rows pass. Click chip remove → filter resets. Click "Limpiar todo" → all filters reset.

### T7 — Add status filter to receivables page ✅

- **File:** `src/app/dashboard/receivables/page.tsx` (edit)
- **What:** Mirror T6 exactly for receivables (`filteredReceivables`). Same status
  options and "all" logic.
- **Covers:** R14, R15, R16, R17, R18, R19, R36, R37, R38
- **Test:** Same assertions as T6, applied to receivables data.

### T8 — Standardize filters on incomes page + fix search+date composition ✅

- **File:** `src/app/dashboard/transactions/incomes/page.tsx` (edit)
- **What:**
  1. Replace the `hasSearch ? {} : { startDate, endDate }` ternary in the `useIncomes`
     call (line 309) with `{ startDate, endDate }` unconditionally.
  2. Remove the `if (!normalizedSearch)` guard around date comparisons in
     `filteredIncomes` (lines 375–378) so the date range always applies.
  3. Replace the standalone filter panel (`dashboard-panel grid gap-3 p-4 sm:grid-cols-4`)
     with a `DateRangeFilter` + two `SelectFilter`s (Sucursal, Tipo de ingreso) passed
     into `<TableToolbar filters={…}>`.
  4. Build `activeFilterChips` (one per active date/branch/type deviation from defaults)
     and `resetFilters` (resets to today/today, ALL, ALL).
  5. Render chips + "Limpiar todo" consistently.
- **Covers:** R20, R21, R22, R23, R24, R25, R36, R37
- **Test:**
  - Set `searchTerm="foo"` and a date range; assert that `filteredIncomes` still applies
    the date comparison (both filters active simultaneously).
  - Set `startDate` to a past date; assert rows outside the range are excluded even when
    search is non-empty.
  - Click "Limpiar todo"; assert all filter states reset to defaults.

### T9 — Standardize filters on expenses page + fix search+date composition ✅

- **File:** `src/app/dashboard/transactions/expenses/page.tsx` (edit)
- **What:** Mirror T8 for expenses. Differences:
  - `useExpenses` currently receives no date params; add `{ startDate, endDate }` to the
    call.
  - Remove the `if (!normalizedSearch)` guard in `filteredExpenses` (line 367).
  - Replace the filter panel with `DateRangeFilter` + two `SelectFilter`s (Sucursal,
    Tipo de gasto) in `<TableToolbar filters={…}>`.
  - Build chips + reset.
- **Covers:** R26, R27, R28, R29, R30, R31, R36, R37
- **Test:** Same assertions as T8, applied to expenses data.

### T10 — Refactor bank-accounts onto shared components (highest regression risk) ✅

- **File:** `src/app/dashboard/bank-accounts/page.tsx` (edit)
- **What:**
  1. Delete the in-file `FilterField` function (lines 121–144).
  2. Delete the in-file `ActiveFilterChip` function (lines 146–164).
  3. Add import: `import { FilterField, ActiveFilterChip, SelectFilter } from "@/components/filters"`.
  4. Replace each inline `<Select>…</Select>` block for status (lines 800–814), type
     (816–830), branch (832–848), and currency (851–865) with `<SelectFilter …>` inside
     the existing `<FilterField>` wrappers, preserving option values, labels, and
     `aria-label`s.
  5. No change to: layout grid (`xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]`), the
     filter Card structure (lines 741–892), active chips block (869–889), "Limpiar todo"
     button, `resetFilters` body (690–696), the column-toggle block (758–779), or any
     other region of the file.
- **Covers:** R32, R33, R34, R35, R36, R37
- **Test:** Verify all four selects still render their options correctly; apply a filter
  and assert rows narrow; click "Limpiar todo" and assert reset; visually confirm the
  filter Card layout is unchanged.

### T11 — Manual verification: each table filters correctly ✅ (static verification — no test runner)

- **What:** For each of the five affected tables (payables, receivables, incomes, expenses,
  bank-accounts), manually confirm:
  1. Each filter control narrows the displayed rows to only matching rows.
  2. Removing a chip via its `×` button resets only that filter; other filters remain.
  3. "Limpiar todo" resets all filters at once.
  4. Search and date-range compose on incomes and expenses (both active simultaneously).
- **Covers:** R9, R10, R12, R13, R15, R16, R18, R19, R21, R22, R24, R25, R27, R28, R30, R31, R35

### T12 — Run `npm run lint` ✅ (exit 0)

- **What:** Confirm no ESLint errors are introduced by the new files and edits.
- **Covers:** All — prevents regressions from import changes.

### T13 — Run `npm run typecheck` ✅ (exit 0)

- **What:** Confirm no TypeScript errors across the codebase after all changes.
- **Covers:** All — particularly the generic signatures of `SelectFilter` and
  `DateRangeFilter`.

### T14 — Run `npm run build` ✅ (exit 0, compiled successfully)

- **What:** Confirm the production build completes without errors.
- **Covers:** All — catches any server/client component boundary issues with the new
  `"use client"` filter components.

---

## Traceability table

| Requirement | Task(s) | Verification |
| --- | --- | --- |
| R1 — FilterField renders label + icon | T1 | T1 unit test |
| R2 — ActiveFilterChip aria-label + onRemove | T2 | T2 unit test |
| R3 — SelectFilter first option is "all" | T3 | T3 unit test |
| R4 — SelectFilter value="all" means no filter | T3, T6, T7, T8, T9 | T3 unit test; T11 manual |
| R5 — DateRangeFilter two date inputs | T4 | T4 unit test |
| R6 — DateRangeFilter callbacks fire | T4 | T4 unit test |
| R7 — No new dependency | T4 | T14 build; package.json check |
| R8 — payables status SelectFilter | T6 | T11 manual |
| R9 — payables non-all filters rows | T6 | T6 unit test; T11 manual |
| R10 — payables all shows all | T6 | T6 unit test |
| R11 — payables active chips | T6 | T11 manual |
| R12 — payables chip remove | T6 | T6 unit test; T11 manual |
| R13 — payables Limpiar todo | T6 | T6 unit test; T11 manual |
| R14 — receivables status SelectFilter | T7 | T11 manual |
| R15 — receivables non-all filters rows | T7 | T7 unit test |
| R16 — receivables all shows all | T7 | T7 unit test |
| R17 — receivables active chips | T7 | T11 manual |
| R18 — receivables chip remove | T7 | T7 unit test; T11 manual |
| R19 — receivables Limpiar todo | T7 | T7 unit test; T11 manual |
| R20 — incomes filters in toolbar slot | T8 | T11 manual |
| R21 — incomes search+date compose | T8 | T8 unit test; T11 manual |
| R22 — incomes hasSearch short-circuit removed | T8 | T8 unit test (assert date filter active when searchTerm non-empty) |
| R23 — incomes active chips | T8 | T11 manual |
| R24 — incomes chip remove | T8 | T8 unit test; T11 manual |
| R25 — incomes Limpiar todo | T8 | T8 unit test; T11 manual |
| R26 — expenses filters in toolbar slot | T9 | T11 manual |
| R27 — expenses search+date compose | T9 | T9 unit test; T11 manual |
| R28 — expenses normalizedSearch guard removed | T9 | T9 unit test |
| R29 — expenses active chips | T9 | T11 manual |
| R30 — expenses chip remove | T9 | T9 unit test; T11 manual |
| R31 — expenses Limpiar todo | T9 | T9 unit test; T11 manual |
| R32 — bank-accounts uses shared FilterField | T10 | T13 typecheck; T11 manual |
| R33 — bank-accounts uses shared ActiveFilterChip | T10 | T13 typecheck; T11 manual |
| R34 — bank-accounts uses SelectFilter with same options | T10 | T11 manual |
| R35 — bank-accounts no regression | T10 | T11 manual; T14 build |
| R36 — no chips shown when no active filters | T6, T7, T8, T9, T10 | T11 manual |
| R37 — chip aria-label format | T2, T6, T7, T8, T9, T10 | T2 unit test |
| R38 — status options: pendiente/pagado/parcial only | T6, T7 | T6/T7 code review; T11 manual |
