# Discovery — table-states

> Written by the **leader** from real exploration. Foundation for `table-toolbar`
> and `table-filters`. Stays `needs_clarification` until the human resolves the
> open questions.

## Request

Standardize loading / empty / error across the dashboard list pages with a shared
wrapper, finishing the adoption of the existing `EmptyState` / `ErrorState` /
`TableSkeleton` components (from the prior `ux-polish-stability` epic).

## Findings

### The shared components already exist

- `EmptyState` (`src/components/ui/empty-state.tsx`): presentational; props
  `icon` (LucideIcon), `title`, `description`, `action?`, `className?`.
- `ErrorState` (`src/components/ui/error-state.tsx`): props `title`,
  `description`, `onRetry?`, `showHomeLink?`, `technicalDetail?`. Renders a card.
- `TableSkeleton` (`src/components/ui/table-skeleton.tsx`): props `rows`,
  `columns`; renders **body `<TableRow>`s only** (meant to sit inside
  `<TableBody>`; the caller's `<TableHeader>` stays visible).

### Two structural patterns in the pages

**Table-body pattern (7 pages)** — all use react-table; the loading/empty branch
renders inside `<TableBody>` as a `colSpan={columns.length}` row; error (in the
reference) replaces the whole table.

- **payables** (reference, fully standardized,
  `src/app/dashboard/payables/page.tsx`): error → `ErrorState` replacing the
  table frame (lines 377–382); loading → `TableSkeleton rows={pageSize}
  columns={getVisibleLeafColumns().length}` in the body (405–409); empty → dual
  filter-aware `EmptyState` (no-data `Inbox` "Sin cuentas por pagar" + action; no-
  results `SearchX` "Sin resultados" + "Limpiar búsqueda") (426–456).
- **receivables, branches, clients, invoices, incomes, expenses** — all six use
  `SpinnerLabel` for loading inside a colSpan row, **no error handling at all**
  (their hooks expose `isError`/`error`/`refetch` but the pages ignore them), and
  a **plain-text** empty cell ("No se encontraron …"). Same `colSpan` shape, just
  un-standardized. Exact loading/empty line ranges: receivables 420–453,
  branches 359–392, clients 287–320, invoices 421–454, incomes 651–684, expenses
  640–673.

**Early-return pattern (1 page)** — **bank-accounts**
(`src/app/dashboard/bank-accounts/page.tsx`): resolves all states *before* the
table via custom `AccountsPageSkeleton` (cards + table skeleton, lines 166–202),
an inline red error alert (896–907), and a filter-aware custom `AccountsEmptyState`
(204–234). It also splits mobile (card grid) vs desktop (table). The custom
skeleton/empty are tailored to that unique card+table+filters+responsive layout.

## Affected areas

- New shared wrapper component under `src/components/ui/` (e.g.
  `table-state-body.tsx`).
- The six un-standardized pages (receivables, branches, clients, invoices,
  incomes, expenses) — swap SpinnerLabel→skeleton, add ErrorState, replace plain
  empty with `EmptyState`.
- Optionally `payables/page.tsx` (migrate onto the wrapper so there's one
  pattern).
- The page hooks already expose `isError`/`error`/`refetch` (proven by the hero/
  section-cards and payables usage) — no hook changes needed.

## Approaches considered

- **Wrapper A — focused `<TableStateBody>` (leaning toward):** a small component
  rendered inside `<TableBody>` that branches loading→`TableSkeleton`,
  empty→`<TableRow><TableCell colSpan>…EmptyState…</TableCell></TableRow>`,
  else→`children` (the real rows). Error stays the page-level
  `{isError ? <ErrorState onRetry={refetch}/> : <frame>}` one-liner (mirroring
  payables). Low risk — pages keep their own header/row/toolbar markup.
- **Wrapper B — full data-table shell:** a component that takes the react-table
  instance and renders the entire frame (header + body + error + states). Less
  per-page code, but it must generalize row rendering, row click/selection, and
  the frame markup — higher risk of subtle regressions across 7 different pages.

Leaning toward **A**: it removes the most duplication (the tbody conditional +
the error guard convention) without coupling to each page's bespoke
row/toolbar markup.

## Open questions ← a human must answer these

1. **bank-accounts:** leave its custom early-return pattern as-is (its mobile card
   layout + filter-aware empty are load-bearing), or also fold it into the shared
   wrapper? Recommendation: leave as-is, out of this feature's scope.
2. **Wrapper depth:** focused `<TableStateBody>` (loading/empty/rows in the body;
   error stays a standardized page-level guard) — or a full data-table shell that
   also owns the header/frame/error? Recommendation: focused.
3. **Empty-state richness:** mirror payables' **filter-aware dual** empty (a
   distinct "no results, clear search" state where the page has a search box, plus
   the plain "no data yet, create the first" state) — or a single generic empty
   per page? Recommendation: dual where search exists, single otherwise.

