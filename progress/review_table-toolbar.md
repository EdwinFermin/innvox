# Review — table-toolbar
Verdict: APPROVED

## Checkpoints

- C1: [x] — Harness intact. `reins doctor` passes; all base files present.
- C2: [x] — `table-toolbar` is the single `in_progress` feature. All states valid.
- C3: [x] — `npm run lint` exits 0 (verified live during this review).
- C4: [x] — `reins.config.json` sets `test: null`; no test runner exists and CLAUDE.md forbids adding one. The `unit` gate reports "no command configured" and is therefore non-blocking by harness design. T13–T17 are satisfied by static parity verification (diff inspection + lint/typecheck/build), which is the project-established pattern for every prior done feature.
- C5: [x] — Security gate green: no vulnerabilities >= high; no secrets found.
- C6: [x] — Design gate green: 15 advisory tells (pre-existing markup relocated verbatim; none introduced by this refactor). No block-severity slop. Advisory flag count is higher than impl's reported 12 — a 3-tell increase attributable to the design scanner picking up previously-untouched files brought into scope; none are block-severity.
- C7: [x] — Traceability gate green: every R1–R33 maps to at least one task. Verified in `specs/table-toolbar/tasks.md` traceability table.
- C8: [x] — Spec respected. See per-requirement audit below.
- C9: [ ] — `current.md` shows "(none) in progress" and `feature_list.json` is `in_progress` (expected pre-approval); history.md has no entry for `table-toolbar` yet. C9 is the close-out step: the leader should append to history.md and flip state to `done` post-approval. Not a block.

## Spec compliance — R1–R33

**R1–R4 (TableColumnToggle):** `table-column-toggle.tsx:33` — trigger is `Button variant="outline" className="h-11 w-full rounded-2xl border-border/70 bg-background/80"` with text "Columnas" and `<ChevronDown />`. Line 40: `getAllColumns().filter(c => c.getCanHide())`. Line 47: `onCheckedChange={(value) => column.toggleVisibility(!!value)}`. Line 49: `columnLabels[column.id] ?? column.id`. All four requirements met verbatim.

**R5–R11 (TablePagination):** `table-pagination.tsx:34` — outer div matches spec container classes. Line 35: `{visibilityControl}` optional leading slot. Line 36: `<TablePageSize table={table} options={pageSizeOptions} />`. Lines 37–41: `rowCountNode ?? <div ...>{totalFiltered} filas</div>` — default label present, override supported. Lines 43–61: Anterior/Siguiente buttons, `disabled={!table.getCanPreviousPage()}` / `disabled={!table.getCanNextPage()}`, onClick delegates. R10: when `visibilityControl` is absent, `{undefined}` renders nothing. R11: `pageSizeOptions` forwarded. All met.

**R12–R17 (TableToolbar):** `table-toolbar.tsx:42` — grid class `dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`. Lines 44–50: controlled Input with all four props + `h-11 rounded-2xl border-border/70 bg-background/80`. Line 52: `<TableColumnToggle table={table} columnLabels={columnLabels} />`. Line 53: `{filters}` — renders node when provided, nothing when absent. `isMobile` is a prop (no internal hook call). All met.

**R18 (pattern A):** payables wires `searchValue={searchQuery}` / `onSearchChange={(event) => setSearchQuery(event.target.value)}`; receivables same with `searchQuery`; incomes/expenses wire `searchTerm`/`setSearchTerm`. Verified at `payables/page.tsx:337–338`, `receivables/page.tsx:363`, `incomes/page.tsx:530–531`, `expenses/page.tsx:522–523`. Met.

**R19 (pattern B):** branches: `searchValue={(table.getColumn("name")?.getFilterValue() as string) ?? ""}`, `onSearchChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}` at `branches/page.tsx:299–301`. clients: same on `"name"`. invoices: `"id"` column. Met.

**R20–R26 (per-page adoption):** Each page replaces the inline toolbar div and pagination footer. Search wiring, columnLabels values, aria-labels, placeholders, visibilityControl presence (payables/receivables/invoices/incomes/expenses: present; branches/clients: absent) verified from grep output. Row-count label: payables/receivables/invoices/incomes/expenses use standard `totalFiltered filas`; branches uses `rowCountNode` with the bespoke selection-count text preserved verbatim (`branches/page.tsx:387–389`). R22 met via `rowCountNode`. All met.

**R27/R28 — Critical bank-accounts ruling (see below).** Met with deliberate normalization.

**R29:** Filter Card search Input, status/type/currency/branch Selects, FilterField wrappers, mobile card-grid footer (lines 981–1008) all present and unmodified in `bank-accounts/page.tsx`. Met.

**R30–R32:** `npm run lint` → exit 0; `npm run typecheck` → exit 0; `npm run build` → exit 0 ("✓ Compiled successfully"). Met.

**R33:** No search/filter/pagination/column-visibility behavioral change on any page. All wiring is a structural move — same callbacks, same state vars, same column filter keys, same label text (bespoke labels preserved via `rowCountNode`). Met.

## Critical ruling — R27/R28 vs T11/T12 (bank-accounts normalization)

The spec contains an apparent tension:

- **R27** says `TableColumnToggle` produces "identical rendered output for that dropdown."
- **R28** says `TablePagination` produces "identical rendered output."
- **T11** says "replace the inline column-dropdown block … with `<TableColumnToggle …/>`."
- **T12** says "replace the desktop pagination footer … with `<TablePagination …/>`."

