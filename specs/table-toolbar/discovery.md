# Discovery — table-toolbar

> Written by the **leader** from real exploration. Depends on `table-states`
> (both touch the same 8 pages, in different regions). Stays
> `needs_clarification` until the human resolves the open questions.

## Request

Extract the duplicated table chrome — the column-visibility dropdown, the
page-size control, and the per-column label mapping — into shared components so
every list page stops copy-pasting it.

## Findings

8 list pages, all react-table. Already shared and used widely:
`TablePageSize` (`table-page-size.tsx`, 8/8), `ListVisibilityControl`
(`list-visibility-control.tsx`, 5/8 — missing on branches, clients,
bank-accounts), `DashboardPageHeader` (8/8).

Still duplicated near-verbatim:

- **Column-visibility dropdown (8/8):** a `<DropdownMenu>` whose content is
  `table.getAllColumns().filter(c => c.getCanHide()).map(c => <DropdownMenuCheckboxItem
  checked={c.getIsVisible()} onCheckedChange={…}>{getColumnLabel(c.id)}</…>)`,
  trigger "Columnas ⌄". Locations: payables 348–375, receivables 370–397,
  branches 309–336, clients 237–264, invoices 371–398, incomes 538–565, expenses
  528–555, bank-accounts 758–779.
- **Pagination footer (8/8):** a flex row with optional `ListVisibilityControl` +
  `TablePageSize` + "{n} filas" + "Anterior"/"Siguiente" buttons
  (`previousPage()`/`nextPage()` gated by `getCanPreviousPage/NextPage`).
  Locations: payables 459–489, receivables 456–487, branches 395–420, clients
  323–349, invoices 457–487, incomes 687–717, expenses 676–706, bank-accounts
  1018–1045 (mobile) + 1081–1108 (desktop — slightly different page-info).
- **Column-label maps:** every page has its own
  `getColumnLabel(id): string` backed by a `Record<string,string>` with
  page-specific columns/labels (payables 61–73, receivables 59–72, branches
  55–62, clients 53–61, invoices 59–73, incomes 77–90, expenses 77–90,
  bank-accounts 78–88). Used inside the visibility dropdown.

The search input and the toolbar grid wrapper are also duplicated, but search/
filters are the subject of the next feature (`table-filters`), so they're left
out here. bank-accounts' toolbar is a bespoke **filter Card** (741–892), not the
simple grid — only its column dropdown + pagination match the shared shape.

## Affected areas

- New: `src/components/ui/table-column-toggle.tsx`,
  `src/components/ui/table-pagination.tsx`.
- The 8 list pages — replace the two duplicated blocks with the new components;
  keep each page's local label map and pass it as a prop.
- Ordering: implemented after `table-states` (same files, disjoint regions —
  tbody states vs toolbar/footer).

## Approaches considered

- **Extract the two duplicated blocks (leaning toward):** `<TableColumnToggle
  table columnLabels />` and `<TablePagination table totalFiltered
  visibilityControl? />`. Each page keeps its local `columnLabels` map (page
  domain knowledge) and passes it in. Smallest, safest cut.
- **Bundle a full `<TableToolbar>` (search + columns + filters):** larger, but
  collides with `table-filters` (which owns search/filtering). Rejected for now to
  avoid two features fighting over the same wrapper.

## Open questions ← a human must answer these

1. **Extraction scope:** extract just `<TableColumnToggle>` + `<TablePagination>`
   now (leaving search/filter wrapper to `table-filters`), or also pull the search
   box + toolbar grid into a shared toolbar in this feature?
   Recommendation: column-toggle + pagination only.
2. **Column labels:** keep each page's local `columnLabels` map and pass it as a
   prop (lowest coupling), or centralize all column labels into one shared
   dictionary/catalog? Recommendation: keep local, pass as prop.
