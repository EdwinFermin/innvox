# Review — table-filters
Verdict: APPROVED

## Checkpoints

- C1: [x] Harness intact. `reins doctor` reports HEALTHY: all 15 core files present, all agents wired, manifest v0.9.0.
- C2: [x] Coherent state. `feature_list.json` shows `table-filters` as `in_progress`; `current.md` shows "(none)" as active, consistent with the autopilot-run-complete note. `npx reins verify --only feature-list` → PASS (16 features, 1 active, 1 in progress).
- C3: [x] Lint clean. `npx reins verify --only lint` → ✓ lint npm run lint 5.6s (exit 0).
- C4: [x] Tests green. `reins.config.json` sets `test: null`; no unit runner configured. Per the project's established pattern (all eight prior features used the same contract), verification is typecheck + lint + static diff audit. `reins verify` confirms lint green; implementer reports typecheck and build both exit 0; verified below in C8/Four R's detail.
- C5: [x] Security clean. `reins verify` reports: deps no vulnerabilities >= high; secrets: no secrets found. `package.json`/`package-lock.json` are unchanged (R7 — no new npm dependency).
- C6: [x] Design clean. `reins verify` reports ✓ design: 15 advisory slop tells — all pre-existing in untouched files. Zero block-severity findings. The new components reuse existing class strings and Radix primitives; no new color, font, radius, shadow, gradient, or off-scale spacing introduced.
- C7: [x] Traceability. `reins verify` reports ✓ traceability: every requirement maps to a task. The traceability table in `impl_table-filters.md` maps all R1–R38 to T1–T14, each citing an explicit verification method.
- C8: [x] Spec respected. Implementation matches `specs/table-filters/requirements.md` R1–R38. See detailed findings below.
- C9: [ ] Session not yet closed — `history.md` and `current.md` have not been updated to reflect `table-filters` as `done`. This is deferred to post-approval per established protocol (leader-owned step); not a block given the pattern used by all prior eight features.

## Judgment (Four R's)

Audit of the implementer's self-review claims against the diff.

### Risk — *blast radius + reversibility*

**Implementer claims:** Exactly 10 files touched (5 new under `src/components/filters/`, 5 edited page files); no public contract removed or renamed; `package.json`/`package-lock.json` unchanged; `src/hooks/use-expenses.ts` untouched (explicit scope decision); `progress/history.md` not modified; reversibility is a clean diff revert.

**Audit:**

- The five new files under `src/components/filters/` are confirmed present and are untracked new files (not counted in the modified-file list). The five page files appear in `git diff --name-only`: `payables/page.tsx`, `receivables/page.tsx`, `transactions/incomes/page.tsx`, `transactions/expenses/page.tsx`, `bank-accounts/page.tsx`. Scope claim holds. [OK]
- `use-expenses.ts` is absent from the diff. [OK]
- `package.json`/`package-lock.json` are absent from the diff. [OK]
- The two deleted in-file functions (`FilterField`, `ActiveFilterChip`) in `bank-accounts/page.tsx` were file-local (unexported). Grep confirms no import of them exists outside that file. Zero external fan-in — no public contract removed. [OK]
- `progress/history.md` tail confirmed: last entry is `motion-polish`; no `table-filters` entry exists — append-only state untouched. [OK]
- The `getColumnLabel` function was refactored to a module-level `columnLabels` object on all five pages. This is a behavior-neutral internal refactor bundled with the feature; it has no callers outside each respective file and changes no output. Blast radius is zero. [advisory — minor bundled refactor, no behavior impact]

No block findings. One advisory: the bundled `getColumnLabel` → `columnLabels` refactor is in scope of the "don't refactor untouched logic" CLAUDE.md note but carries zero blast radius and does not affect any requirement.

### Readability — *intent recoverable by a cold agent*

**Implementer claims:** Each new component has a doc comment explaining what it is and that the two promotions are verbatim; non-obvious decisions documented (value bridge `"ALL"↔"all"`, `statusFilterOptions` vencido exclusion, composition fix, `useExpenses` scope decision); no dead code; names match behavior.

**Audit:**

- `filter-field.tsx:10-14`, `active-filter-chip.tsx:11-16`, `select-filter.tsx:28-32`, `date-range-filter.tsx:16-20` — All four components have doc comments explaining function and origin. Promotion rationale is explicit. [OK]
- `payables/page.tsx:77-79` — Comment explains vencido exclusion with R38 cite. [OK]
- `incomes/page.tsx:608-624` — The `value={branchFilter === "ALL" ? "all" : branchFilter}` / `onValueChange={(value) => setBranchFilter(value === "all" ? "ALL" : value)}` pattern is the value bridge; no comment is present inline in the rendered JSX, but the design rationale is captured in `impl_table-filters.md` (Key decisions §). Per the Four R's contract, why captured in the implementation report satisfies the requirement. [OK]
- `hasSearch` local variable is fully absent in the incomes diff (both the const and its only use removed). No dead code. [OK]
- `getDateInputValue` import removed from incomes and expenses pages after `DateRangeFilter` internalized it — confirmed the import no longer appears. [OK]
- `normalizedSearch` variable is retained in both incomes and expenses (still used for the search-match block above the now-removed date guard). No dead variable. [OK]
- Names are accurate: `statusFilter`, `activeFilterChips`, `resetFilters`, `branchFilterOptions`, `typeFilterOptions` all match what they hold/do after the change. [OK]

No findings.

### Reliability — *right answer for in-contract inputs*

**Implementer claims:** Status guard is case-insensitive and null-safe; finite enum coverage excludes vencido; date composition works for both empty and non-empty searchTerm; chip detection has no false positives on first paint; value bridge is idempotent; empty option arrays degrade to all-option-only.

