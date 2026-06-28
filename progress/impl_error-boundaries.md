# Implementation — error-boundaries

## Summary

Added the four error-surface files from the approved spec: a reusable presentational
`ErrorState` component plus the three Next.js convention files that consume it
(`global-error.tsx`, `dashboard/error.tsx`, `not-found.tsx`). No existing files were
modified; no new dependencies were added.

## Files changed

| File | Change |
| --- | --- |
| `src/components/ui/error-state.tsx` | Created — reusable `"use client"` presentational component (title, description, optional retry/home actions, dev-only technical detail, motion-safe entry animation). |
| `src/app/global-error.tsx` | Created — root crash fallback; renders its own `<html lang="es"><body className="bg-background text-foreground …">`, wires `reset` to `onRetry`. |
| `src/app/dashboard/error.tsx` | Created — dashboard segment boundary; renders `ErrorState` inside the existing shell, wires `reset` to `onRetry`. |
| `src/app/not-found.tsx` | Created — 404 fallback; `showHomeLink` only, no retry. |
| `specs/error-boundaries/tasks.md` | Checked off T1–T7, T20–T21; added the no-unit-runner note under Tests; Traceability table left intact. |

## Key design decisions

- **Home link uses `next/link` (`<Link href="/">`), not a raw `<a>`.** The spec's
  illustrative signature showed `<a href="/">`, but ESLint
  (`@next/next/no-html-link-for-pages`) blocks a raw `<a>` to an internal page (a C3
  mechanical gate). `Link` renders exactly `<a href="/">`, so R5 ("an anchor element
  pointing to '/'") is satisfied and lint passes. The anchor is composed through the
  existing `Button` primitive via `asChild` (Slot), matching how the codebase styles
  links-as-buttons.
- **Motion via `motion-safe:` + `tw-animate-css`.** The project already ships
  `tw-animate-css` and uses `animate-in fade-in-0 slide-in-from-bottom-* duration-200`
  across dialogs/popovers. I reused that vocabulary and gated it behind Tailwind's
  `motion-safe:` variant (`@media (prefers-reduced-motion: no-preference)`), which
  precisely satisfies R9 (200ms ease-out opacity + transform when motion is allowed)
  and R10 (instant, no transition/transform under `prefers-reduced-motion: reduce`).
  `fade-in-0` animates `opacity`; `slide-in-from-bottom-2` animates `transform` — both
  compositor-friendly, no layout properties (matches `docs/motion.md`).
- **Double-gated technical detail.** Each boundary builds `technicalDetail` only when
  `NODE_ENV === "development"` (R14/R17), and `ErrorState` re-checks the env before
  rendering it. The redundant guard is intentional defense-in-depth so the component
  can never leak `error.message`/`error.digest` in production even if a future caller
  forgets the env check (R8).
- **`technicalDetail` string shape.** `[error.message, error.digest].filter(Boolean).join(" — ")`
  — includes `digest` only when truthy ("where defined", per R14/R17), avoiding a
  trailing separator when `digest` is absent.
- **`global-error.tsx` is self-contained.** It renders its own document because Next
  invokes it only when the root layout itself throws (no `ThemeProvider`). The body
  carries `bg-background text-foreground` token classes so the design-system CSS custom
  properties still resolve with no React context provider (R12).
- **Dark-mode protocol on the self-contained document (design-reviewer block fix).**
  Because `global-error.tsx` renders outside `next-themes`/`ClientRoot`, the `.dark`
  class normally placed on `<html>` is never applied, so every `.dark`-scoped token in
  `globals.css` would otherwise resolve to its light `:root` value — a dark-mode user
  would see the crash surface in light colors. Fix: a blocking inline `<head>` `<script>`
  re-applies the theme synchronously before first paint, mirroring next-themes' own
  anti-flash technique. It reads the `next-themes` storage key (`"theme"`, with
  `attribute="class"`, `defaultTheme="system"` per `ClientRoot`) and resolves `"system"`
  against `matchMedia('(prefers-color-scheme:dark)')`, adding `class="dark"` to
  `document.documentElement` when dark. It is vanilla JS in a `<script>` tag — no React
  context and no new dependency, so it stays within R12's "no reliance on any React
  context provider" constraint. A `try/catch` guards `localStorage` access failures in
  private-browsing modes. `<html>` also gets `suppressHydrationWarning` (matching the root
  `layout.tsx`) since the script mutates the class before React hydrates.
- **Design-system fidelity.** Only token classes are used (`bg-card`,
  `text-card-foreground`, `text-foreground`, `text-muted-foreground`, `bg-muted`,
  `bg-destructive/10`, `text-destructive`, `border`, `rounded-xl`, `shadow-sm`). No hex,
  `rgb()`, or `hsl()` literals (R11). The error indicator is the lucide `AlertCircle`
  icon (R11). The design slop scan reports zero findings attributable to the new files.

## Requirement → coverage (no unit runner; verified by gates)

> This project sets `reins.config.json` `test: null` and `CLAUDE.md` forbids adding test
> infrastructure, so there is no executable unit runner. Each requirement is covered by
> the implementing task and proven by the cited deterministic gate (lint, typecheck,
> design slop scan, traceability) plus the production `npm run build`, which validates the
> Next.js boundary conventions compile and register (`/_not-found` route present).

| Req | Task | Implemented in | Proven by |
| --- | --- | --- | --- |
| R1 | T1 | `error-state.tsx` `<h1>{title}` | typecheck + lint + build |
| R2 | T1 | `error-state.tsx` `<p>{description}` | typecheck + lint + build |
| R3 | T1 | `<Button onClick={onRetry}>Reintentar</Button>` | typecheck + lint + build |
| R4 | T1 | `onRetry ? … : null` (button omitted when absent) | typecheck + lint |
| R5 | T1 | `showHomeLink` → `<Link href="/">Volver al inicio</Link>` | lint (`no-html-link-for-pages`) + build |
| R6 | T1 | `showHomeLink ? … : null` (link omitted when absent/false) | typecheck + lint |
| R7 | T1 | `technicalDetail` `<pre>` rendered when dev + prop set | typecheck + lint |
| R8 | T1 | `process.env.NODE_ENV === "development"` guard | typecheck + lint |
| R9 | T2 | `motion-safe:animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out` | lint + design scan |
| R10 | T2 | motion gated behind `motion-safe:` (skipped under reduced-motion) | lint + design scan |
| R11 | T3 | token-only classes + `AlertCircle` lucide icon | design slop scan (block-clean) |
| R12 | T4 | `global-error.tsx` `<html lang="es"><body className="bg-background text-foreground …">` + inline `<head>` theme script (vanilla JS, no React context, no new dep) | typecheck + lint + build + design dark-mode protocol |
| R13 | T4 | `ErrorState` copy + `onRetry={reset}` + `showHomeLink` | typecheck + lint + build |
| R14 | T4 | dev-only `technicalDetail` from `message` + `digest` | typecheck + lint |
| R15 | T5 | `dashboard/error.tsx` renders `ErrorState` inside shell (no `<html>`) | typecheck + lint + build |
| R16 | T5 | same copy + `onRetry={reset}` + `showHomeLink` | typecheck + lint + build |
| R17 | T5 | dev-only `technicalDetail` construction | typecheck + lint |
| R18 | T6 | `not-found.tsx` 404 copy + `showHomeLink`, no `onRetry` | lint + build (`/_not-found` registered) |
| R19 | T7 | imports only `lucide-react`, `next/link`, `@/lib/utils`, `@/components/ui/button` | security deps audit + unchanged `package.json` |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** Four additive new files plus the required `tasks.md` bookkeeping. No existing
  module, signature, route handler, or serialized format was touched — grep confirms no
  edits to `package.json`, `layout.tsx`, or any shared primitive. No drive-by refactors.
- **Reversibility:** Purely additive; deleting the four files restores the prior behavior
  (Next falls back to its built-in error/404 surfaces). No migration or version bump is
  needed because nothing existing was changed or removed.
- **Proof:** `npm run build` registers `/_not-found` and compiles the boundary
  conventions; `npx reins verify` PASS. Append-only state untouched.

### Readability — recoverable intent for the next cold agent
- Names describe behavior: `ErrorState`, `GlobalError`, `DashboardError`, `NotFound`,
  `showTechnicalDetail`, `technicalDetail`.
- Every non-obvious decision has its **why** in a comment or above: the double-gated
  technical detail (defense-in-depth), the self-contained `global-error` document (no
  ThemeProvider), and the `next/link` choice (lint + still renders `<a href="/">`).
- No dead code, no commented-out blocks, no vestigial params.

### Reliability — right answer for in-contract inputs
- Every finite branch of the prop contract is handled and asserted by the code path:
  `onRetry` present/absent (R3/R4), `showHomeLink` true/absent-false (R5/R6),
  `technicalDetail` present + dev / present + prod / absent (R7/R8), and the action row is
  omitted entirely when neither action applies (`onRetry || showHomeLink` guard).
- The dev-detail join handles the `digest`-absent boundary via `filter(Boolean)`, so no
  dangling separator. Output is deterministic — no wall-clock, locale, or random input.
- No executable unit runner exists in this project; correctness of the finite enum of
  prop combinations is established by the typed signature, the lint/typecheck gates, and
  the green build. (Documented limitation, not a weakened test.)

### Resilience — fails safe when the world breaks
- These components **are** the resilience layer: they are the safe-fail surface Next.js
  renders when a render throws. `global-error.tsx` assumes the worst (root layout dead, no
  provider) and self-supplies its document + token classes so it still renders styled.
- No external calls, file handles, locks, or multi-step writes are performed, so there is
  nothing to time out, leak, or leave half-written; a re-mount is idempotent.
- The `error: Error & { digest?: string }` shape from Next is guarded: `digest` is treated
  as optional (`filter(Boolean)`), and `technicalDetail` is never shown in production, so a
  partial/garbage error object cannot leak internals to a user.

## Final verify output

```
$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  9.3s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.0s
  ∘ design        no UI files changed  54ms      (untracked files; ran --only design below)
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  9ms
  ✓ traceability  every requirement maps to a task  3ms
Result: PASS

$ npx reins verify --only design
Reins verify
  ✓ design        21 advisory slop tell(s)  86ms   (all pre-existing; none in the new files)
Result: PASS

$ npm run typecheck   → clean (tsc --noEmit, no output)
$ npm run lint        → clean (no problems)
$ npm run build       → ✓ Compiled successfully; /_not-found route registered
```

## Post-review revision — dark-mode block fix

The design-reviewer (architecture/Four R's review already APPROVED) raised one block:
`global-error.tsx` rendered its self-contained document outside `next-themes`, so the
`.dark` class was never set and dark-mode users saw the crash surface in light tokens.
Fixed by adding a blocking inline `<head>` `<script>` that synchronously applies
`class="dark"` to `<html>` before first paint (reads the `"theme"` storage key and the
OS `prefers-color-scheme` media query — next-themes' own anti-flash technique), plus
`suppressHydrationWarning` on `<html>`. Vanilla JS, no React context (R12-safe), no new
dependency (R19-safe). Re-verified after the fix:

```
$ npm run typecheck      → clean
$ npm run lint           → clean
$ npx reins verify       → PASS (lint, security, feature-list, traceability)
$ npx reins verify --only design → PASS (21 advisory tells, all pre-existing; none new)
$ npm run build          → ✓ Compiled successfully; /_not-found registered
```

## Handoff

Ready for review. Do not mark `done` until the reviewer returns `APPROVED`.
