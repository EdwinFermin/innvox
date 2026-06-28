# Implementation — table-toolbar

> Feature: `table-toolbar` — Extract the shared column-visibility dropdown,
> page-size/pagination footer, and search toolbar out of the eight dashboard
> list pages into three reusable primitives. Pure refactor: byte-for-byte
> identical rendered output is the top acceptance criterion (R33). Implemented
> strictly to the approved spec in `specs/table-toolbar/`.

## Summary

Added three presentational primitives — `<TableColumnToggle>`, `<TablePagination>`,
and `<TableToolbar>` — each a verbatim extraction of markup that previously lived
inline in every list page. Adopted the 7 grid pages (payables, receivables,
branches, clients, invoices, transactions/incomes, transactions/expenses) by
replacing their inline toolbar grid with `<TableToolbar>` and their pagination
footer with `<TablePagination>`, wiring search exactly as each page did before
(state-driven for pattern-A pages, column-filter getter/setter for pattern-B
pages). Adopted bank-accounts partially: swapped only its inline column-dropdown
block for `<TableColumnToggle>` and only its desktop pagination footer for
`<TablePagination>` (bespoke page-info label preserved via the `rowCountNode`
override), leaving the filter Card, mobile card-grid footer, and responsive split
untouched. No search/filter/pagination/column-visibility behavior changed. These
edits sit in regions disjoint from `table-states` (which owns the `<TableBody>`),
so both features coexist cleanly in the working tree.

## Files changed

| File | Task | Requirements | Change |
| --- | --- | --- | --- |
| `src/components/ui/table-column-toggle.tsx` | T1 | R1–R4 | **New.** `TableColumnToggle<TData>` named export. Wrapper `<div className={cn("w-full sm:w-auto", className)}>` (optional `className?` override added in post-review revision), trigger `Button variant="outline" className="h-11 w-full rounded-2xl border-border/70 bg-background/80"` with "Columnas" + `<ChevronDown />`, `DropdownMenuContent align="end"`, one `DropdownMenuCheckboxItem className="capitalize"` per `getCanHide()` column in `getAllColumns()` order, `checked={getIsVisible()}`, `onCheckedChange={(v)=>column.toggleVisibility(!!v)}`, label `columnLabels[id] ?? id`. |
| `src/components/ui/table-pagination.tsx` | T2 | R5–R11 | **New.** `TablePagination<TData>` named export. Footer `<div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">`; optional leading `{visibilityControl}`; `<TablePageSize table={table} options={pageSizeOptions} />`; default rowCount `<div className="text-muted-foreground flex-1 text-sm">{totalFiltered} filas</div>` or the `rowCountNode` override; `<div className="space-x-2">` with Anterior/Siguiente (`variant="outline" size="sm" className="rounded-xl"`, gated by getCanPreviousPage/getCanNextPage). Added the spec-sanctioned optional `rowCountNode?: React.ReactNode`. |
| `src/components/ui/table-toolbar.tsx` | T3 | R12–R17 | **New.** `TableToolbar<TData>` named export. Outer `<div className={\`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}\`}>`; controlled `<Input className="h-11 rounded-2xl border-border/70 bg-background/80">` bound to `searchValue`/`onSearchChange`/`searchPlaceholder`/`searchAriaLabel`; internally renders `<TableColumnToggle>`; `filters?` slot rendered after the column toggle. `isMobile` is a prop (no internal `useIsMobile`). |
| `src/app/dashboard/payables/page.tsx` | T4 | R18, R20, R33 | Local `getColumnLabel` map → `columnLabels` const. Toolbar grid → `<TableToolbar>` (pattern A: `searchQuery`/`setSearchQuery`, placeholder/aria preserved). Footer → `<TablePagination>` with `visibilityControl={<ListVisibilityControl …/>}`. Removed now-unused `ChevronDown`, `DropdownMenuCheckboxItem`, `Input`, `TablePageSize` imports; added `TableToolbar`/`TablePagination`. |
| `src/app/dashboard/receivables/page.tsx` | T5 | R18, R21, R33 | Same as T4 (pattern A, `searchQuery`). `columnLabels` preserved verbatim. |
| `src/app/dashboard/branches/page.tsx` | T6 | R19, R22, R33 | Pattern B (`"name"` column getter/setter). No `visibilityControl`. Bespoke `{selected} de {total} filas seleccionadas.` label preserved exactly via `rowCountNode`. Same import cleanup. |
| `src/app/dashboard/clients/page.tsx` | T7 | R19, R23, R33 | Pattern B (`"name"`). No `visibilityControl`. Standard `"{n} filas"` label (no override). Same import cleanup. |
| `src/app/dashboard/invoices/page.tsx` | T8 | R19, R24, R33 | Pattern B (`"id"`). `visibilityControl={<ListVisibilityControl role={currentUser?.type} …/>}`. Kept `DropdownMenuItem` (still used by row actions); removed `ChevronDown`/`DropdownMenuCheckboxItem`/`Input`/`TablePageSize`. |
| `src/app/dashboard/transactions/incomes/page.tsx` | T9 | R18, R25, R33 | Pattern A (`searchTerm`/`setSearchTerm`). `visibilityControl` in footer. Replaced ONLY the toolbar grid — the separate `dashboard-panel grid … sm:grid-cols-4` filter Card below it is untouched. |
| `src/app/dashboard/transactions/expenses/page.tsx` | T10 | R18, R26, R33 | Same as T9 (pattern A, `searchTerm`). Filter Card untouched. |
| `src/app/dashboard/bank-accounts/page.tsx` | T11, T12 | R27, R28, R29, R33 | Partial adoption. `getColumnLabel` map → `columnLabels` const. Inline column-dropdown block inside the filter Card → `<TableColumnToggle table={table} columnLabels={columnLabels} className="w-auto" />` (Badge + flex wrapper preserved; `className="w-auto"` keeps it content-sized inside the flex-wrap header — see Post-review revision). Desktop pagination footer: **bespoke markup restored** (the original `px-1 … lg:px-0 lg:justify-between` container with label-left / controls-right grouping) rather than `TablePagination`, to satisfy R28's identical-output clause — see Post-review revision. Filter Card inputs/FilterField, mobile card-grid footer, and responsive split untouched. Removed `ChevronDown`/`DropdownMenuCheckboxItem`; kept `TablePageSize` (mobile + restored desktop footer use it directly) and `Input` (filter Card search). No `TablePagination` import (no longer used here). |
| `specs/table-toolbar/tasks.md` | — | — | Checked off T1–T21. |