## Assumptions

- Retrofit the six table-body pages; **migrate payables onto the wrapper too** so
  all seven share one pattern.
- Add `ErrorState` + retry (`refetch`) to the six pages that currently have none,
  using the page's existing hook error fields and `mapError(error)` for copy.
- Loading defaults: `rows = pagination.pageSize`, `columns =
  getVisibleLeafColumns().length` (as payables does).
- Empty-state copy/icons follow payables' conventions (`Inbox` for no-data,
  `SearchX` for no-results) with per-page nouns; the no-data action opens that
  page's create dialog where one exists.
- No hook/data-layer changes; bank-accounts untouched (pending Q1).

## Resolution ← filled in after the human answers

- **Q1 → Also align bank-accounts** — but with hard constraints (see below). It
  is in scope.
- **Q2 → Focused `<TableStateBody>` helper.** New component in
  `src/components/ui/` handling loading→`TableSkeleton`, empty→colSpan
  `EmptyState` row, else→`children`. Error stays a standardized page-level guard
  (`{isError ? <ErrorState onRetry={refetch}/> : <frame>}`).
- **Q3 → Filter-aware dual empty** (mirror payables): where the page has a search/
  filter, show a "no results / limpiar búsqueda" empty when the filtered set is
  empty but the raw set is not, plus the plain "no data yet / create the first"
  empty otherwise.

### Pages in scope

- **Migrate payables** onto `<TableStateBody>` (it becomes the canonical user of
  the wrapper).
- **Retrofit the six:** receivables, branches, clients, invoices, incomes,
  expenses — replace SpinnerLabel loading with `<TableStateBody>`/`TableSkeleton`,
  add the `ErrorState` page-level guard (using each hook's `isError`/`error`/
  `refetch` + `mapError`), and replace plain-text empty with the filter-aware
  `EmptyState`.
- **bank-accounts (constrained alignment):** replace the custom
  `AccountsEmptyState` (lines 204–234) with the shared `EmptyState` (keep its
  filter-aware dual messaging + the create-account / clear-filters actions), and
  replace the inline red error alert (896–907) with the shared `ErrorState`
  (`onRetry={refetch}`). Use `<TableStateBody>`/`TableSkeleton` for the **desktop
  table** body. **Do NOT regress:** the mobile card-grid layout, the
  mobile/desktop split, or the filter-aware behavior. The mobile path keeps its
  card rendering; its loading/empty may reuse the shared `Skeleton`/`EmptyState`
  leaf components but is NOT forced through `<TableStateBody>` (no table there).
  `AccountsPageSkeleton` may stay (it's a bespoke card+table skeleton) or be
  rebuilt from shared `Skeleton` — implementer's call, no visual regression.

### `<TableStateBody>` contract

- Props: `isLoading: boolean`, `isEmpty: boolean`, `colSpan: number`,
  `loadingRows: number`, `empty: React.ReactNode` (a ready `<EmptyState>`),
  `children: React.ReactNode` (the mapped rows).
- Renders: `isLoading` → `<TableSkeleton rows={loadingRows} columns={colSpan} />`;
  else `isEmpty` → `<TableRow><TableCell colSpan={colSpan}>{empty}</TableCell></TableRow>`;
  else → `children`.
- Lives inside the page's `<TableBody>`; header/toolbar/row markup stay per-page.
- Loading defaults at call sites: `loadingRows = pagination.pageSize`,
  `colSpan = getVisibleLeafColumns().length`.

### Empty-state copy conventions

Per-page nouns, mirroring payables: no-data uses `Inbox` ("Sin <noun>", "Registra
el primero para verlo aquí.", action opens the create dialog where one exists);
no-results uses `SearchX` ("Sin resultados", "Ajusta o limpia el filtro.", action
clears the search). bank-accounts keeps its `Landmark` icon + existing copy.

- **Decision:** Add `<TableStateBody>` + standardize error/empty across all eight
  list pages. Hooks unchanged (they already expose error fields). bank-accounts
  aligned to shared components without regressing its responsive layout.
