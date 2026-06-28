# Implementation — table-filters

> Feature: `table-filters` — Consistent search and filters across the five
> high-traffic tables (payables, receivables, incomes, expenses, bank-accounts).
> Builds on the done `table-toolbar` feature (uses its `filters?` slot) and
> `table-states`. Implemented strictly to the approved spec in
> `specs/table-filters/` (R1–R38, T1–T14).

## Summary

Added four reusable filter primitives under `src/components/filters/` —
`FilterField`, `ActiveFilterChip`, `SelectFilter`, `DateRangeFilter` — plus a
barrel `index.ts`. The first two are **byte-for-byte promotions** of the in-file
helpers that lived in `bank-accounts/page.tsx`; the latter two are thin,
dependency-free wrappers over the existing Radix `Select` and the native
`<input type="date">` markup the incomes/expenses pages already used.

Adopted them across five pages:
- **payables / receivables** gained a status `SelectFilter`
  (Todas/Pendiente/Pagado/Parcial) in the `<TableToolbar filters>` slot, wired
  into the client-side `filteredPayables` / `filteredReceivables` filter, with an
  active-chips row + "Limpiar todo" / "Sin filtros activos" placeholder.
- **incomes / expenses** replaced their standalone `dashboard-panel … sm:grid-cols-4`
  filter panel with a `DateRangeFilter` + two `SelectFilter`s (Sucursal, Tipo) in
  the toolbar slot, gained active chips + reset, and — critically — had the
  **search+date composition bug fixed** so the date range always applies even when
  the search box is non-empty.
- **bank-accounts** is a pure no-regression swap: the two in-file helpers were
  deleted and imported from `@/components/filters`, and its four inline `<Select>`
  blocks were replaced with `<SelectFilter>` inside the existing `<FilterField>`
  wrappers. The filter Card layout, grid, active-chips block, "Limpiar todo", and
  `resetFilters` body are untouched.

No new npm dependency was introduced (R7). The change set is exactly the 10 files
the spec names.

## Files changed

| File | Task | Requirements | Change |
| --- | --- | --- | --- |
| `src/components/filters/filter-field.tsx` | T1 | R1, R32 | **New.** `FilterField({ label, icon, htmlFor?, children })`. `<div className="space-y-2 min-w-0">` + uppercase icon `<label>` + children. Verbatim promotion of the bank-accounts in-file helper (no `"use client"` — pure presentational, no callbacks). |
| `src/components/filters/active-filter-chip.tsx` | T2 | R2, R33, R37 | **New.** `ActiveFilterChip({ label, onRemove })`. Pill `<button>` with `aria-label={\`Quitar filtro ${label}\`}` + `<X>` icon. Verbatim promotion (`"use client"` — has onClick). |
| `src/components/filters/select-filter.tsx` | T3 | R3, R4 | **New.** `SelectFilter({ value, onValueChange, options, allLabel, ariaLabel?, className? })`. Wraps `Select`; first `<SelectItem value="all">{allLabel}</SelectItem>` then one per option; trigger class `cn("h-11 w-full rounded-2xl border-border/70 bg-muted data-[size=default]:h-11", className)`. `"use client"`. |
| `src/components/filters/date-range-filter.tsx` | T4 | R5, R6, R7 | **New.** `DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, startLabel="Desde", endLabel="Hasta" })`. Two native `<input type="date" className="h-11 w-full rounded-2xl border border-input bg-background px-3">`, values normalized via existing `getDateInputValue`. No calendar dep. `"use client"`. |
| `src/components/filters/index.ts` | T5 | enables T6–T10 | **New.** Barrel re-exporting all four. |
| `src/app/dashboard/payables/page.tsx` | T6 | R8–R13, R36, R37, R38 | Added `statusFilter` state (default `"all"`); guard in `filteredPayables`; `statusFilterOptions` const (pendiente/pagado/parcial only); `activeFilterChips` + `resetFilters`; status `SelectFilter` (icon `Wallet`) in `<TableToolbar filters>`; chips row + "Limpiar todo" / placeholder. |
| `src/app/dashboard/receivables/page.tsx` | T7 | R14–R19, R36, R37, R38 | Mirror of T6 for `filteredReceivables`. |
| `src/app/dashboard/transactions/incomes/page.tsx` | T8 | R20–R25, R36, R37 | (a) `useIncomes` call now passes `{ startDate, endDate }` unconditionally (removed `hasSearch` ternary + the now-dead `hasSearch` var); (b) removed `if (!normalizedSearch)` guard around the date comparisons; (c) replaced the standalone filter panel with `DateRangeFilter` + Sucursal/Tipo `SelectFilter`s in the toolbar slot; (d) `branchFilterOptions`/`typeFilterOptions`, `activeFilterChips`, `resetFilters`; chips row. Removed now-unused `Select*` and `getDateInputValue` imports. |
| `src/app/dashboard/transactions/expenses/page.tsx` | T9 | R26–R31, R36, R37 | Mirror of T8 for expenses; removed `if (!normalizedSearch)` guard. See **Scope decision** below re: `useExpenses` date params. Removed now-unused `Select*` and `getDateInputValue` imports. |
| `src/app/dashboard/bank-accounts/page.tsx` | T10 | R32–R37 | Deleted in-file `FilterField` + `ActiveFilterChip`; imported the shared ones + `SelectFilter`; replaced the four inline `<Select>` blocks (status/type/branch/currency) with `<SelectFilter>` inside their existing `<FilterField>` wrappers, preserving option values/labels/aria-labels exactly. Removed now-unused `Select*` import and the `X` icon (only the deleted chip used it). Filter Card grid, chips block, "Limpiar todo", `resetFilters` untouched. |
| `specs/table-filters/tasks.md` | — | — | Checked off T1–T14. |

