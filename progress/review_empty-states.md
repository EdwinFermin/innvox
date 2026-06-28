# Review — empty-states
Verdict: APPROVED

## Checkpoints

- C1: [x] — `reins doctor` reports HEALTHY; all 15 core files present, all agents wired.
- C2: [x] — One feature `in_progress` (empty-states); all states valid (`reins verify --only feature-list` passes).
- C3: [x] — `npx reins verify --only lint` passes; `npm run lint` clean per implementer's self-verify and confirmed by current run.
- C4: [x] — `test: null` in `reins.config.json`; unit check skipped (`∘`) per protocol. Test contract satisfied by traceability table + green verify. No executable test files required.
- C5: [x] — Security check clean: no vulnerabilities >= high; no secrets found. Only existing `lucide-react` used (no new deps, no `package.json` changes).
- C6: [x] — Design scan passes: 21 advisory tells, 0 block-severity tells. `failOn: "block"` threshold not triggered.
- C7: [x] — Traceability check passes: every requirement (R1–R14) maps to at least one task in `specs/empty-states/tasks.md`. T8–T11 are properly annotated as deferred pending unit runner.
- C8: [x] — Implementation does exactly what the approved spec says: `EmptyState` component created; dialog lifted to controlled; payables empty/no-results/loading branches correct; cuadre no-movements and no-branches states correct; no out-of-scope changes.
- C9: [ ] — `progress/history.md` not yet updated and `current.md` not reset (implementer explicitly deferred until after APPROVED, which is correct per handoff note).

C9 is deferred by design at handoff time; it does not block approval.

## Judgment (Four R's)

### Risk

Implementer claim: diff stays in scope; `NewPayableDialog` signature change has a single caller (`payables/page.tsx`) updated in the same diff; blast radius is contained and reversible.

Audit against diff:
- Scope fidelity: confirmed. Only the four files named in the spec plus `specs/empty-states/tasks.md` (checked-off) were changed. No drive-by refactors or formatting churn.
- Fan-in of `NewPayableDialog`: the only import site is `src/app/dashboard/payables/page.tsx` (confirmed by reading both files; no other reference in the tree). Signature change (`open`/`onOpenChange` added, internal `useState` removed) is fully contained in the same diff.
- `EmptyState` is a new export; no existing symbol was removed or renamed.
- `progress/history.md` is append-only and untouched in this diff (correct; entry to be appended after approval).
- Coverage proportional to blast radius: the highest-reach change (controlled-dialog wiring) is exercised structurally at both trigger sites in the diff. Advisory: no regression test for the form-reset path (see Reliability below), but blast radius for pure UI lift is contained.
- Risk: **advisory** (no block finding).

### Readability

Implementer claim: shared dialog state carries an explanatory comment; controlled-props interface documents parent ownership; icon/SearchX deviations recorded in impl report.

Audit against diff:
- `payables/page.tsx:233–235`: comment `// Single dialog state shared between the header trigger and the empty-state // action so only one NewPayableDialog instance lives in the tree (R10).` — present and accurate.
- `new-payable-dialog.tsx:46–51`: JSDoc on `open` prop reads "Controlled open state, owned by the parent page so a single dialog instance can be triggered from both the header and the in-table action." — correctly documents intent.
- `empty-state.tsx:20–32`: component-level JSDoc explains `icon: LucideIcon` vs `ReactNode` rationale and layout neutrality. No magic literals, no dead code, no commented-out blocks.
- `icon: LucideIcon` deviation is recorded in impl report with rationale (consistent sizing across call sites). All four call sites (`Inbox`, `SearchX`, `Building2`, `Inbox`) pass component references consistently.
- `SearchX` omission from cuadre page is documented in impl report and tasks.md T5 annotation. No misleading dead import.
- Readability: **advisory** — no block finding. One mild note: the `DialogTrigger` in `new-payable-dialog.tsx` co-exists with external `open` control; a cold reader might need a moment to understand the mixed pattern (the trigger fires `onOpenChange` through Radix, which is wired to the same `setDialogOpen`). The impl report explains the decision; the why is recoverable.

### Reliability

Implementer claim: payables branches partition the no-rows space exhaustively; cuadre branches gated on `!isLoading`; R10 shared-state correctness verified.

Audit against diff:

