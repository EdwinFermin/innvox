# Discovery — table-filters

> Written by the **leader** from real exploration. Depends on `table-states` and
> `table-toolbar` (fills the `<TableToolbar filters>` slot the latter created).
> Stays `needs_clarification` until the human resolves the open questions.

## Request

Consistent search + filters across the high-traffic tables: a status filter on
payables/receivables, a real date-range picker on incomes/expenses, and shared
filter controls so each page stops rolling its own.

## Findings

| Table | Search | Date range | Status | Branch | Type | Notes |
| --- | :-: | :-: | :-: | :-: | :-: | --- |
| incomes | ✓ | ✓ (`<input type=date>` Desde/Hasta) | ✗ | ✓ | ✓ (income type) | date filter **ignored while search is active** |
| expenses | ✓ | ✓ (same) | ✗ | ✓ | ✓ (expense type) | same quirk |
| payables | ✓ | ✗ | ✗ **missing** | ✗ | ✗ | text search only; `due_date` sortable not filterable |
| receivables | ✓ | ✗ | ✗ **missing** | ✗ | ✗ | same |
| bank-accounts | ✓ | ✗ | ✓ | ✓ | ✓ (+currency) | **reference**: chips + reset, but helpers are in-file |

- **incomes/expenses** (`transactions/incomes/page.tsx`, `…/expenses/page.tsx`):
  `startDate`/`endDate` are plain `useState` + raw `<input type="date">` (incomes
  570–585, branch/type selects 586–627). Date filtering is **disabled when search
  is non-empty** (`hasSearch ? {} : { startDate, endDate }`, ~line 309). **Not**
  URL-param based — pure client state, so changing it does not affect bookmarks.
- **payables/receivables**: only `searchQuery` text search. `status` is a TEXT
  field shown as a column (payables 157–169) but never filtered. Observed status
  values: `"pendiente"`, `"pagado"`, `"parcial"` (and possibly `"vencido"`).
- **bank-accounts** filter Card (741–892) is the established pattern: in-file
  `FilterField` (121–144), `ActiveFilterChip` (146–164), status/type/currency/
  branch `<Select>`s, `activeFilterChips` + `resetFilters` (690–696). None of
  these helpers are exported/shared.
- **Primitives available:** `Select`, `Input`, `Popover` (present, unused for
  dates). **No** Calendar / `react-day-picker` dependency; `date-fns` v4 is
  available. CLAUDE.md says new dependencies must be discussed first.
- `table-toolbar` (dependency) provides `<TableToolbar filters={…}>` — this
  feature populates that slot.

## Affected areas

- New shared filter components (likely `src/components/ui/` or
  `src/components/filters/`): `FilterField`, `ActiveFilterChip`,
  a status/select filter, a date-range filter, optionally a `TableFilterBar`.
- payables, receivables (add status filter), incomes, expenses (standardize the
  existing date-range + selects), and bank-accounts (refactor its in-file helpers
  onto the shared ones — pending Q3).

## Approaches considered

- **Date range — native inputs, shared (leaning toward):** extract the existing
  `<input type="date">` Desde/Hasta into a shared `<DateRangeFilter>`. No new
  dependency, consistent with today's behavior. Trade-off: not a fancy calendar.
- **Date range — calendar popover:** add `react-day-picker` + a `Calendar`/
  `<DateRangePicker>` in a `Popover`. Nicer UX, but a new dependency (needs
  approval) and more surface area.
- **Filter primitives:** promote bank-accounts' `FilterField`/`ActiveFilterChip`
  to shared components and build `StatusFilter`/`DateRangeFilter` on top, then
  drop them into the toolbar `filters` slot across the target tables.

## Open questions ← a human must answer these

1. **Date-range picker style:** shared `<DateRangeFilter>` built on native
   `<input type="date">` (no new dependency) — or a calendar popover via
   `react-day-picker` (new dependency, needs your OK)? Recommendation: native.