## Key decisions

### Search + date composition fix (incomes & expenses) — the core bug

**Incomes — before:**
```typescript
const hasSearch = searchTerm.trim().length > 0;
const { data: incomes, ... } = useIncomes(
  user?.id || "",
  hasSearch ? {} : { startDate, endDate },   // date suppressed while searching
);
// ...inside filteredIncomes useMemo:
const dateKey = normalizeDateKey(income.date);
if (!dateKey) return false;
if (!normalizedSearch) {                       // date compare skipped while searching
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
}
```

**Incomes — after:**
```typescript
const { data: incomes, ... } = useIncomes(
  user?.id || "",
  { startDate, endDate },                      // always narrowed server-side
);
// ...inside filteredIncomes useMemo:
const dateKey = normalizeDateKey(income.date);
if (!dateKey) return false;
if (startDate && dateKey < startDate) return false;   // always applied
if (endDate && dateKey > endDate) return false;
```

Both the hook ternary and the `if (!normalizedSearch)` guard combined to make the
date range inert whenever the user typed in search. Now both filters compose:
only rows matching the search term AND within `[startDate, endDate]` show (R21,
R22). The dead `hasSearch` local was removed (it had no other use).

**Expenses — same client-side fix.** Removed the identical `if (!normalizedSearch)`
guard in `filteredExpenses` (R27, R28). The `normalizedSearch` variable is still
used by the search-matching block above the guard, so it remains declared.

### Scope decision — `useExpenses` date params NOT added (deliberate)

T9 / design.md say "add `{ startDate, endDate }` to the `useExpenses` call." But
`useExpenses(userId: string)` (`src/hooks/use-expenses.ts`) takes **only** a
`userId` and does no date filtering — unlike `useIncomes`, which already accepts
`UseIncomesOptions`. Passing a second argument to the current `useExpenses`
signature is a TypeScript error; making it accept options would require editing
`src/hooks/use-expenses.ts`, which is an **11th file** and would violate the
explicit, leader-stated constraint: "Confirm your change set is exactly those 10
files."

design.md itself resolves the tension: "narrowing the date on the server is an
**optimization, not a correctness requirement**." The expenses page filters
**client-side**, so the correctness-bearing requirement (R28: date range always
applies, search+date compose) is fully satisfied by removing the
`if (!normalizedSearch)` guard alone. I therefore did **not** touch the hook or
its call. Functionally: expenses now fetches all rows (as it always has) and the
client-side `filteredExpenses` applies the date range unconditionally — R26–R31
hold. The only difference vs. incomes is that expenses does no server-side date
narrowing, which is an optimization the spec explicitly deems non-required. This
keeps the change set at exactly 10 files and keeps typecheck green.

### Active-chip detection + reset, per page