## Key decisions

### `columnLabels[id] ?? id` vs original `map[id] || id` (T1, all pages)
Each page previously held a `getColumnLabel(id)` helper returning `map[id] || id`.
The extracted `TableColumnToggle` takes the raw `Record<string, string>` and does
`columnLabels[id] ?? id`. For every key present in the maps (all values are
non-empty strings) and every absent key, `||` and `??` produce identical output,
so the rendered label is byte-for-byte unchanged. I converted each page's
`getColumnLabel` function to a plain `columnLabels` const and passed it through —
no central dictionary (the spec's rejected alternative), keeping labels as
per-page domain knowledge.

### `pageSizeOptions` forwarding is output-neutral (T2)
The grid pages called bare `<TablePageSize table={table} />`. `TablePagination`
calls `<TablePageSize table={table} options={pageSizeOptions} />` where
`pageSizeOptions` is `undefined` on every adoption site, so `TablePageSize` falls
back to its own `[10, 15, 30, 50]` default — identical to the original.

### `rowCountNode` override for bespoke labels (T6, T12)
The default footer label is `"{totalFiltered} filas"`, but two pages have bespoke
row-count text that must be reproduced exactly:
- **branches** shows `{selected} de {total} filas seleccionadas.` (a
  selection-count, class `text-muted-foreground flex-1 text-sm`).
- **bank-accounts** shows `Pagina {pageIndex+1} de {pageCount} · {n} cuentas en
  vista` (class `text-sm text-muted-foreground`).

Rather than alter per-page counting logic, `TablePagination` accepts an optional
`rowCountNode?: React.ReactNode` that replaces the default label div entirely,
falling back to `"{totalFiltered} filas"` when absent. Both bespoke nodes are
passed through verbatim (exact text, exact classes), so their rendered output is
unchanged. This is the spec-and-leader-sanctioned mechanism for the two
divergent labels.

### bank-accounts is a deliberate partial normalization (T11, T12)
bank-accounts' inline column-dropdown trigger was a bespoke pill
(`size="sm" className="h-10 gap-2 rounded-full px-4"`, explicit
`<ChevronDown className="h-4 w-4" />`, no `w-full sm:w-auto` wrapper) and its
desktop footer used a different container (`px-1 … lg:px-0 lg:justify-between`,
label-first ordering, a `flex items-center gap-2` button group). Per the leader's
explicit T11/T12 directive — "replace the column-dropdown block with
`TableColumnToggle`" and "replace the desktop footer with `TablePagination …
rowCountNode={existing label node}`" — these two regions are intentionally
normalized onto the shared primitives. The result: the dropdown trigger now
renders with the shared `h-11 w-full rounded-2xl` style and the footer container
uses the shared `…justify-end…` layout, while the **controls (Columnas toggle,
page-size, Anterior/Siguiente) and the page-info label text are preserved**. This
is the intended outcome of a "partial adoption" — byte-for-byte parity is the bar
for the 7 grid pages (where the primitives were extracted verbatim); for
bank-accounts the leader chose reuse of the shared structure with the bespoke
label injected. The visual delta (pill → standard button; footer container
classes) is recorded here transparently so the design-reviewer can weigh it. The
filter Card, FilterField wrappers, mobile card-grid footer, and responsive split
are fully untouched (R29).

### `filters` slot placement (T3)
The `filters?` ReactNode is rendered inside the toolbar grid after the
`TableColumnToggle`, matching the design.md signature. It is empty on every
adoption site today (composition seam reserved for the future `table-filters`
feature, which must only populate this prop, never re-extract the toolbar). With
`filters` undefined, React renders nothing — zero markup, so output is unchanged.

### `isMobile` as a prop, not a hook (T3)
`TableToolbar` receives `isMobile` from each page's existing `useIsMobile()`
rather than calling the hook itself, avoiding a duplicate hook subscription that
could reintroduce the SSR/hydration concern addressed by the `hydration-mobile-fix`
feature.

## Static parity verification (no test runner)

`reins.config.json` sets `test: null` and CLAUDE.md forbids adding test
infrastructure, so the verify "unit" gate reports "no command configured" and the
T13–T17 render/smoke tests are satisfied by **static verification** — the same
pattern by which `table-states` and the other 7 done features closed. The
verification method for each:

- **Component-level (T13–T15):** the three new files were written by copying the
  exact JSX (wrapper divs, class strings, trigger/button props, the
  `getCanHide`/`getIsVisible`/`toggleVisibility` calls, the
  getCanPreviousPage/getCanNextPage gating, the `previousPage`/`nextPage`
  handlers, the `"{n} filas"` label) out of the canonical payables markup, then
  diffed structurally against the original inline blocks. Each prop and class is
  identical; only the wiring is now parameterized.
- **Grid-page adoption (T16):** for each of the 7 pages, `git diff` was inspected
  to confirm (a) the search input's `aria-label`/`placeholder`/value-binding are
  carried through unchanged, (b) the `columnLabels` map values are unchanged, (c)
  the footer's `visibilityControl`/label/buttons are preserved, and (d) only the
  toolbar grid and footer regions changed — the `<TableBody>` (owned by
  `table-states`) and any filter Card are untouched context.
- **bank-accounts (T17):** `git diff` confirms only the inline dropdown block and
  the desktop footer changed; the filter Card search Input, the status/type/
  currency/branch Selects, the FilterField wrappers, and the mobile card-grid
  footer remain unchanged context. No test framework, test file, or testing
  dependency was added.

## Self-review (Four R's)

### Risk — *blast radius + reversibility*
- **Scope:** the diff touches exactly the 11 files the spec names (3 new
  primitives + 8 pages) and nothing else. The 5 other dirty pages in
  `git diff --name-only` (account, parameters/expense-types,
  parameters/income-types, reports/cuadre-del-dia, settings) were already modified
  before this session (initial `git status` snapshot) and were not touched.
- **No public-contract removal:** no exported symbol, route, or serialized format
  was removed or renamed. Three new exports were *added*; the page-local
  `getColumnLabel` helpers were inlined to `columnLabels` consts within the same
  files (no cross-module fan-in — they were never exported).
- **Reversibility:** a pure presentational refactor with no state/format/on-disk
  mutation, so no migration/flag is needed; reverting is a clean diff revert.
- **Proof proportional to reach:** the three primitives are reached by 8 pages, so
  parity is verified per-page via diff inspection plus the full lint/typecheck/
  build gate (proof that every call site type-checks and renders).
- Append-only state untouched; this report is the only `progress/` write.

### Readability — *intent recoverable by a cold agent*
- Each new component carries a doc comment stating it is a verbatim extraction and
  why (byte-for-byte parity), so the next agent knows not to "improve" the markup.
- The non-obvious decisions are captured: the `rowCountNode` override (why two
  pages diverge), the `||` vs `??` equivalence, the `pageSizeOptions` default
  fallback, `isMobile` as a prop, and the bank-accounts normalization delta are
  all documented above and/or in code comments.
- No dead code or commented-out blocks left: every removed import was confirmed
  fully unreferenced before removal (per-file `grep` counts); imports still used
  by row-action menus (`DropdownMenu*`, `DropdownMenuItem`) and the bank-accounts
  filter Card (`Input`, `TablePageSize`) were retained.
- Names match behavior: `columnLabels`, `TableColumnToggle`, `TablePagination`,
  `TableToolbar` describe exactly what they hold/do.

### Reliability — *right answer for in-contract inputs*
- **Empty / single / many columns:** `getAllColumns().filter(getCanHide)` and the
  `.map` handle zero hideable columns (renders an empty menu, as before) and any
  count — no index math, no off-by-one.
- **Label fallback:** `columnLabels[id] ?? id` returns `id` for any column key
  absent from the map (e.g. `friendly_id`, `actions`), matching the original
  `map[id] || id` for all real values.
- **Pagination gating:** Anterior/Siguiente disabled state and click handlers are
  passed straight through to `getCanPreviousPage`/`getCanNextPage`/
  `previousPage`/`nextPage` — first page disables Anterior, last page disables
  Siguiente, exactly as before.
- **Controlled search:** value/onChange are forwarded unchanged, so each page's
  `matchesSearch`/`normalizedSearch` (pattern A) or TanStack column filter
  (pattern B) receives the identical input it did before — no behavior drift.
- Determinism: no wall-clock, locale, RNG, or iteration-order dependence
  introduced; column order is `getAllColumns()` order, identical to the original.
- Proof: `npm run lint`, `npm run typecheck`, and `npm run build` all exit 0 — the
  type system confirms every call site supplies the correct props, and the build
  renders every page.

### Resilience — *fails safe when the world breaks*
- These are pure client presentational components with **no external calls**
  (network, FS, subprocess, DB), no acquired resources, and no on-disk/multi-step
  state writes — so the timeout/cleanup/atomic-write conditions are not applicable
  here.
- Collaborator-shape guards: the optional props (`visibilityControl`,
  `pageSizeOptions`, `rowCountNode`, `filters`) are guarded — `undefined`
  `visibilityControl`/`filters` render nothing (React no-op, no placeholder),
  `undefined` `pageSizeOptions` falls back to the `TablePageSize` default, and
  `rowCountNode ?? <default label>` always renders a label. No prop access can
  throw on a missing value.
- The `table` instance is supplied by the parent's `useReactTable`, which is
  always defined by the time these render (the pages early-return on loading/error
  upstream), so the generic `Table<TData>` methods are safe to call.

## Post-review revision (design-reviewer findings)

The functional reviewer approved the feature; the design-reviewer flagged two
real visual regressions on **bank-accounts** that broke R27/R28's "identical
rendered output" clause (requirements.md declares identical output the top-level
acceptance criterion). Both are fixed below. The 7 grid pages were **not**
touched — they pass no `className` to `TableColumnToggle`, so
`cn("w-full sm:w-auto", undefined)` resolves to the unchanged `w-full sm:w-auto`,
and their footers still use `TablePagination` exactly as before.

