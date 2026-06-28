# Requirements — table-filters

> EARS notation: "WHEN/WHILE/IF … the system SHALL …"
> Every requirement is objectively verifiable by reading rendered output or running the
> filter interaction in a browser.

---

## Shared filter components (src/components/filters/)

**R1** WHEN the `FilterField` component is rendered with a `label`, an `icon`, and
`children`, the system SHALL display the label text and icon above the children using
the class string `"flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"`.

**R2** WHEN the `ActiveFilterChip` component is rendered with a `label` and an `onRemove`
callback, the system SHALL render a button whose `aria-label` is `"Quitar filtro <label>"`
and whose `onClick` fires `onRemove`.

**R3** WHEN the `SelectFilter` component is rendered with an `options` array and an
`allLabel`, the system SHALL render a `<Select>` whose first `<SelectItem>` has value
`"all"` and displays `allLabel`, followed by one `<SelectItem>` per entry in `options`.

**R4** WHEN the `SelectFilter` component receives `value="all"`, the system SHALL treat
the selection as "no filter" (all items pass through).

**R5** WHEN the `DateRangeFilter` component is rendered with `startDate`, `endDate`,
`onStartDateChange`, and `onEndDateChange` props, the system SHALL render two
`<input type="date">` elements labelled "Desde" and "Hasta" with class
`"h-11 w-full rounded-2xl border border-input bg-background px-3"`.

**R6** WHEN a user changes either date input in `DateRangeFilter`, the system SHALL
call the corresponding `onStartDateChange` or `onEndDateChange` callback with the
new date string value.

**R7** IF `DateRangeFilter` is implemented, the system SHALL NOT introduce any new
npm dependency (no `react-day-picker`, no calendar library) beyond what is already
present in `package.json`.

---

## payables page

**R8** WHEN the payables page renders, the system SHALL display a `SelectFilter` for
status in the `<TableToolbar filters>` slot with options: Todas (value `"all"`),
Pendiente (value `"pendiente"`), Pagado (value `"pagado"`), Parcial (value `"parcial"`).

**R9** WHEN a user selects a status value in the payables status filter and the value
is not `"all"`, the system SHALL display only the rows whose `status` field
(case-insensitive) equals the selected value.

**R10** WHEN a user selects `"all"` in the payables status filter, the system SHALL
display all rows that match the current search query (no additional restriction).

**R11** WHEN any payables filter is active (status != "all"), the system SHALL render
one `ActiveFilterChip` per active filter and a "Limpiar todo" button.

**R12** WHEN the user clicks an `ActiveFilterChip`'s remove button on the payables
page, the system SHALL reset only that filter to its "all" value.

**R13** WHEN the user clicks "Limpiar todo" on the payables page, the system SHALL
reset the status filter to `"all"`.

---

## receivables page

**R14** WHEN the receivables page renders, the system SHALL display a `SelectFilter`
for status in the `<TableToolbar filters>` slot with the same options as R8 (Todas /
Pendiente / Pagado / Parcial).

**R15** WHEN a user selects a non-`"all"` status on the receivables page, the system
SHALL display only rows whose `status` field (case-insensitive) equals the selected
value.

**R16** WHEN a user selects `"all"` on the receivables status filter, the system
SHALL display all rows that match the current search query.

**R17** WHEN any receivables filter is active, the system SHALL render one
`ActiveFilterChip` per active filter and a "Limpiar todo" button.

**R18** WHEN the user clicks an `ActiveFilterChip`'s remove button on the receivables
page, the system SHALL reset only that filter to its "all" value.

**R19** WHEN the user clicks "Limpiar todo" on the receivables page, the system SHALL
reset the status filter to `"all"`.

---

## incomes page — filter standardization and search+date composition fix

**R20** WHEN the incomes page renders, the system SHALL render a `DateRangeFilter`
(Desde / Hasta) and two `SelectFilter` controls (Sucursal, Tipo de ingreso) inside
the `<TableToolbar filters>` slot, replacing the previous standalone filter panel.