- **payables / receivables:** the only filter is `statusFilter` (default `"all"`).
  A chip is emitted iff `statusFilter !== "all"`; its label is
  `Estado: {Pendiente|Pagado|Parcial}` via a `statusFilterLabelByValue` map; its
  `onRemove` sets `"all"`. `resetFilters()` sets `statusFilter` back to `"all"`
  (R11–R13, R17–R19). When no chip is active, the "Sin filtros activos…"
  placeholder renders instead (R36).
- **incomes / expenses:** four filter dimensions. A chip is emitted per deviation
  from defaults — `startDate !== today`, `endDate !== today`,
  `branchFilter !== "ALL"`, `typeFilter !== "ALL"` — where `today = getTodayDateKey()`.
  Each chip's `onRemove` resets only that dimension (date → `today`, branch/type →
  `"ALL"`). `resetFilters()` sets startDate/endDate to `today` and branch/type to
  `"ALL"` (R23–R25, R29–R31). Branch/type chip labels resolve the human name from
  `branchNameById` / the type list, falling back to the id.

  Note the **value bridge** for the branch/type selects: those filters use the
  sentinel `"ALL"`, but `SelectFilter`'s implicit no-filter option is `"all"`. The
  selects therefore pass `value={filter === "ALL" ? "all" : filter}` and map back
  on change `(value) => set(value === "all" ? "ALL" : value)`. This keeps the
  existing `"ALL"` filter state (and all its `!== "ALL"` comparisons) untouched
  while letting `SelectFilter` own the `"all"` item — no behavior change to the
  filtering logic, only an adapter at the control boundary.

### bank-accounts swap is behavior-preserving

- The two deleted in-file functions were **identical** to the new shared
  components (they are the source the shared versions were promoted from), so the
  rendered `FilterField` / `ActiveFilterChip` markup is unchanged.
