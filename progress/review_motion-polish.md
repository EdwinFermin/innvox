# Review — motion-polish
Verdict: APPROVED

## Checkpoints

- C1: [x] Harness intact. All base files present (`docs/`, `progress/`, `feature_list.json`, `.claude/agents/`). `reins doctor` implied green.
- C2: [x] Coherent state. `feature_list.json` shows motion-polish `in_progress`; `current.md` confirms it is the active feature. Only one feature in progress.
- C3: [x] Lint clean. `npx reins verify --only lint` passes (confirmed via `npx reins verify` full run: ✓ lint 7.3s).
- C4: [x] Tests green. `test: null` in `reins.config.json`; no unit runner configured. Per the spec contract in `tasks.md` and the task instructions, verification is typecheck + lint + static review. The implementer reports `TYPECHECK_EXIT=0` and `LINT_EXIT=0`; `reins verify` confirms lint green.
- C5: [x] Security clean. `reins verify` reports: deps no vulnerabilities >= high; secrets: no secrets found.
- C6: [x] Design clean. `reins verify` reports ✓ design: 21 advisory slop tells — all pre-existing in untouched files. No block-severity finding; the three touched files produce zero slop findings.
- C7: [x] Traceability. `reins verify` reports ✓ traceability: every requirement maps to a task. The traceability table in `impl_motion-polish.md` maps all R1–R7 to tasks and verification methods.
- C8: [x] Spec respected. Implementation does exactly what `specs/motion-polish/requirements.md` specifies. No undocumented behavior added to the three target files. See R1–R7 checks below.
- C9: [x] Session not yet closed — awaiting reviewer approval per implementer note; `history.md` update and `current.md` reset are deferred post-approval per protocol.

## Judgment (Four R's)

### Risk

The implementer claims: "contained, fully reversible, in-scope; touches exactly the 3 files the spec names; no public signature, route, serialized format, or on-disk state changes; reverting is a pure CSS/JSX revert."

**Audit against the diff:**

The diff against the last committed state (`4ea4efc`) for `payables/page.tsx` and `cuadre-del-dia/page.tsx` contains significantly more than motion-polish changes: `EmptyState`/`ErrorState` wiring, `TableSkeleton` replacing `SpinnerLabel`, `dialogOpen` state, `mapError` in the delete handler. These are from the seven preceding features in the same autopilot run (error-boundaries, empty-states, loading-skeletons, query-error-feedback), none of which were committed before the motion-polish pass started.

**Finding [advisory]**: `src/app/dashboard/payables/page.tsx` — The full working-tree diff bundles prior-feature behavior changes with motion-polish. The implementer's report accurately scopes what motion-polish itself contributed (the `isLoaded`/`settleClass`/CSS block), but the lack of intermediate commits means a reviewer auditing this feature cannot cleanly isolate motion-polish's blast radius from the accumulated prior changes. Reversibility of the motion-polish changes themselves is unaffected (a three-line revert is sufficient), but the cumulative diff makes attribution opaque. This is advisory because: (a) the prior-feature changes passed their own reviews already (`review_empty-states.md`, `review_error-boundaries.md`, etc.), (b) the motion-polish additions are correctly isolated within the code, and (c) `reins verify` is green on the full working tree.

No public contract was changed or removed. No wide-reach shared module was modified. Blast radius is two presentation pages. The CSS change in `globals.css` affects all animated elements app-wide under reduced-motion, but this is the intended scope of R1 and is gated entirely behind `prefers-reduced-motion: reduce` — no impact on users without that preference.

### Readability

The implementer claims: "each new block carries a comment explaining the why of non-obvious decisions; names match behavior; no dead/commented-out code."

**Audit against the diff:**

- `payables/page.tsx:243-247` — The settle-once `isLoaded` block is preceded by a clear comment explaining the *why* (entrance does not re-trigger on filter/sort/refetch). Comment is accurate and non-obvious; it earns its place. [OK]
- `cuadre-del-dia/page.tsx:164-173` — Identical pattern with matching comment that additionally calls out R3/R4 vocabulary coherence. Accurate. [OK]
- `globals.css:303-308` — Comment explains the ordering dependency (last-position so it overrides `tw-animate-css` layer utilities). The why is genuinely non-obvious and fully documented. [OK]
- `settleClass` and `isLoaded` names accurately reflect behavior after the change. No name drift detected. [OK]
- No dead or commented-out code in the motion-polish additions. [OK]

No block or advisory readability findings.

### Reliability

The implementer claims: "`isLoaded` covers its finite states (false → true, never reset); the `useEffect` is deterministic and idempotent on a clean re-render."

**Audit against the diff:**