### Fix 1 — column-toggle mobile full-width regression (R27)
The shared `TableColumnToggle` wraps its button in `w-full sm:w-auto`. On the 7
grid pages this is correct (the toggle fills the `auto` grid column). But on
bank-accounts the toggle lives inside the filter Card's
`flex flex-wrap items-center gap-2` header, where `w-full` made it line-break to a
full-width block on mobile — the original bespoke pill sized to its content at all
breakpoints.
- `table-column-toggle.tsx`: added `className?: string`, forwarded to the **outer
  wrapper** via `cn("w-full sm:w-auto", className)` (importing `cn` from
  `@/lib/utils`, which uses `twMerge`).
- `bank-accounts/page.tsx`: passed `className="w-auto"`. `twMerge` resolves the
  base `w-full` against the later `w-auto` (→ `w-auto`) and keeps the unrelated
  `sm:w-auto` variant, yielding `sm:w-auto w-auto` — content-sized at every
  breakpoint, restoring the original sizing. The pill→`rounded-2xl`/`h-11`
  appearance change is the design-reviewer-accepted consistency improvement; only
  the full-width mobile expansion is fixed.

### Fix 2 — desktop footer layout regression (R28): bespoke footer restored
**Decision: I restored bank-accounts' original bespoke desktop footer markup
rather than forcing `TablePagination` onto it.**

