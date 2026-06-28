# Tasks — motion-polish

> Discrete tasks that together cover every requirement. Check each off when done.
>
> **Testing note:** this project has no test runner (`"test": null` in package.json). All
> requirements are presentational/CSS or JSX-class changes with no testable logic to unit-test.
> Verification relies on `npm run typecheck`, `npm run lint`, and a visual/interactive preview
> (toggling `prefers-reduced-motion` in browser devtools). The traceability column records the
> verification method for each requirement.

---

## Implementation

- [x] T1 — Append the `@media (prefers-reduced-motion: reduce)` block to `src/app/globals.css`
      after the existing `@media print` rules. The block targets `*, *::before, *::after` and
      sets `animation-duration: 0.01ms !important`, `animation-iteration-count: 1 !important`,
      `transition-duration: 0.01ms !important`, `scroll-behavior: auto !important`. (covers: R1)

- [x] T2 — In `src/app/dashboard/payables/page.tsx`, add a local `isLoaded` boolean state
      (initialized `false`) and a `useEffect` that sets it to `true` the first time `isLoading`
      is `false`. Derive `settleClass` from `isLoaded` and apply it to the `dashboard-table-frame`
      div's `className`. The class string is:
      `motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200`. (covers: R2, R4, R5, R6)

- [x] T3 — In `src/app/dashboard/reports/cuadre-del-dia/page.tsx`, apply the identical `isLoaded`
      / `settleClass` pattern to the movement-table `Card` element's `className`. The page already
      derives `isLoading` from `isBranchesLoading || isIncomesLoading || isExpensesLoading`. (covers: R3, R4, R5, R6)

---

## Verification

- [x] T4 — Run `npm run typecheck`; confirm zero TypeScript errors introduced by T2 and T3.
      (covers: R7)

- [x] T5 — Run `npm run lint`; confirm zero new lint violations introduced by T1, T2, or T3.
      (covers: R7)

- [ ] T6 — Leader preview verification: open payables page and cuadre page in the browser. In
      Chrome DevTools > Rendering, enable "Emulate CSS media feature prefers-reduced-motion: reduce"
      and confirm content appears instantly with no animation. Disable it and confirm the ~200ms
      opacity + translateY settle plays once on first load. (covers: R1, R2, R3, R4, R6)
      DEFERRED to leader/design-reviewer: auth-gated browser preview cannot be driven from the
      implementer session; class strings + the global media block verified statically instead.

- [x] T7 — Verify no new packages were added to `package.json` or `package-lock.json`. (covers: R5)

---

## Close

- [x] T8 — `npx reins verify` is green (lint + typecheck pass; no test runner configured).
- [x] T9 — Traceability table written into `progress/impl_motion-polish.md`.

---

## Traceability

| Requirement | Task(s) | Verification |
| --- | --- | --- |
| R1 — Global reduced-motion safeguard | T1 | T5, T6 (devtools toggle) |
| R2 — Payables content settle | T2 | T4, T5, T6 (visual preview) |
| R3 — Cuadre content settle | T3 | T4, T5, T6 (visual preview) |
| R4 — Coherent motion vocabulary | T2, T3 | T6 (same class string on both pages) |
| R5 — No new dependencies | T2, T3 | T7 |
| R6 — No decorative/staggered reveals | T2, T3 | T6 (single settle, no row stagger) |
| R7 — TypeScript and lint validity | T2, T3 | T4, T5 |