3. **bank-accounts:** include it in this extraction — use `<TableColumnToggle>`
   for its column dropdown and `<TablePagination>` for its desktop footer (its
   mobile footer + bespoke filter Card stay) — or leave its toolbar entirely
   custom? Recommendation: include the column-toggle + desktop pagination, don't
   touch the filter Card.

## Assumptions

- `<TableColumnToggle table columnLabels />` reproduces the exact dropdown
  (trigger "Columnas ⌄", `getCanHide` filter, checkbox items, `columnLabels[id] ??
  id`). No behavior change.
- `<TablePagination table totalFiltered visibilityControl? pageSizeOptions? />`
  reproduces the footer (optional visibility control slot, `TablePageSize`, "{n}
  filas", prev/next). No behavior change.
- Local `getColumnLabel`/`columnLabels` per page is preserved and passed in.
- Pure refactor — identical rendered output, just deduplicated. No data changes.

## Resolution ← filled in after the human answers

- **Q1 → Extract the full toolbar** (search + column-toggle + grid wrapper), not
  just the two blocks. This shifts the boundary with `table-filters`: instead of
  `table-filters` extracting the toolbar, **this feature builds `<TableToolbar>`
  with a `filters` slot**, and `table-filters` later populates that slot. The two
  features compose; they do not fight over the wrapper.
- **Q2 → Keep per-page local `columnLabels` maps**, passed as a prop. No central
  catalog.
- **Q3 → Include bank-accounts where it fits:** use `<TableColumnToggle>` for its
  column dropdown and `<TablePagination>` for its desktop footer. Do NOT touch its
  bespoke filter Card or its mobile footer; bank-accounts does NOT adopt the full
  `<TableToolbar>` wrapper.

### Components to create

- **`<TableColumnToggle table columnLabels />`** — the column-visibility dropdown
  (trigger "Columnas ⌄", `getCanHide` filter, checkbox items, `columnLabels[id]
  ?? id`). Standalone so bank-accounts can place it inside its filter Card.
- **`<TablePagination table totalFiltered visibilityControl? pageSizeOptions? />`**
  — the footer (optional visibility-control slot, `TablePageSize`, "{n} filas",
  prev/next gated by `getCanPreviousPage/NextPage`).
- **`<TableToolbar>`** — the toolbar shell for the 7 grid pages:
  - **search** rendered controlled via `searchValue` + `onSearchChange` +
    `searchPlaceholder` + `searchAriaLabel` props (so it serves both the
    state-driven search (payables/receivables/invoices/incomes/expenses) and the
    column-filter search (branches/clients) — the page wires value/onChange to
    whatever it uses today; rendering is identical).
  - the **column-toggle** rendered internally from `table` + `columnLabels` props.
  - a **`filters` slot** (`React.ReactNode`) placed in the toolbar for
    `table-filters` to fill later (empty for now).
  - the same grid wrapper (`grid-cols-[minmax(0,1fr)_auto]`, mobile single-col).

### Pages

- **7 grid pages** (payables, receivables, branches, clients, invoices, incomes,
  expenses): adopt `<TableToolbar>` (wiring their existing search value/onChange)
  + `<TablePagination>`. Behavior identical.
- **bank-accounts:** adopt `<TableColumnToggle>` (inside its filter Card) +
  `<TablePagination>` (desktop footer) only. Filter Card + mobile footer
  untouched.
- All pages keep their local `getColumnLabel`/`columnLabels` and pass it in.

### Composition contract for `table-filters` (next feature)

`table-filters` will pass its filter controls (status, date-range, etc.) into the
`<TableToolbar filters={…}>` slot and will NOT re-extract the toolbar. Note this in
that feature's discovery.

- **Decision:** Create `<TableColumnToggle>`, `<TablePagination>`, and
  `<TableToolbar>` (with a `filters` slot); adopt across the 7 grid pages fully and
  bank-accounts partially. Pure refactor — identical rendered output, search wired
  by each page. No data changes.