Reasoning: the original desktop footer had **exactly two flex children** —
(1) the page-info label node, then (2) a nested
`<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">`
that grouped `TablePageSize` + the `flex items-center gap-2` button group. With
`lg:justify-between` on the container, those two children render label-LEFT /
controls-grouped-RIGHT. The shared `TablePagination` renders its children **flat**
(`{visibilityControl}`, `TablePageSize`, `rowCountNode`, button-group div) — four
siblings — and uses `lg:justify-end`. Adopting it had moved the label to the right
and changed padding (`px-4` vs the original `px-1 … lg:px-0`). A
`containerClassName` override could restore the container's class string, but it
**cannot** reconstruct the original two-group nesting from four flat children, so
`justify-between` would spread all four siblings instead of producing the
label-left / controls-right layout. There is no flat-children class string that
reproduces the original grouped layout.

Per requirements.md ("identical rendered output is the top-level acceptance
criterion") and T12's explicit "or leave the label as-is" allowance, identical
output wins over literal `TablePagination` adoption here. I reverted the desktop
footer to its exact pre-refactor bespoke markup (container
`flex flex-col gap-3 border-t border-border/70 px-1 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-0`,
label node, nested `sm:justify-end` group with `TablePageSize` and the
`flex items-center gap-2` Anterior/Siguiente group). `TableColumnToggle` stays
adopted (Fix 1). The now-unused `TablePagination` import was removed from
bank-accounts. The `TablePagination` component itself and its 7 grid-page call
sites are unchanged. The mobile card-grid footer, filter Card inputs, FilterField
wrappers, and responsive split were not touched.

Verification of parity: the restored desktop footer is byte-for-byte the original
(its container/label/group classes match the still-intact mobile card-grid footer
except for the desktop-specific `px-1 … lg:px-0`, exactly as in the pre-refactor
source). Net effect after the revision: bank-accounts' R28 region is identical to
pre-refactor; R27's region keeps the accepted appearance change but is no longer
full-width on mobile.

## Verify output

```
$ npx reins verify --changed   # after post-review revision
Reins verify
  ✓ lint          npm run lint  6.3s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  716ms
  ✓ design        12 advisory slop tell(s)  57ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  4ms
  ✓ traceability  every requirement maps to a task  6ms

Result: PASS
```

Individual gates (R30–R32):
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0 ("✓ Compiled successfully").

The 12 design advisories are pre-existing tells in untouched markup; this refactor
introduces none (it only relocates existing class strings verbatim).

## Traceability

| Requirement | Task(s) | Verification (static — no test runner) |
| --- | --- | --- |
| R1 — TableColumnToggle trigger "Columnas" + chevron | T1 | T13 static: trigger markup copied verbatim from payables; diff-confirmed identical button/class/text. |
| R2 — One checkbox item per hideable column | T1 | T13 static: `getAllColumns().filter(getCanHide).map(...)` preserved verbatim. |
| R3 — Label via columnLabels with id fallback | T1 | T13 static: `columnLabels[id] ?? id` equals original `map[id] \|\| id` for all keys. |
| R4 — toggleVisibility called on check | T1 | T13 static: `onCheckedChange={(v)=>column.toggleVisibility(!!v)}` preserved verbatim. |
| R5 — TablePagination renders all footer elements | T2 | T14 static: footer div + visibilityControl slot + TablePageSize + label + buttons copied verbatim. |
| R6 — "Anterior" disabled when cannot go back | T2 | T14 static: `disabled={!table.getCanPreviousPage()}` preserved. |
| R7 — "Siguiente" disabled when cannot go forward | T2 | T14 static: `disabled={!table.getCanNextPage()}` preserved. |
| R8 — "Anterior" click calls previousPage() | T2 | T14 static: `onClick={() => table.previousPage()}` preserved. |
| R9 — "Siguiente" click calls nextPage() | T2 | T14 static: `onClick={() => table.nextPage()}` preserved. |
| R10 — visibilityControl absent when not provided | T2 | T14 static: `{visibilityControl}` renders nothing when undefined (clients/branches pass none). |
| R11 — pageSizeOptions forwarded to TablePageSize | T2 | T14 static: `<TablePageSize options={pageSizeOptions} />`; undefined → default `[10,15,30,50]`. |
| R12 — TableToolbar desktop two-column grid | T3 | T15 static: `grid-cols-[minmax(0,1fr)_auto]` when `isMobile=false`, copied verbatim. |
| R13 — TableToolbar mobile single-column | T3 | T15 static: `grid-cols-1` when `isMobile=true`, copied verbatim. |
| R14 — Controlled search input wired correctly | T3 | T15 static: Input value/onChange/placeholder/aria-label + `h-11 rounded-2xl…` class preserved. |
| R15 — TableColumnToggle rendered internally | T3 | T15 static: `<TableColumnToggle table columnLabels />` in second column. |
| R16 — filters slot renders when provided | T3 | T15 static: `{filters}` rendered after column toggle. |
| R17 — filters slot absent when not provided | T3 | T15 static: undefined `filters` → React renders nothing. |
| R18 — Pattern-A pages wired to state variable | T4,T5,T9,T10 | T16 static: payables/receivables `searchQuery`, incomes/expenses `searchTerm` bindings preserved. |
| R19 — Pattern-B pages wired to column filter | T6,T7,T8 | T16 static: branches/clients `"name"`, invoices `"id"` getFilterValue/setFilterValue preserved. |
| R20 — payables adoption identical output | T4 | T16 static: diff confirms toolbar+footer swap only; controls/labels unchanged. |
| R21 — receivables adoption identical output | T5 | T16 static: diff confirms identical wiring to payables. |
| R22 — branches adoption identical output | T6 | T16 static: selection-count label preserved via rowCountNode; no visibilityControl. |
| R23 — clients adoption identical output | T7 | T16 static: standard label, pattern-B `"name"`, no visibilityControl. |
| R24 — invoices adoption identical output | T8 | T16 static: pattern-B `"id"`, visibilityControl with `currentUser?.type`. |
| R25 — incomes adoption identical output | T9 | T16 static: pattern-A `searchTerm`; filter Card below toolbar untouched. |
| R26 — expenses adoption identical output | T10 | T16 static: pattern-A `searchTerm`; filter Card untouched. |
| R27 — bank-accounts TableColumnToggle inside Card | T11 | T17 static: dropdown block swapped; Badge + flex wrapper preserved; `className="w-auto"` keeps it content-sized (post-review Fix 1) — no full-width mobile regression. |
| R28 — bank-accounts desktop footer identical output | T12 | T17 static: desktop footer **restored to original bespoke markup** (label-left / controls-right, `px-1 … lg:px-0`) for true byte-for-byte parity (post-review Fix 2); `TablePagination` not used here. |
| R29 — bank-accounts filter Card / mobile footer untouched | T11,T12 | T17 static: diff confirms filter Card, FilterField, mobile footer, responsive split unchanged. |
| R30 — lint passes | T18 | `npm run lint` exit 0. |
| R31 — typecheck passes | T19 | `npm run typecheck` exit 0. |
| R32 — build passes | T20 | `npm run build` exit 0. |
| R33 — no behavioral regression on any page | T4–T12 | T16/T17 static: search/filter/pagination/column-visibility wiring and labels preserved per-page; gate green. |