**R21** WHEN a user types in the incomes search field AND has a date range set,
the system SHALL apply BOTH filters simultaneously: only rows that match the search
term AND fall within [startDate, endDate] are shown.

**R22** The system SHALL NOT skip date-range filtering when `searchTerm` is
non-empty on the incomes page. Specifically, the short-circuit
`hasSearch ? {} : { startDate, endDate }` in the `useIncomes` call SHALL be replaced
so that the hook always receives `{ startDate, endDate }` and the `filteredIncomes`
`useMemo` always applies the date comparison regardless of `searchTerm`.

**R23** WHEN any incomes filter is active (startDate or endDate differ from today's
date, or branch/type is not `"ALL"`), the system SHALL render one `ActiveFilterChip`
per active filter and a "Limpiar todo" button.

**R24** WHEN the user clicks an `ActiveFilterChip`'s remove button on the incomes page,
the system SHALL reset only the corresponding filter to its default value.

**R25** WHEN the user clicks "Limpiar todo" on the incomes page, the system SHALL reset
startDate, endDate to today's date and branchFilter, typeFilter to `"ALL"`.

---

## expenses page — filter standardization and search+date composition fix

**R26** WHEN the expenses page renders, the system SHALL render a `DateRangeFilter`
and two `SelectFilter` controls (Sucursal, Tipo de gasto) inside the
`<TableToolbar filters>` slot.

**R27** WHEN a user types in the expenses search field AND has a date range set,
the system SHALL apply BOTH filters simultaneously (same requirement as R21 for
incomes).

**R28** The system SHALL NOT skip date-range filtering when `searchTerm` is
non-empty on the expenses page. The `if (!normalizedSearch)` guard in the
`filteredExpenses` `useMemo` SHALL be removed so date comparisons always execute.

**R29** WHEN any expenses filter is active, the system SHALL render one
`ActiveFilterChip` per active filter and a "Limpiar todo" button.

**R30** WHEN the user clicks an `ActiveFilterChip`'s remove button on the expenses
page, the system SHALL reset only the corresponding filter to its default value.

**R31** WHEN the user clicks "Limpiar todo" on the expenses page, the system SHALL
reset startDate, endDate to today's date and branchFilter, typeFilter to `"ALL"`.

---

## bank-accounts page — no-regression refactor

**R32** WHEN the bank-accounts page renders, the system SHALL use the shared
`FilterField` component (from `src/components/filters/`) in place of the in-file
`FilterField` function defined at lines 121–144 of the original file.

**R33** WHEN the bank-accounts page renders, the system SHALL use the shared
`ActiveFilterChip` component in place of the in-file `ActiveFilterChip` function
defined at lines 146–164 of the original file.

**R34** WHEN the bank-accounts page renders, the system SHALL use `SelectFilter` for
the status, type, currency, and branch selects, preserving the exact option values
and labels currently in the filter Card (active/inactive, bank/petty_cash, DOP/USD,
branch list from data).

**R35** AFTER the refactor, the bank-accounts filter Card layout, responsive grid
(`xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]`), active chips, "Limpiar todo" button,
and `resetFilters` behavior SHALL be identical to the pre-refactor behavior — no
functional regression.

---

## Active-chip and reset consistency (cross-cutting)

**R36** WHEN there are no active filters on any target page, the system SHALL NOT
render any `ActiveFilterChip` or "Limpiar todo" button; instead it SHALL display the
"Sin filtros activos" placeholder message (following the bank-accounts pattern).

**R37** WHEN active chips are rendered, each chip SHALL include an `aria-label` of
the form `"Quitar filtro <filter label>"` (from `ActiveFilterChip`, per R2).

---

## Status values confirmation

**R38** The status filter on payables and receivables SHALL offer exactly the values
confirmed present in the codebase: `"pendiente"`, `"pagado"`, `"parcial"`. The value
`"vencido"` SHALL NOT be included as it does not appear in any migration, action, or
dialog in the codebase.