- Branch ordering in `payables/page.tsx:386–437`: `isLoading` → skeleton (line 386); `table.getRowModel().rows?.length` → data rows (line 391); `payables.length === 0` → empty-dataset state (line 407); else → no-results state (line 422). Order is correct; loading is checked first so skeletons are never replaced mid-load.
- **Advisory finding — edge case in empty-dataset discriminant** (`payables/page.tsx:407`): The `payables.length === 0` branch uses the raw unfiltered array. When `visibilityScope === "mine"` and the user has no personal records but `payables` is non-empty, `filteredPayables` is empty, `table.getRowModel().rows` is 0, but `payables.length > 0`, so the code falls into the `SearchX` "no results" branch displaying "Ajusta la búsqueda o limpia el filtro." The "Limpiar búsqueda" action (`setSearchQuery("")`) will not restore rows because the scope filter is the cause. This is a pre-existing product-level limitation (the visibility scope control existed before this feature), and R8 in the spec explicitly includes `visibilityScope` filtering in the no-results definition — the spec owns this behavior. Not a block.
- **Advisory finding — form reset regression on in-table trigger** (`new-payable-dialog.tsx:109`, `payables/page.tsx:415`): The header trigger button has `onClick={() => reset({...})}`, resetting the form when opened via the header. The in-table `<Button onClick={() => setDialogOpen(true)}>` has no reset call. If a user partially fills the form, hits Cancel, then opens via the in-table button, they see stale form data. This is a mild regression — the prior trigger always reset on open. However, R10 is limited to dialog-state sharing; no reset-on-open requirement exists in the spec. The `onSuccess` reset preserves the happy path. **Advisory**, not block.
- Cuadre: `!isLoading && !branches.length` gate (line 202) is correct; movements else-arm is reachable only when `isLoading` is false (lines 233–273, ternary). Loading branches are byte-for-byte unchanged.
- Spanish copy matches spec exactly:
  - R7: "Sin cuentas por pagar" / "Registra la primera para verla aquí." ✓
  - R8: "Sin resultados" / "Ajusta la búsqueda o limpia el filtro." ✓ / "Limpiar búsqueda" ✓
  - R11: "Sin movimientos" / "No hay ingresos ni gastos para la fecha y sucursal seleccionadas." ✓
  - R12: "Sin sucursales" / "No hay sucursales disponibles para generar el cuadre del día." ✓
- Icon assignments match spec: R7→`Inbox`, R8→`SearchX`, R11→`Inbox`, R12→`Building2` ✓
- `action` prop presence/absence: R7 has action; R8 has action; R11 no action (no prop passed); R12 no action ✓
- Reliability: **advisory** (no block finding; two advisory items above).

### Resilience

Implementer claim: no new external calls or on-disk state; R5 reduced-motion gate is CSS-only.

Audit against diff:
- `EmptyState` is pure presentation with no side effects, no network calls, no resource acquisition.
- Dialog mutation error handling (`onError: mapError → toast`) is preserved unchanged.
- R5: all animation classes in `empty-state.tsx:44` are behind `motion-safe:` (`motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out`). `prefers-reduced-motion: reduce` environment gets a static render with no transitions. Animation is a one-shot CSS keyframe — no JS animation that could leave the component in an intermediate state.
- Resilience: **no finding**.

## Implementer deviation audit

### (a) `icon: LucideIcon` vs `React.ReactNode`
Sound. The `LucideIcon` type from `lucide-react` is a valid component type; the `icon: Icon` aliasing pattern on line 33 of `empty-state.tsx` allows internal sizing control (`className="size-6"`) uniformly. All four call sites pass component references (`Inbox`, `SearchX`, `Building2`). Consistent across definition and all usages. Does not violate any requirement (R1 says "icon node" conceptually; the prop accepts the component which renders to a node). Acceptable deviation.

### (b) `SearchX` not imported in `cuadre-del-dia/page.tsx`
Sound. The cuadre page has no search-filter case; R11 and R12 use only `Inbox` and `Building2`. Importing `SearchX` unused would trigger ESLint `no-unused-vars` / `@typescript-eslint/no-unused-vars`, breaking C3. The deviation is lint-driven and correct. `SearchX` is imported where it is actually used (`payables/page.tsx:17`).

## Changes required

None.