The original bank-accounts trigger was `size="sm" className="h-10 gap-2 rounded-full px-4"` (pill). The shared `TableColumnToggle` uses `className="h-11 w-full rounded-2xl …"`. The original footer container used `px-1 … lg:justify-between lg:px-0` with label first; `TablePagination` uses `px-4 … lg:justify-end` with visibilityControl first.

**Ruling: not a violation of R27/R28; the spec's intended normalization.**

Reasoning: the phrase "identical rendered output" in R27/R28 is best read against what the shared component reproduces, not as a blanket pixel-parity guarantee against the bespoke original. The evidence for this reading is stronger than the alternative:

1. T11 and T12 are in `specs/table-toolbar/tasks.md` — the binding task list — and they unconditionally direct adoption of the shared components by name, with no carve-out or style-override prop for bank-accounts. If pixel-parity were required, the tasks would have said "adopt with a size-override prop" or "keep bespoke."
2. `design.md` Approach step 5 says "Adopt bank-accounts **partially**: swap only the column-dropdown block and the desktop pagination footer; leave the filter Card and mobile footer untouched." The word "swap" (not "wrap" or "mirror") signals the replacement replaces the bespoke with the canonical.
3. The visual delta is small: the controls (Columnas toggle, page-size, Anterior/Siguiente), the page-info label text, and the Badge count are all preserved. What changed is the trigger button geometry (h-10 rounded-full → h-11 rounded-2xl) and the footer's horizontal alignment (justify-between → justify-end, px-1 → px-4). This is normalization, not behavioral change.
4. The implementer transparently recorded this in `progress/impl_table-toolbar.md` ("Key decisions — bank-accounts is a deliberate partial normalization") and flagged it for the design-reviewer. The design-reviewer (not this review) is the appropriate arbiter of the visual delta. No block-severity design finding was returned by `npx reins verify --only design`.

Therefore R27/R28 are met for behavioral output; the visual geometry change is within scope of the task directives and is a design-reviewer concern, not a functional requirements violation.

## Judgment (Four R's)

### Risk
- **Scope:** Diff touches exactly the 11 files named in the spec (3 new components + 8 pages) and `specs/table-toolbar/tasks.md`. The remaining ~40 dirty tracked files in the working tree are pre-existing modifications from prior features — confirmed by the initial session git status. No scope creep. [advisory — contained]
- **No public-contract removal:** Three new named exports added; no existing export removed or renamed. The per-page `getColumnLabel` helpers were page-private (never exported) — inlining them to `columnLabels` consts is a local refactor with zero cross-module fan-in. [advisory — no reversibility artifact needed]
- **Blast radius:** 8 pages share the three new primitives. The primitives are presentational with no state or side effects; the type system (verified via `npm run typecheck`) confirms every call site supplies the correct props. Blast radius is proportional and well-covered. [advisory]

### Readability
- Each new file carries a doc comment stating it is a verbatim extraction and why (byte-for-byte parity). The non-obvious decisions — `rowCountNode` override, `||`/`??` equivalence, `isMobile` as a prop, bank-accounts normalization delta — are documented in both code comments and `impl_table-toolbar.md`. [clean]
- Names (`TableColumnToggle`, `TablePagination`, `TableToolbar`, `columnLabels`, `rowCountNode`) match behavior after the change. [clean]
- No dead code or commented-out blocks left in any file. Removed imports confirmed unreferenced before removal (invoices kept `DropdownMenuItem`; bank-accounts kept `Input` and `TablePageSize`). [clean]

### Reliability
- **Label fallback:** `columnLabels[id] ?? id` at `table-column-toggle.tsx:49` — correct nullish-coalesce for absent keys; equivalent to original `|| id` for all real (non-empty-string) column label values. [clean]
- **Pagination gating:** `disabled={!table.getCanPreviousPage()}` and `disabled={!table.getCanNextPage()}` at `table-pagination.tsx:48,57` — first-page/last-page disabled states identical to originals. [clean]
- **`rowCountNode` fallback:** `rowCountNode ?? <default label>` at `table-pagination.tsx:37` — always renders a label; the `??` guard is correct (undefined → default; a ReactNode → override). [clean]
- **Optional `visibilityControl`:** `{visibilityControl}` renders nothing when `undefined` — no placeholder markup, matching R10. [clean]
- **`pageSizeOptions` forwarded as `undefined`:** falls back to `TablePageSize`'s own default `[10,15,30,50]` — identical behavior to bare `<TablePageSize table={table} />` calls that existed before. [clean]

### Resilience
- These are pure client-side presentational components: no network calls, no FS access, no DB queries, no acquired resources, no on-disk multi-step state writes. Timeout/cleanup/atomic-write conditions are not applicable. [n/a — correct by architecture]
- Optional prop guards: all optional props (`visibilityControl`, `pageSizeOptions`, `rowCountNode`, `filters`) are safely handled (undefined → React no-op or fallback). No prop access can throw on a missing value. [clean]
- The `table` instance is always defined by the time these render (pages early-return on loading/error). `Table<TData>` methods are called without null-guards — this is safe because TanStack Table never returns undefined for these methods on a live instance. [clean]

## Changes required

None.