2. **payables/receivables filters:** add the **status** filter only, or also a
   **due-date range** filter? Recommendation: status only (matches the brainstorm
   scope); due-date range can be a follow-up.
3. **Extraction depth:** extract shared filter primitives AND refactor
   bank-accounts onto them (one consistent system) — or add filters to the four
   target tables with new shared components but leave bank-accounts' in-file
   helpers untouched? Recommendation: extract + refactor bank-accounts (you chose
   "también alinear" for the table work earlier).
4. **incomes/expenses search + date:** fix the quirk so search and date-range
   **compose** (both apply together), or keep today's behavior (date ignored while
   searching)? Recommendation: make them compose.

## Assumptions

- Scope = payables, receivables, incomes, expenses (+ bank-accounts refactor per
  Q3). **invoices** is out of scope unless you say otherwise (mention to include).
- Status options offered: Todas / Pendiente / Pagado / Parcial (+ Vencido if it's
  a real value — to confirm against the data during implementation).
- Filters render inside the `<TableToolbar filters>` slot; active-filter chips +
  "Limpiar todo" added to each table for consistency with bank-accounts.
- No data-layer/RPC changes; filtering stays client-side over already-fetched
  rows, as today.

## Resolution ← filled in after the human answers

- **Q1 → Native `<input type="date">` shared `<DateRangeFilter>`.** No new
  dependency. Standardize the existing Desde/Hasta inputs into one component.
- **Q2 → Status filter only** on payables/receivables (no due-date range this
  feature).
- **Q3 → Extract shared primitives AND refactor bank-accounts onto them.** One
  consistent filter system.
- **Q4 → Make search and date-range compose** in incomes/expenses (remove the
  `hasSearch ? {} : {…}` short-circuit so both apply together).

### Shared filter components to create

Promote bank-accounts' in-file helpers to shared components (likely
`src/components/filters/` or `src/components/ui/`):
- **`FilterField`** (label + icon + control wrapper) — from bank-accounts 121–144.
- **`ActiveFilterChip`** (removable chip) — from bank-accounts 146–164.
- **`SelectFilter`** — a labeled `<Select>` with an "all"/"Todas" option (the
  status/branch/type/currency shape). Status options for payables/receivables:
  Todas / Pendiente / Pagado / Parcial — **verify "Vencido" against real data/
  types during implementation** and include it only if it's a real status value.
- **`DateRangeFilter`** — Desde/Hasta native `<input type="date">` pair with
  shared styling; controlled `startDate`/`endDate` + onChange.
- Optionally a small `useActiveFilters`/chip-builder helper or a `TableFilterBar`
  composite — implementer's call, but the chips + "Limpiar todo" reset must be
  consistent across tables.

### Per-table changes

- **payables, receivables:** add a `SelectFilter` status filter wired into the
  client-side filtered set; render it in the `<TableToolbar filters>` slot; add
  active chips + reset.
- **incomes, expenses:** replace the raw Desde/Hasta inputs with `DateRangeFilter`
  and the branch/type selects with `SelectFilter`; move them into the
  `<TableToolbar filters>` slot; **fix the search+date composition** (both apply);
  add chips + reset.
- **bank-accounts:** refactor its in-file `FilterField`/`ActiveFilterChip` and its
  status/type/currency/branch selects onto the shared components. Preserve its
  exact current filter behavior, options, chips, reset, and its filter-Card
  layout / responsive split — **no functional regression**.

### Composition with table-toolbar

Filter controls are passed into `<TableToolbar filters={…}>` (the slot created by
`table-toolbar`) for the grid pages; bank-accounts keeps its filter Card but uses
the shared components inside it. This feature does NOT re-extract the toolbar.

- **Decision:** Build shared `FilterField`/`ActiveFilterChip`/`SelectFilter`/
  `DateRangeFilter`; add status filters to payables/receivables; standardize
  incomes/expenses filters and make search+date compose; refactor bank-accounts
  onto the shared primitives without regression. Client-side filtering only — no
  data-layer/RPC changes, no new dependency.