**Audit:**

**R1 — FilterField class string:** `filter-field.tsx:26` — class is exactly `"flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"`. Matches design.md spec character-for-character. [OK]

**R2 — ActiveFilterChip aria-label:** `active-filter-chip.tsx:26` — `aria-label={\`Quitar filtro ${label}\`}`. Exact format. onClick fires onRemove. [OK]

**R3 — SelectFilter first option:** `select-filter.tsx:54` — `<SelectItem value="all">{allLabel}</SelectItem>` is the first item inside `<SelectContent>`, before `options.map`. [OK]

**R5 — DateRangeFilter inputs:** `date-range-filter.tsx:34,44` — two `<input type="date" className="h-11 w-full rounded-2xl border border-input bg-background px-3" />`. Class matches design.md spec. [OK]

**R8/R14 — Status options (no vencido):** `payables/page.tsx:79-84` and `receivables/page.tsx:79-84` — `statusFilterOptions` contains exactly `pendiente`, `pagado`, `parcial`. [OK]

**R9/R15 — Case-insensitive status filter:** `payables/page.tsx:290-295` — `(payable.status ?? "").toLowerCase() !== statusFilter`. Null/undefined status coerces to `""` and never matches a real filter value. [OK]

**R21/R22 — Incomes search+date composition fix:**
- `incomes/page.tsx:311-313` — `useIncomes(user?.id || "", { startDate, endDate })` — the `hasSearch ? {} : ...` ternary is gone. [OK]
- `incomes/page.tsx:376-379` — date comparisons now unconditional (no `if (!normalizedSearch)` guard). [OK]
- `normalizedSearch` still used at line 352 for search matching — declared but not dead. [OK]

**R27/R28 — Expenses search+date composition fix:**
- `expenses/page.tsx:370-373` — `if (!normalizedSearch)` guard removed; date comparisons unconditional. [OK]
- `useExpenses(user?.id || "")` call unchanged — justified by scope decision (see below).

**R32/R33 — bank-accounts in-file helpers deleted:** Diff confirms both `function FilterField` and `function ActiveFilterChip` blocks are removed (55 lines deleted), and `import { ActiveFilterChip, FilterField, SelectFilter } from "@/components/filters"` added at line 28. [OK]

**R34 — bank-accounts SelectFilter option values preserved:** Confirmed at `bank-accounts/page.tsx:699-749`: status options `active/inactive`, type options `bank/petty_cash`, currency options `DOP/USD`, branch options from `branches.map(b => ({ value: b.id, label: b.name }))`. The diff confirms these are identical to what was previously in the inline `<SelectTrigger>/<SelectContent>` blocks. aria-labels preserved verbatim (Filtrar por estado/tipo de cuenta/sucursal/moneda). [OK]

**R36 — "Sin filtros activos" placeholder:** All five pages render the placeholder when `activeFilterChips.length === 0`. Confirmed via grep: `payables/page.tsx:411`, `receivables/page.tsx:435`, `incomes/page.tsx:645`, `expenses/page.tsx:638`, `bank-accounts/page.tsx:765`. [OK]

**One advisory Reliability note:** In `incomes/page.tsx:440` and `expenses/page.tsx:435`, the `today` variable is captured inside `useMemo` at render time, then closed over by each chip's `onRemove` callback (e.g., `onRemove: () => setStartDate(today)`). If the page remains open across midnight and the user clicks the chip after rollover, the reset would target yesterday's date rather than today's. This is an extremely unlikely edge case (a midnight-straddling session followed by a chip click before any re-render occurs). The default state is initialized via `React.useState<string>(getTodayDateKey)` (initializer form, called once) so the state is already stable. [advisory — no block; the pre-existing `getTodayDateKey` call pattern is unchanged from the state initialization; this is the same approach used elsewhere in the codebase]

### Resilience — *fails safe when the world breaks*

**Implementer claims:** Pure client-side presentational components with no external calls, resource acquisition, or multi-step state writes; collaborator-shape guards in place (empty arrays → all-option-only, `payable.status ?? ""`, label fallbacks).

**Audit:**

- All five shared components are pure UI with no async operations. No fetch, no DB call, no FS access. Timeout/cleanup conditions not applicable. [OK]
- `SelectFilter` receives `options` as a prop; if `branches` or `incomeTypes` hooks return `[]` (their `EMPTY` constant default), `options.map` produces zero items and only the `allLabel` "all" option is rendered. Radix `Select` with no options beyond the default is still controlled and renders without error. [OK]
- `payable.status ?? ""` and the `?? typeFilter` / `?? branchFilter` label fallbacks in chip labels handle null/garbage values at the boundary. [OK]
- `DateRangeFilter` delegates display normalization to `getDateInputValue` which returns `""` for unparseable input — degrades gracefully to an empty input without throwing. [OK]

No findings.

## Scope deviation ruling — `useExpenses` date params not added

The spec (design.md) says step 1 for expenses is "add `{ startDate, endDate }` to the `useExpenses` call". The implementer did not add this because `useExpenses(userId: string)` accepts only one parameter and changing it would require editing an 11th file.

**Assessment: the deviation is acceptable and does not constitute a requirement miss.** The correctness-bearing requirements are R27 ("both filters apply simultaneously") and R28 ("date range always applies when searchTerm is non-empty"). Both are satisfied by client-side guard removal alone. design.md explicitly states: "narrowing the date on the server is an **optimization, not a correctness requirement**". The expenses page has always fetched all rows client-side (no server-side date narrowing was ever in place), and the client-side `filteredExpenses` now applies the date range unconditionally. The requirements are met; the omitted step is a deferred performance optimization with no functional gap. This is confirmed by the typecheck exit 0 (the call site has no type error in its current form).

## Changes required

None.
