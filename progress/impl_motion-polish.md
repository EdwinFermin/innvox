# Implementation — motion-polish

## Summary

Added a content-settle entrance (~200ms ease-out, opacity + small translateY) to the two
list/report surfaces and a global `prefers-reduced-motion: reduce` safeguard. The motion plays
exactly once per page mount via a settle-once `isLoaded` flag, uses only `tw-animate-css` classes
already imported in `globals.css`, and is gated behind `motion-safe:` so reduced-motion users get
the final state instantly. No new dependencies, no staggered/decorative reveals.

## Files changed

| File | Change | Task | Req |
| --- | --- | --- | --- |
| `src/app/globals.css` | Appended a `@media (prefers-reduced-motion: reduce)` block targeting `*, *::before, *::after` as the **last** rule (after both `@layer` blocks and both `@media print` rules) — zeroes animation/transition durations app-wide with `!important`. | T1 | R1 |
| `src/app/dashboard/payables/page.tsx` | Added local `isLoaded` state + a `useEffect` that flips it `true` the first time `isLoading` is `false`; derived `settleClass`; applied it to the `dashboard-table-frame` div's `className`. | T2 | R2, R4, R5, R6 |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Identical `isLoaded`/`settleClass` pattern (added after the existing `isLoading = isBranchesLoading \|\| isIncomesLoading \|\| isExpensesLoading` derivation); applied `settleClass` to the movement-table `Card`'s `className`. | T3 | R3, R4, R5, R6 |

The exact class string applied on **both** pages (identical, for vocabulary coherence — R4):

```
motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200
```

## Key decisions

- **Settle-once via `isLoaded`.** A `React.useState(false)` flag flipped to `true` on the first
  `!isLoading` and never reset. This is the spec's chosen mechanism (`design.md`) to keep the
  entrance from re-triggering on filter/sort/refetch re-renders (none of which change `isLoading`).
  Before load, `settleClass` is `""`, so the loading skeleton renders with no entrance; the settle
  plays once when real data first arrives. Comment in each file captures the *why*.
- **Global reduced-motion safeguard placement (R1).** The `@media (prefers-reduced-motion: reduce)`
  block is appended as the **last** rule in `globals.css` (verified: line 309, after `@layer base`
  L116, `@layer components` L144, and both `@media print` blocks L246/L290). Placing it last lets it
  override layer-scoped animation utilities — including `tw-animate-css`'s `animate-in` — using only
  `!important`, with no specificity hack. A comment documents this ordering dependency.
- **Two independent gates, by design.** The per-element `motion-safe:` variant
  (`@media (prefers-reduced-motion: no-preference)`) suppresses the entrance for reduced-motion
  users at the source; the global block is a belt-and-suspenders safeguard for any other
  animation/transition app-wide. Both satisfy the accessibility requirement in `docs/motion.md`.
- **No new tokens / no new deps (R5).** Only `tw-animate-css` utilities already imported at
  `globals.css:2` and Tailwind's built-in `motion-safe:`/`duration-200`. `package.json` and
  `package-lock.json` are unchanged (confirmed via `git status` — no diff).
- **Existing branches untouched.** The `isError` / `isLoading` / empty-state branches from earlier
  features (`error-boundaries`, `empty-states`) were not modified; only the populated content
  wrapper gained the class. `ErrorState`/`EmptyState` components were not touched (R4 coherence is
  confirmed by reuse of the same vocabulary, not by editing them).

## Design pre-flight (docs/design.md, docs/motion.md)

- **Brief inferred / design system reused.** The app styles with Tailwind + `tw-animate-css` +
  shadcn primitives; this change reuses that exact vocabulary and introduces no new color, radius,
  shadow, font, or token.
- **Motion vocabulary (docs/motion.md).** Animates only `opacity` + `transform` (no layout
  properties → no jank); duration 200ms (inside the 150–250ms band); `animate-in` is ease-out
  (entering element settles); one coherent language shared across both sibling surfaces.
- **Slop-tells walk — none shipped.** No staggered per-row reveals, no hover-lift/`scale-*`, no
  ambient infinite loops, no gradient text, no glassmorphism-by-default, no on-load reveal that
  delays reaching content (single 200ms settle on the container only). The deterministic design
  scan reports 0 findings referencing the three touched files (the 17 advisories are pre-existing
  in untouched files).
- **`prefers-reduced-motion` respected** at both the per-element (`motion-safe:`) and global level.

## Requirement → coverage table

