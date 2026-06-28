# Discovery — motion-polish

## Request

Apply `docs/motion.md`-compliant micro-interactions on the reference pages — the personality layer that reads as "not generic" — **without** introducing the decorative on-load reveals that motion.md explicitly calls slop.

## Findings

- The app already animates the right things: shadcn primitives use `tw-animate-css` (`@import "tw-animate-css"` in `src/app/globals.css:2`). `dialog.tsx:41,63`, `sheet.tsx:39,61`, `dropdown-menu.tsx` carry `animate-in/out`, `fade-in`, `zoom-in`, `slide-in`, `duration-*`, `ease-*` on `data-state` — coherent enter/exit feedback.
- The reference **pages** (`payables/page.tsx`, `cuadre-del-dia/page.tsx`) have **no bespoke transitions** of their own — content pops from loading to loaded with no continuity.
- **No `prefers-reduced-motion` handling exists** anywhere (`globals.css` and components return nothing for `motion-reduce`/`motion-safe`/`@media (prefers-reduced-motion)`). shadcn's default animation classes do **not** gate on it — so today the app violates motion.md's **Block** condition (ignoring reduced-motion on essential flows) globally.
- Incoming sibling features add motion-safe entries to `ErrorState` (feature 1) and `EmptyState` (feature 6). For coherence those should share one vocabulary with anything added here.
- `docs/motion.md` is explicit: animate for continuity/feedback; **do not** add staggered list reveals or on-load reveals that delay content. So the high-value work here is correctness + a single continuity transition, not flourish.

## Affected areas

- `src/app/globals.css` — add a global `@media (prefers-reduced-motion: reduce)` safeguard that neutralizes animation/transition durations (app-wide, single rule).
- `src/app/dashboard/payables/page.tsx`, `src/app/dashboard/reports/cuadre-del-dia/page.tsx` — a subtle opacity settle on the loading→loaded content swap (transform/opacity only, motion-safe).
- Coherence reference for `ErrorState`/`EmptyState` entry vocabulary (no code change to them here unless inconsistent).

## Approaches considered

- **Option A — Correctness + one continuity transition (recommended).** (1) Global reduced-motion safeguard in `globals.css`. (2) On the reference pages, a ~200ms ease-out opacity settle when the table content first appears after loading. (3) Confirm one shared entry vocabulary (~200ms, ease-out, opacity + small translateY) across ErrorState/EmptyState/this. No staggered/decorative reveals.
- **Option B — Add richer micro-interactions** (animated row mounts, hover lifts on cards, animated stat counters). More "alive" but flirts with the exact slop motion.md warns against; higher regression risk. Rejected as the default.

Leaning toward: **Option A**.

## Open questions ← a human must answer these

1. **Global reduced-motion safeguard:** Add the app-wide `@media (prefers-reduced-motion: reduce)` rule to `globals.css` (a single rule that makes all animations/transitions near-instant for users who ask)? This is the highest-value, lowest-risk motion fix and makes the sibling features' `motion-safe` gates actually meaningful.
2. **How much new motion on the pages?** Just the loading→content opacity settle (Option A), or do you also want a small, restrained set of extra micro-interactions (Option B-lite, e.g. a gentle hover elevation on the header stat cards)?
3. **Scope:** Keep this to the reference pages + the global CSS rule, with broader page motion deferred to the app-wide rollout?

## Assumptions

- Animate only `transform`/`opacity`; durations 150–250ms; ease-out for entrances; one coherent vocabulary.
- No new dependencies (`tw-animate-css` already present).
- No decorative on-load/staggered reveals; static beats gratuitous.

## Resolution ← filled in after the human answers

- Q1 (reduced motion) → **Yes.** Add an app-wide `@media (prefers-reduced-motion: reduce)` safeguard to `globals.css` that makes animation/transition durations near-instant (and disables tw-animate-css animations) for users who request it.
- Q2 (page motion) → **Loading→content settle only.** A subtle ~200ms ease-out opacity settle when payables/cuadre table content first appears after loading. No staggered/decorative/hover-lift additions.
- Q3 (scope) → Reference pages (payables, cuadre) + the global CSS rule; broader page motion deferred to the app-wide rollout.
- Decision: **Option A** — (1) global reduced-motion safeguard in `globals.css`; (2) ~200ms ease-out opacity (transform/opacity only) settle on the loading→loaded swap in payables + cuadre, motion-safe; (3) keep one coherent entry vocabulary (~200ms, ease-out, opacity + small translateY) shared with `ErrorState`/`EmptyState`. No new dependencies; no decorative reveals.
