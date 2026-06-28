# Review — error-boundaries
Verdict: APPROVED

## Checkpoints

- C1: [x] All base files present; harness intact. `reins doctor` (implicit in reins verify PASS).
- C2: [x] One feature `in_progress` (error-boundaries); all states are valid. `feature-list` gate green.
- C3: [x] Lint clean — `npm run lint` passes with zero problems. Confirmed by `reins verify` lint gate.
- C4: [x] No unit runner configured (`test: null`); requirement→task traceability table is complete in `specs/error-boundaries/tasks.md` and `progress/impl_error-boundaries.md`. Every R1–R19 is mapped to an implementation task and traced to a gate. Green `npx reins verify` satisfies this project's test contract.
- C5: [x] Security gate green — no vulnerabilities >= high, no secrets found. No new npm dependencies introduced (R19 confirmed by unchanged `package.json` and `lucide-react`/`next` being pre-existing).
- C6: [x] Design scan passes at block severity (`failOn: "block"`). 21 advisory tells all pre-existing; zero attributable to the four new files. Only token classes used (no hex/rgb/hsl literals). `AlertCircle` lucide icon present.
- C7: [x] Traceability gate green — every R1–R19 maps to at least one task (T1–T7, T20–T21).
- C8: [x] Implementation matches the approved spec exactly: `ErrorState` presentational component (R1–R11), `global-error.tsx` with self-contained document (R12–R14), `dashboard/error.tsx` inside existing shell (R15–R17), `not-found.tsx` (R18), no new dependencies (R19). No scope creep detected.
- C9: [ ] `progress/history.md` has NOT been updated with an entry for the error-boundaries implementation session (still shows only the "Harness installed" entry). `current.md` is not yet reset, which is acceptable pre-approval. The missing history.md append is a minor omission; `current.md` reset is a post-approval task and is not blocking.

## Judgment (Four R's)

### Risk

The implementer's claim: four additive new files; no existing module, route, signature, or serialized format was touched.

Verified against diff: confirmed. All four files (`src/components/ui/error-state.tsx`, `src/app/global-error.tsx`, `src/app/dashboard/error.tsx`, `src/app/not-found.tsx`) are untracked new files. No edits to `package.json`, `layout.tsx`, or any shared primitive. `tasks.md` bookkeeping was updated (checked off T1–T7, T20–T21; note added). Blast radius is minimal — these are opt-in error surfaces Next.js activates only on throw/404. Reversibility: purely additive; deletion restores prior behavior with no migration required. No append-only history was rewritten.

Advisory: `progress/history.md` was not appended with an entry for this session (`progress/history.md:8` shows only the harness-install entry). This is a protocol gap (append-only log not maintained), but it does not corrupt state or block recovery. [advisory]

### Readability

The implementer's claim: names describe behavior; every non-obvious decision has a comment or is documented in the impl report; no dead code.

Verified against diff:
- `error-state.tsx:41–44`: the double-gate rationale is captured in the inline comment ("defense-in-depth so the component can never leak internals if a caller forgets the environment check"). Intent is recoverable. [clean]
- `global-error.tsx:6–11`: the reason for the self-contained `<html>`/`<body>` document is captured in the JSDoc comment. [clean]
- `dashboard/error.tsx:6–9`: similarly documented. [clean]
- `not-found.tsx:3–7`: documented. [clean]
- No dead code, commented-out blocks, or vestigial parameters. All exported symbols (`ErrorState`, `ErrorStateProps`) are public-facing with documented contracts.

No Readability findings.

### Reliability

The implementer's claim: every finite branch of the prop contract is handled; the `digest`-absent boundary is handled via `filter(Boolean)`; output is deterministic.

Verified against diff:
- `onRetry` present/absent: `error-state.tsx:72–76` — conditional render correct.
- `showHomeLink` true/absent-false: `error-state.tsx:77–82` — conditional render correct.
- `technicalDetail` present + dev / present + prod / absent: `error-state.tsx:43–44`, `66–70` — double guard correct.
- Action row omitted when neither action applies: `error-state.tsx:72` — `onRetry || showHomeLink` guard correct.
- `[error.message, error.digest].filter(Boolean).join(" — ")` in `global-error.tsx:21` and `dashboard/error.tsx:18–21` — handles `digest` being `undefined` without a trailing separator. Correct.
- `not-found.tsx` passes no `onRetry` — satisfies R18.
- No wall-clock, locale, timezone, or random dependency.

No Reliability findings.

### Resilience

The implementer's claim: these components are the resilience layer; no external calls or multi-step writes; re-mount is idempotent; `digest` optionality guarded.

Verified against diff: confirmed. No network calls, FS operations, locks, or DB access in any of the four files. No state that could be half-written on crash. `global-error.tsx` is self-contained and does not depend on any React context provider that could be absent when the root layout crashes — this is the correct pattern for Next.js global error boundaries. The `error: Error & { digest?: string }` typing correctly marks `digest` as optional; `filter(Boolean)` at `global-error.tsx:21` and `dashboard/error.tsx:20` guards against garbage/partial shapes.

No Resilience findings.

## Changes required

None blocking. One advisory item:

1. [advisory] `progress/history.md` should be appended with an entry for the error-boundaries implementation session before or at session close (`progress/history.md` — currently only shows the "Harness installed" entry). This is a protocol requirement from C9 but is not blocking approval since the harness state is otherwise coherent and recoverable.

## Design

Reviewer: design-reviewer (claude-sonnet-4-6). Audited against `docs/design.md` and `docs/motion.md`.

