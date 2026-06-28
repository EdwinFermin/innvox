# Requirements — motion-polish

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by
> at least one test (typecheck/lint/preview where no test runner exists; see notes in tasks.md).

---

## R1 — Global reduced-motion safeguard exists in globals.css

WHEN the browser reports `prefers-reduced-motion: reduce`, the system SHALL apply the following CSS
rules to `*, *::before, *::after` with `!important`:
- `animation-duration: 0.01ms`
- `animation-iteration-count: 1`
- `transition-duration: 0.01ms`
- `scroll-behavior: auto`

The `@media (prefers-reduced-motion: reduce)` block SHALL be present in
`src/app/globals.css` and SHALL be placed after all `@layer` blocks so it overrides
layer-scoped animation utilities, including those introduced by `tw-animate-css`.

## R2 — Payables table content settle animation

WHEN `isLoading` transitions from `true` to `false` and data rows are rendered in
`src/app/dashboard/payables/page.tsx`, the system SHALL apply a ~200ms ease-out opacity-plus-translateY
entrance to the `dashboard-table-frame` wrapper element.

The animation SHALL:
- Animate only `opacity` and `transform` (no layout properties such as `width`, `height`, `top`,
  `left`, or `margin`).
- Use a duration in the range 150–250ms.
- Use ease-out timing.
- Be gated behind `@media (prefers-reduced-motion: no-preference)` so that reduced-motion users
  receive the element at its final state with no transition delay.

## R3 — Cuadre content settle animation

WHEN `isLoading` transitions from `true` to `false` and the movement table card is rendered in
`src/app/dashboard/reports/cuadre-del-dia/page.tsx`, the system SHALL apply a ~200ms ease-out
opacity-plus-translateY entrance to the movement-table card element, using the same vocabulary as R2.

The animation SHALL satisfy the same constraints as R2 (transform/opacity only, 150–250ms,
ease-out, gated on `prefers-reduced-motion: no-preference`).

## R4 — Coherent motion vocabulary across sibling surfaces

WHEN motion is applied on payables and cuadre pages, the system SHALL use a single coherent
duration (nominally 200ms) and ease-out timing consistent with the entry vocabulary expected by
`ErrorState` (feature `error-boundaries`) and `EmptyState` (feature `empty-states`). No mixing of
durations or easings SHALL be introduced within the same page.

## R5 — No new runtime dependencies

WHEN motion utilities are chosen for R2 and R3, the system SHALL use only CSS classes already
available from `tw-animate-css` (already imported at `globals.css:2`) or Tailwind utility classes
already in the project. No new npm packages SHALL be introduced.

## R6 — No decorative or staggered on-load reveals

WHEN the page transitions from loading to loaded, the system SHALL NOT introduce staggered per-row
animations, hover-lift effects on cards, ambient loops, or any animation that delays the user
reaching interactive content beyond the single ~200ms settle defined in R2/R3.

## R7 — TypeScript and lint validity

WHEN any TypeScript or JSX file is modified, the system SHALL produce zero errors on
`npm run typecheck` and zero new lint violations on `npm run lint`.