- Each inline `<Select>` → `<SelectFilter>` preserves the **exact** option
  `value`s (`all`/`active`/`inactive`, `all`/`bank`/`petty_cash`, `all`+branch ids,
  `all`/`DOP`/`USD`), the option **labels**, and the `aria-label`s ("Filtrar por
  estado/tipo de cuenta/sucursal/moneda"). The original `value` is always set
  (defaults to `"all"`), so the original `<SelectValue placeholder="…">` never
  showed its placeholder; `SelectFilter`'s bare `<SelectValue />` renders the
  selected item's text identically. The trigger class
  (`h-11 w-full rounded-2xl border-border/70 bg-muted data-[size=default]:h-11`)
  is `SelectFilter`'s default, matching verbatim.
- The filter Card structure, the `xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]`
  grid, the active-chips block, "Limpiar todo", and `resetFilters` body are
  **untouched** (R34, R35). Removed imports (`Select*`, `X`) were confirmed
  unreferenced after the swap.

## Static parity verification (no test runner)

`reins.config.json` sets `test: null` and CLAUDE.md forbids adding test
infrastructure, so the verify "unit" gate reports "no command configured". The
"Test:" notes in tasks.md and the "unit test" column in the traceability table are
satisfied by **static verification** — the same pattern by which the six prior
done UI features closed. **No test framework, test file, or testing dependency was
added.** Method per task:

- **T1–T5 (components):** the two promoted components were diffed structurally
  against the original bank-accounts in-file definitions (identical JSX, classes,
  aria-label); `SelectFilter`/`DateRangeFilter` match the design.md signatures and
  rendered-markup comments line-for-line. Compilation proves the barrel exports
  resolve (T5 ↔ typecheck).
- **T6–T9 (page wiring):** `git diff` inspected to confirm the filter guard
  (`statusFilter !== "all" && (x.status ?? "").toLowerCase() !== statusFilter`),
  the date-guard removal, the toolbar `filters` slot population, and the chip /
  reset logic. The search wiring and table-toolbar/table-states integration are
  unchanged context.
- **T10 (bank-accounts):** `git diff` confirms only the two helper definitions,
  the four select blocks, and the now-dead imports changed; option values/labels/
  aria-labels are preserved verbatim and the filter Card layout/chips/reset are
  untouched.

## Self-review (Four R's)

### Risk — *blast radius + reversibility*
- **Scope fidelity:** the diff touches exactly the 10 files the spec names — 5 new
  files under `src/components/filters/` + the 5 page files. `git status` confirms
  `package.json`/`package-lock.json` are **unchanged** (R7) and
  `src/hooks/use-expenses.ts` is **unchanged** (scope decision above). The other
  pre-existing dirty files in `git status` (account, parameters/*, reports/*,
  settings, dashboard components, etc.) are from earlier sessions and were not
  touched.
- **No public-contract removal:** no exported symbol, route, or serialized format
  was removed or renamed. Four new exports were **added**; the two bank-accounts
  helpers that were deleted were **file-local** (never exported), so fan-in is
  zero — `grep` confirms they had no callers outside that file.
- **Reversibility:** a pure presentational/client-filter change with no
  state/format/on-disk/DB mutation — no migration or flag needed; reverting is a
  clean diff revert.
- **Proof proportional to reach:** the four primitives are reached by 5 pages; the
  full lint + typecheck + build gate is green, proving every call site type-checks
  and every page renders. The highest-risk path (bank-accounts no-regression) is
  verified by diff to preserve option values/labels/aria-labels exactly.
- This report is the only `progress/` write; `progress/history.md` untouched
  (append-only, leader-owned).

### Readability — *intent recoverable by a cold agent*
- Each new component carries a doc comment stating what it is and (for the two
  promotions) that it is a verbatim promotion so the next agent doesn't re-diverge
  it.
- Non-obvious decisions are captured here and/or in comments: the `"all"`↔`"ALL"`
  value bridge (comment + report), the `statusFilterOptions` "vencido excluded"
  rationale (in-code comment citing R38), the composition fix (report with
  before/after), and the `useExpenses` scope decision (report).
- No dead code left: the `hasSearch` local (incomes) was removed with its only
  use; removed imports were confirmed unreferenced before deletion (lint would
  flag any survivor — it passes).
- Names match behavior: `statusFilter`, `activeFilterChips`, `resetFilters`,
  `branchFilterOptions`, `SelectFilter`, `DateRangeFilter` describe exactly what
  they hold/do.

### Reliability — *right answer for in-contract inputs*
- **Status guard (payables/receivables):** `(payable.status ?? "").toLowerCase() !== statusFilter`
  handles a null/undefined status (→ `""`, never matches a real filter) and is
  case-insensitive, matching the data's lowercase status values; `statusFilter === "all"`
  short-circuits to "pass all" (R9/R10, R15/R16).
- **Finite enum coverage:** the status options are exactly the three real values
  (pendiente/pagado/parcial); "vencido" is excluded by design (R38) and asserted by
  the in-code comment + option list.
- **Date composition (incomes/expenses):** with the guard removed, an empty search
  AND a non-empty search both run `dateKey < startDate` / `dateKey > endDate`. Rows
  with no parseable date (`!dateKey`) are excluded as before. Empty `startDate`/`endDate`
  strings short-circuit the comparison (falsy guard), so a blank date never filters
  everything out.
- **Chip detection boundaries:** date chips compare against a fresh
  `getTodayDateKey()` each render (defaults are also `getTodayDateKey`), so on first
  paint with no user change, zero chips render and the placeholder shows (R36) — no
  false-positive chip.
- **Value bridge idempotence:** `"ALL"→"all"→"ALL"` and id→id round-trip exactly;
  selecting the all-option always restores the `"ALL"` sentinel the filter logic
  expects.
- **Determinism:** no new wall-clock/locale/RNG/iteration-order dependence beyond
  the pre-existing `getTodayDateKey` (already the page's default). Proof: lint,
  typecheck, build all exit 0.

### Resilience — *fails safe when the world breaks*
- These are pure client presentational components and client-side array filters
  with **no external calls** (network/FS/subprocess/DB), no acquired resources, and
  no on-disk/multi-step state writes — so the timeout/cleanup/atomic-write
  conditions are not applicable.
- **Collaborator-shape guards:** option arrays are built from
  `branches`/`incomeTypes`/`expenseTypes`, which the hooks default to `[]` (their
  `EMPTY` constants) — an empty list renders only the "all" option, never throws.
  `payable.status ?? ""` and the `?? filter`/`?? id` label fallbacks guard
  null/garbage values. `SelectFilter`'s `value` is always a string (`"all"` or a
  real value), so the Radix `Select` always has a defined controlled value.
- The `DateRangeFilter` inputs are native and accept any browser-provided date
  string; `getDateInputValue` normalizes the stored key for display, so a malformed
  stored value degrades to an empty input rather than crashing.

## Verify output

```
$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  6.0s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.1s
  ✓ design        12 advisory slop tell(s)  51ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  1ms
  ✓ traceability  every requirement maps to a task  2ms

Result: PASS
```

Individual gates (T12–T14):
- `npm run lint` → exit 0 (no output).
- `npm run typecheck` → exit 0 (`tsc --noEmit`, clean).
- `npm run build` → exit 0 ("✓ Compiled successfully in 4.4s").
- `git status` → `package.json` / `package-lock.json` unchanged (R7).
- Change set = exactly 10 files: 5 new under `src/components/filters/` + payables,
  receivables, transactions/incomes, transactions/expenses, bank-accounts.

The 12 design advisories are pre-existing tells in untouched markup; this feature
introduces none (it reuses existing class strings and tokens — no new color, font,
radius, shadow, gradient, or off-scale spacing).

## Post-review revision (design-reviewer findings)

The functional reviewer approved the feature; the design-reviewer raised one
**blocking** accessibility regression and two in-scope advisories. All three are
fixed below. (A fourth advisory — settle animation present only on payables — is
**pre-existing** from the `motion-polish` feature and out of this feature's scope;
it was intentionally left untouched.) No new files were added and the change set
remains the same 10 files.

### Fix 1 [BLOCKING] — DateRangeFilter label/input association (a11y)
`src/components/filters/date-range-filter.tsx`: the two `<label>`s had no `htmlFor`
and the `<input type="date">`s had no `id`, so a screen reader could not announce
"Desde"/"Hasta" for the focused input. Added `const startId = React.useId();` /
`const endId = React.useId();`, put `id={startId}` / `id={endId}` on the inputs and
`htmlFor={startId}` / `htmlFor={endId}` on the matching labels. `React.useId`
yields SSR-stable, collision-free ids — safe under Next's server/client render.
Because this is the shared component, the fix lands on both incomes and expenses at
once.

### Fix 2 [consistency] — DateRangeFilter label style aligned to FilterField
Same file. In the incomes/expenses toolbar row, the sibling "Sucursal" / "Tipo"
labels (via `FilterField`) use
`text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground`, but
DateRangeFilter's "Desde"/"Hasta" used `text-sm font-medium text-foreground`, which
read as mismatched side by side. Changed both DateRangeFilter labels to the
FilterField label class so the filter row is visually uniform. DateRangeFilter is
used only by incomes/expenses (where this style matches the neighbors), so changing
the shared default is safe. This is a token-reuse change — no new design token
introduced, so the design slop-scan count is unchanged (still 12 pre-existing
advisories).

### Fix 3 [accent] — missing accent in new placeholder copy
- `src/app/dashboard/transactions/incomes/page.tsx`: "…Mostrando los ingresos del
  dia." → "…del **día**."
- `src/app/dashboard/transactions/expenses/page.tsx`: "…Mostrando los gastos del
  dia." → "…del **día**."

### Post-revision verification
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0 ("✓ Compiled successfully in 4.8s").
- `npx reins verify --changed` → PASS (design: still 12 advisory tells — none
  added; the a11y label association is not part of the regex slop-scan and is
  verified statically from source: every input now has a matching `htmlFor`/`id`).
- Change set still exactly the 10 files (no hook/dep/package change).

## Traceability

| Requirement | Task(s) | Verification (static — no test runner) |
| --- | --- | --- |
| R1 — FilterField renders label + icon | T1 | Static: JSX/classes promoted verbatim from bank-accounts; matches design.md signature. |
| R2 — ActiveFilterChip aria-label + onRemove | T2 | Static: `aria-label={\`Quitar filtro ${label}\`}` + `onClick={onRemove}` promoted verbatim. |
| R3 — SelectFilter first option is "all" | T3 | Static: `<SelectItem value="all">{allLabel}</SelectItem>` first, then `options.map`. |
| R4 — SelectFilter value="all" means no filter | T3, T6–T9 | Static: each adopter treats `"all"`/`"ALL"` as pass-through (guard short-circuit). |
| R5 — DateRangeFilter two date inputs | T4 | Static: two `<input type="date" className="h-11 w-full rounded-2xl border border-input bg-background px-3">`. |
| R6 — DateRangeFilter callbacks fire | T4 | Static: `onChange={(e) => onStartDateChange(e.target.value)}` / `onEndDateChange`. |
| R7 — No new dependency | T4 | `git status` clean for package.json/lock; native `<input>` + existing Radix Select only. T14 build green. |
| R8 — payables status SelectFilter | T6 | Static: `SelectFilter` in `<TableToolbar filters>`, options Pendiente/Pagado/Parcial, allLabel "Todas". |
| R9 — payables non-all filters rows | T6 | Static: `statusFilter !== "all" && (status ?? "").toLowerCase() !== statusFilter → false`. |
| R10 — payables all shows all | T6 | Static: `statusFilter === "all"` skips the guard. |
| R11 — payables active chips | T6 | Static: `activeFilterChips` + map + "Limpiar todo" when length > 0. |
| R12 — payables chip remove | T6 | Static: chip `onRemove: () => setStatusFilter("all")`. |
| R13 — payables Limpiar todo | T6 | Static: `resetFilters()` → `setStatusFilter("all")`. |
| R14 — receivables status SelectFilter | T7 | Static: mirror of R8 on receivables. |
| R15 — receivables non-all filters rows | T7 | Static: mirror of R9. |
| R16 — receivables all shows all | T7 | Static: mirror of R10. |
| R17 — receivables active chips | T7 | Static: mirror of R11. |
| R18 — receivables chip remove | T7 | Static: mirror of R12. |
| R19 — receivables Limpiar todo | T7 | Static: mirror of R13. |
| R20 — incomes filters in toolbar slot | T8 | Static: `DateRangeFilter` + 2 `SelectFilter`s in `<TableToolbar filters>`; old panel removed. |
| R21 — incomes search+date compose | T8 | Static: date comparison runs regardless of `normalizedSearch`; before/after in report. |
| R22 — incomes hasSearch short-circuit removed | T8 | Static: `useIncomes(..., { startDate, endDate })`; `hasSearch` var deleted; `if (!normalizedSearch)` guard removed. |
| R23 — incomes active chips | T8 | Static: chip per startDate/endDate≠today, branch/type≠ALL. |
| R24 — incomes chip remove | T8 | Static: per-chip `onRemove` resets only that dimension. |
| R25 — incomes Limpiar todo | T8 | Static: `resetFilters()` → today/today, ALL, ALL. |
| R26 — expenses filters in toolbar slot | T9 | Static: mirror of R20 (Sucursal, Tipo de gasto). |
| R27 — expenses search+date compose | T9 | Static: guard removed; date comparison always runs. |
| R28 — expenses normalizedSearch guard removed | T9 | Static: `if (!normalizedSearch)` block deleted in `filteredExpenses`. |
| R29 — expenses active chips | T9 | Static: mirror of R23. |
| R30 — expenses chip remove | T9 | Static: mirror of R24. |
| R31 — expenses Limpiar todo | T9 | Static: mirror of R25. |
| R32 — bank-accounts uses shared FilterField | T10 | Static: in-file `FilterField` deleted; imported from `@/components/filters`. T13 typecheck green. |
| R33 — bank-accounts uses shared ActiveFilterChip | T10 | Static: in-file `ActiveFilterChip` deleted; imported from `@/components/filters`. |
| R34 — bank-accounts uses SelectFilter, same options | T10 | Static: four `<SelectFilter>`; option values/labels/aria-labels preserved verbatim per diff. |
| R35 — bank-accounts no regression | T10 | Static: grid/Card/chips/"Limpiar todo"/`resetFilters` untouched; T14 build green. |
| R36 — no chips → placeholder | T6–T10 | Static: each page renders "Sin filtros activos…" when `activeFilterChips.length === 0`. |
| R37 — chip aria-label format | T2, T6–T10 | Static: every chip routes through `ActiveFilterChip` (R2 format). |
| R38 — status options: pendiente/pagado/parcial only | T6, T7 | Static: `statusFilterOptions` lists exactly those three; comment cites exclusion of "vencido". |