### Deterministic scan

`npx reins verify --only design` — PASS at block severity. 21 advisory tells all pre-existing; zero attributable to the four new files.

### Slop tells — manual walk

All 16 tells checked against the diff. None present in the new files: no gradient text, no side-stripe borders, no generic AI palette (project uses oklch teal/green), no oversized centered hero, no emoji icons (Lucide `AlertCircle` used), no glassmorphism, no `rounded-2xl` uniformity (`rounded-xl` matches `card.tsx`), no gradient-fill pill buttons, no three-card layout, no gradient section backgrounds, no decorative blobs, no `hover:scale-*`, no placeholder copy, no `max-w-prose` wrapping app UI.

### Typography

`src/components/ui/error-state.tsx:60–63` — heading `text-lg font-semibold` and body `text-sm leading-6 text-muted-foreground` both align with the existing scale (`alert-dialog.tsx:102`, `dashboard-page-header.tsx:55`). Hierarchy is clear. [clean]

### Color

`src/components/ui/error-state.tsx:50–63` — exclusively token classes: `bg-card`, `text-card-foreground`, `text-foreground`, `text-muted-foreground`, `bg-destructive/10`, `text-destructive`, `bg-muted`, `border`. No raw hex/rgb/hsl literals. Destructive token used semantically for the error indicator. [clean]

### Layout & spacing

All spacing values on the Tailwind scale (`gap-5`, `px-6`, `py-10`, `space-y-2`, `gap-2`, `p-6`, `py-10`). `max-w-md` card width appropriate for a full-screen error recovery surface (not a dashboard panel). [clean]

### Components

`src/components/ui/error-state.tsx:3–6` — imports `Button` and `cn` from existing primitives. `Button asChild` + `Link` pattern matches the codebase convention. Focus-visible ring fully inherited from `Button`'s `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`. No reinvented primitive. [clean]

### Accessibility

- `role="alert"` on the container (`error-state.tsx:48`): correct live region for an error surface.
- `AlertCircle aria-hidden="true"` (`error-state.tsx:56`): decorative icon correctly hidden from assistive technology.
- "Reintentar" button: `<Button onClick={onRetry}>` — keyboard-accessible, focus-visible inherited.
- "Volver al inicio": `<Button asChild><Link href="/">` — renders `<a href="/">`, keyboard-accessible, focus-visible inherited.
- `<main>` landmark present on `global-error.tsx:27` and `not-found.tsx:10`. `dashboard/error.tsx` sits inside the existing shell with its own landmark hierarchy.
- Button default size `h-9` (36px) — above the 24px minimum target size.
[clean]

### Content & voice

Spanish copy is specific and human: "Algo salió mal", "Ocurrió un error inesperado. Intenta de nuevo.", "Página no encontrada", "La página que buscas no existe o fue movida.", "Reintentar", "Volver al inicio". No Lorem ipsum, no placeholder strings, no vague CTAs. [clean]

### Motion

`src/components/ui/error-state.tsx:51` — `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out`.
- Duration 200ms: within the 150–250ms contract band. [clean]
- Easing: ease-out on entry. [clean]
- `prefers-reduced-motion`: gated behind `motion-safe:` (Tailwind maps to `@media (prefers-reduced-motion: no-preference)`) — users with reduced-motion get instant, zero-transition render. [clean]
- Properties animated: `opacity` (fade-in-0) and `transform` (slide-in-from-bottom-2) — compositor-friendly, no layout properties. [clean]
- Motion vocabulary matches existing dialogs/popovers. [clean]


### Dark mode — RESOLVED

**Initial finding:** `src/app/global-error.tsx` rendered its own `<html>/<body>` document without `next-themes`/`ThemeProvider`, so `.dark` was never applied and dark-mode token values never resolved — a block under the dark-mode protocol.

**Fix applied (`global-error.tsx:41–46`):** A blocking inline IIFE `<script>` in `<head>` re-applies the theme synchronously before first paint. Verified against the `ThemeProvider` config in `src/app/client-root.tsx:12`:

| Check | Script | next-themes config | Result |
|---|---|---|---|
| storageKey | `localStorage.getItem('theme')` | default key `'theme'` (not overridden) | correct |
| attribute | `classList.add('dark')` on `documentElement` | `attribute="class"` | correct |
| defaultTheme | `\|\| 'system'` | `defaultTheme="system"` | correct |
| System fallback | `matchMedia('(prefers-color-scheme:dark)').matches` | `enableSystem` | correct |
| Hydration | `suppressHydrationWarning` on `<html>` | standard pattern | correct |
| Guard | `try/catch` around `localStorage` | — | private-browsing safe |

The script is in `<head>` with no `defer`/`async`/`type="module"` — it is blocking and runs before any CSS or body render. No new dependency introduced (R19 preserved). No React context required (R12 preserved). No new slop tells or a11y issues introduced (the `<script>` is invisible to assistive technology).

`npx reins verify --only design` re-run: PASS, same 21 pre-existing advisories, zero new findings.

`src/app/global-error.tsx:27–46` — **[block resolved]** dark-mode protocol now satisfied. All supported themes render correctly on the global error surface.

### Summary

| Finding | File:line | Severity | Rule | Status |
|---|---|---|---|---|
| Dark-mode class never applied to self-contained `<html>` — user in dark mode sees light colors | `src/app/global-error.tsx:27` | [block] | design.md Dark-mode protocol | **RESOLVED** — inline theme-detection script applied |

No remaining block or advisory findings attributable to the error-boundaries feature files.