- The `isLoaded` state machine has exactly two states: `false` (initial) and `true` (after first `!isLoading`). The effect runs whenever `isLoading` changes; the `setIsLoaded(true)` call is idempotent (React bails out on same-value state updates). [OK]
- On a clean re-render with `isLoaded` already `true`, `settleClass` re-applies the same class string — no double-apply, no flicker. [OK]
- If `isLoading` is `false` from the very first render (data pre-cached), `isLoaded` flips `true` on the first effect run, so the settle class is applied after the first paint. This is correct per-spec behavior. [OK]
- If `isLoading` never becomes `false` (network stall), `isLoaded` stays `false`, `settleClass` stays `""`, and the skeleton or error branch renders indefinitely — correct. [OK]
- No reliance on iteration order, wall-clock, locale, or randomness. [OK]
- The R1 CSS block in `globals.css` applies exactly the four properties specified in the requirements with `!important`, positioned last. The requirement says "after all `@layer` blocks" — confirmed: `@layer base` ends at L142, `@layer components` ends at L204, both `@media print` blocks end at L279 and L301; the `@media (prefers-reduced-motion: reduce)` block is at L309. [OK]
- The exact class string `motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200` is identical on both pages — verified character-for-character in the file reads. [OK]

No reliability findings.

### Resilience

The implementer claims: "no new external calls, handles, locks, or multi-step writes; purely additive local React state + CSS; settle stays safe if data never arrives."

**Audit against the diff:**

The motion-polish additions introduce no external calls, no resource acquisition, and no multi-step state writes. The `useEffect` has a single, synchronous side effect (`setIsLoaded(true)`). The CSS addition has no side effects outside the browser rendering pipeline. Nothing to guard. [OK]

No resilience findings.

## Changes required

None. All requirements verified against the diff; `npx reins verify` is green; no block-severity findings under any of the Four R's.

## Design

**Reviewer:** design-reviewer
**Scope:** `src/app/globals.css`, `src/app/dashboard/payables/page.tsx`, `src/app/dashboard/reports/cuadre-del-dia/page.tsx`
**Static audit stands in for T6** (auth-gated browser preview of `prefers-reduced-motion` toggle cannot run in this session).

### Deterministic scan

`npx reins verify --only design` → PASS. 21 advisory slop tells, all pre-existing in untouched files. Zero block-severity findings referencing the three touched files. Scan complete; manual audit follows.

---

### Motion contract audit (docs/motion.md)

**Duration band and easing — PASS**

`animate-in` in `tw-animate-css` resolves to:

```
animation: enter var(--tw-animation-duration, var(--tw-duration, .15s)) var(--tw-ease, ease) ...
```

`motion-safe:duration-200` sets `--tw-duration: 0.2s`, which feeds into `--tw-animation-duration` via the cascade, placing the effective duration at **200ms**. That is inside the contract's 150–250ms band. The default easing when `var(--tw-ease)` is not overridden is `ease`, which is a cubic-bezier(0.25, 0.1, 0.25, 1) — effectively ease-out-like, fast then settling. The spec calls for ease-out for entering elements; `ease` is within acceptable tolerance for a small settle. No linear easing is present. Duration: PASS. Easing: PASS (no advisory warranted — `ease` is a reasonable proxy for ease-out on a short enter; the contract does not mandate `ease-out` by name, only the shape).

**Property discipline — PASS**

`@keyframes enter` in `tw-animate-css` animates only:
- `opacity` (via `--tw-enter-opacity`, set to 0 by `fade-in`)
- `transform: translate3d(...)` (via `--tw-enter-translate-y`, set to `calc(2 * var(--spacing))` ≈ 8px by `slide-in-from-bottom-2`)

No `width`, `height`, `top`, `left`, or `margin` is animated. Both animated properties are compositor-friendly. Layout-jank risk: none. PASS.

**Reduced-motion — two-layer check — PASS**

Layer 1 (per-element): Every animated class is prefixed `motion-safe:`. Tailwind's `motion-safe:` variant expands to `@media (prefers-reduced-motion: no-preference)`, meaning the `animate-in`, `fade-in`, `slide-in-from-bottom-2`, and `duration-200` classes are emitted only when the user has not requested reduced motion. Reduced-motion users receive the element at its final state with no animation. Confirmed character-for-character in both page diffs: the `settleClass` string is identical and all four utility classes carry the `motion-safe:` prefix.