| Req | What proves it | Coverage method |
| --- | --- | --- |
| R1 — Global reduced-motion safeguard in globals.css after `@layer` blocks | `globals.css` L309 block (verified after L116/L144 `@layer` and L246/L290 `@media print`) | T5 lint (CSS validity) + static placement check; T6 devtools toggle (deferred to leader) |
| R2 — Payables content settle (transform/opacity, 200ms, ease-out, reduced-motion gated) | `payables/page.tsx` `settleClass` on `dashboard-table-frame` via `isLoaded` | T4 typecheck + T5 lint; T6 visual preview (deferred) |
| R3 — Cuadre content settle (same constraints) | `cuadre-del-dia/page.tsx` `settleClass` on movement-table `Card` via `isLoaded` | T4 typecheck + T5 lint; T6 visual preview (deferred) |
| R4 — Coherent vocabulary across sibling surfaces | Identical class string on both pages; no mixed durations/easings | T6 (same string verified statically on both pages) |
| R5 — No new runtime dependencies | Only `tw-animate-css`/Tailwind classes; `package.json`/`package-lock.json` unchanged | T7 (`git status` clean for both files) |
| R6 — No decorative/staggered reveals | Single container settle; no per-row stagger, no hover-lift, no ambient loop | Static review of diff; T6 visual preview (deferred) |
| R7 — TypeScript + lint validity | New code is local `isLoaded` state + `settleClass` strings only | T4 (`typecheck` exit 0) + T5 (`lint` exit 0) |

> **Testing note (per spec / `reins.config.json`):** `"test": null` — no unit runner is configured.
> The spec states there is "no testable logic to unit-test"; verification is typecheck + lint +
> visual preview. No test files were created and nothing was installed, per the spec's test contract.

## Self-review (Four R's)

- **Risk** — Contained, fully reversible, in-scope. The diff touches exactly the 3 files the spec
  names plus the spec's own `tasks.md` checkboxes. No public signature, route, serialized format, or
  on-disk state changes; reverting is a pure CSS/JSX revert with no migration. No drive-by
  refactors, renames, or formatting churn. Existing `isError`/`isLoading`/empty branches were left
  intact. Blast radius is two pages' presentation only — proportionate proof is typecheck + lint +
  the static placement check, no broad-reach surface touched.
- **Readability** — Each new block carries a comment explaining the *why* of the non-obvious
  decisions: the settle-once `isLoaded` flag (so the entrance doesn't re-trigger on
  filter/sort/refetch) and the **global reduced-motion override's last-position ordering dependency**
  (so it beats `@layer`/`tw-animate-css` utilities with only `!important`). Names match behavior
  (`isLoaded`, `settleClass`). No dead/commented-out code; the class string is identical and
  self-documenting across both pages.
- **Reliability** — `isLoaded` covers its finite states: `false` while loading (no class, skeleton
  shown) → `true` once `!isLoading` and never reset. The `useEffect` depends only on `isLoading`, so
  the transition is deterministic and idempotent: a clean re-render with the flag already `true`
  re-applies the same class (no double-apply, no flicker). No reliance on map/iteration order,
  wall-clock, locale, or randomness. No unit test exists because there is no testable logic per the
  spec; correctness is a render-class derivation verified by typecheck + lint.
- **Resilience** — No new external calls, handles, locks, or multi-step writes are introduced; the
  change is pure local React state + CSS, so there is no partial-write or resource-leak surface to
  guard. The settle is purely additive: if data never arrives, `isLoaded` stays `false`, the
  skeleton keeps showing, and nothing breaks. **R6 no-stagger / no-ambient-loop** means there is no
  long-running or infinite animation that could hang or block interaction — the entrance is a
  single, finite, interruptible ~200ms tween on a container.

## Verify output

```
$ npm run typecheck
> tsc --noEmit
TYPECHECK_EXIT=0

$ npm run lint
> eslint
LINT_EXIT=0

$ git status --short package.json package-lock.json
(no output — both files unchanged)

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  5.9s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.4s
  ✓ design        17 advisory slop tell(s)  52ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  1ms
  ✓ traceability  every requirement maps to a task  4ms

Result: PASS
```

(The 17 design advisories are pre-existing in untouched files; `verify --only design` returns no
findings referencing `globals.css`, `payables/page.tsx`, or `cuadre-del-dia/page.tsx`.)

## T6 preview deferral

T6 (leader devtools preview of `prefers-reduced-motion`) is **deferred to the leader /
design-reviewer**: the auth-gated browser preview cannot be driven from the implementer session.
What I verified statically in its place:

- The global `@media (prefers-reduced-motion: reduce)` block exists and is positioned **last** in
  `globals.css` (line 309, after `@layer base` L116, `@layer components` L144, and both `@media
  print` blocks L246/L290) so it overrides `tw-animate-css` utilities.
- The exact settle class string `motion-safe:animate-in motion-safe:fade-in
  motion-safe:slide-in-from-bottom-2 motion-safe:duration-200` is applied — identically — to the
  `dashboard-table-frame` div (payables) and the movement-table `Card` (cuadre), and only to those
  two elements.

## Status

Implementation complete and self-verified (T1–T5, T7–T9 done; T6 deferred). **Not** marking the
feature `done` — awaiting the reviewer. After `APPROVED`, set `motion-polish` to `done` and move
this summary into `progress/history.md`.