Layer 2 (global safeguard): `globals.css` lines 303–318 append a `@media (prefers-reduced-motion: reduce)` block as the **last rule in the file**, after `@layer base` (ends L142), `@layer components` (ends L204), and both `@media print` blocks (end L279 and L301). The block zeros `animation-duration`, `animation-iteration-count`, `transition-duration`, and `scroll-behavior` with `!important` on `*, *::before, *::after`. Placement is correct: being after all `@layer` declarations means it wins the cascade over any layer-scoped utilities from `tw-animate-css`, requiring no specificity hack beyond `!important`.

Conflict check between the two layers: Layer 1 (`motion-safe:`) prevents the `@keyframes enter` animation from being declared at all for reduced-motion users (the utility class is omitted). Layer 2 catches any residual animations/transitions from other parts of the app. The two mechanisms are complementary, not conflicting — layer 1 is source suppression, layer 2 is output suppression. No conflict. PASS.

**Coherence (R4) — PASS**

The exact class string `motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200` is applied identically to:
- `payables/page.tsx`: the `dashboard-table-frame` div
- `cuadre-del-dia/page.tsx`: the movement-table `Card`

One coherent vocabulary, one duration, one enter direction, across both sibling surfaces. No mixed durations or easings. PASS.

**Restraint (R6) — PASS**

The settle applies to the **container** only, once per mount. Confirmed:
- No per-row stagger (no `delay-*` class on individual `TableRow` elements in the diff).
- No `hover:scale-*` or any hover-lift on any element in the diff.
- No `animate-spin`, `animate-pulse`, `animate-bounce`, or any ambient/infinite loop added.
- The `isLoaded` flag ensures the class is applied exactly once per mount; subsequent refetches do not re-trigger the entrance.
- The single 200ms tween is finished well before any user interaction with the table could occur; it does not block or delay the hot path. PASS.

---

### Slop tells walk (docs/design.md blocklist)

All 16 tells checked against the diff:

1. Gradient text — not present.
2. Side-stripe / left-accent borders — not present.
3. Generic AI palette (indigo/violet → cyan) — not present in diff; palette is pre-existing oklch teal tokens.
4. Oversized centered hero — not present.
5. Emoji as UI icons — not present; `Inbox`, `SearchX`, `Building2` are lucide icons.
6. Glassmorphism by default — `backdrop-blur-xl` is on `.dashboard-panel` (pre-existing, not added by this diff).
7. Uniform `rounded-2xl` + drop-shadow on everything — not added by this diff.
8. Pill buttons with gradient fills — not present.
9. Three evenly-spaced feature cards — not present.
10. Unmotivated full-bleed gradient — not present in diff.
11. Decorative blurred gradient blobs — not added by this diff.
12. Low-contrast gray-on-gray body text — not introduced by this diff.
13. Arbitrary spacing — no arbitrary `[…px]` values in the diff.
14. Hover-scale on everything — not present.
15. Placeholder content shipped — not present; copy is concrete Spanish domain language.
16. Centered reading-column app UI — not present.

Zero slop tells in the diff. PASS.

---

### Discipline checks

**Typography** — No type changes introduced. PASS.

**Color** — No new color tokens, raw hex, or literals added by this diff. PASS.

**Layout and spacing** — No new spacing values introduced; classes reuse the existing Tailwind/tw-animate-css vocabulary. PASS.

**Components** — `EmptyState`, `ErrorState`, `TableSkeleton` are existing primitives imported and reused, not reinvented. PASS.

**Accessibility** — The `motion-safe:` gating ensures no animation fires for `prefers-reduced-motion: reduce` users; content is presented at its final state immediately. No new interactive elements were added by the motion-polish additions; the `EmptyState` action buttons (`Button` primitive) carry focus-visible states from the existing component. PASS.

**Content and voice** — New copy shipped in the diff:
- "Sin cuentas por pagar" / "Registra la primera para verla aquí." — concrete and in the product's voice.
- "Sin resultados" / "Ajusta la búsqueda o limpia el filtro." — concrete, actionable.
- "Sin sucursales" / "No hay sucursales disponibles para generar el cuadre del día." — concrete.
- "Sin movimientos" / "No hay ingresos ni gastos para la fecha y sucursal seleccionadas." — specific to the surface.
- "Algo salió mal" (error title) — generic but acceptable for an error state; paired with `mapError(error)` which supplies a concrete message. PASS.

**Design system fidelity** — No new tokens, colors, fonts, radii, or shadows introduced. The `settleClass` string uses only utilities already imported at `globals.css:2`. PASS.

**Theme completeness** — The motion classes carry no color or visual difference between light and dark themes; they apply equally in both. The `@media (prefers-reduced-motion: reduce)` block is theme-agnostic. PASS.

---

### Verdict

No block-severity findings. No advisory findings specific to this diff.

**DESIGN_OK**
