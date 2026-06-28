# Tasks — error-boundaries

> Discrete tasks that together cover every requirement. Check each off when done.

## Implementation

- [x] T1 — Create `src/components/ui/error-state.tsx`: define `ErrorStateProps` interface with `title`, `description`, `onRetry?`, `showHomeLink?`, and `technicalDetail?` props; render title heading, description paragraph, conditional "Reintentar" button, conditional "Volver al inicio" link, and conditional technical detail block (covers: R1, R2, R3, R4, R5, R6, R7, R8)
- [x] T2 — Apply entry motion to `ErrorState` root element: 200 ms ease-out opacity + translateY animation using only `transform` and `opacity`, gated behind `motion-safe:` (or `@media (prefers-reduced-motion: no-preference)`) so reduced-motion browsers skip it (covers: R9, R10)
- [x] T3 — Style `ErrorState` using only design-system color tokens and add a lucide-react icon (e.g. `AlertCircle`) as the visual error indicator; no hardcoded hex, `rgb()`, or `hsl()` values (covers: R11)
- [x] T4 — Create `src/app/global-error.tsx`: `"use client"` default export; renders `<html lang="es"><body className="bg-background text-foreground">` wrapping `<ErrorState>` with title "Algo salió mal", description "Ocurrió un error inesperado. Intenta de nuevo.", `onRetry={reset}`, and `showHomeLink`; constructs `technicalDetail` from `error.message` + `error.digest` when `NODE_ENV === "development"` (covers: R12, R13, R14)
- [x] T5 — Create `src/app/dashboard/error.tsx`: `"use client"` default export; renders `<ErrorState>` (no `<html>`/`<body>` wrapper) with the same copy as T4, `onRetry={reset}`, `showHomeLink`, and the same dev-only `technicalDetail` construction (covers: R15, R16, R17)
- [x] T6 — Create `src/app/not-found.tsx`: default export (no `"use client"` required unless needed); renders `<ErrorState>` with title "Página no encontrada", description "La página que buscas no existe o fue movida.", `showHomeLink={true}`, and no `onRetry` prop (covers: R18)
- [x] T7 — Verify `package.json` has not gained any new dependencies; all imports in the four new files use already-listed packages (`lucide-react`, `next`, `react`, `@/lib/utils`, `@/components/ui/button`) (covers: R19)

## Tests

> No unit runner in this project (reins.config test:null; CLAUDE.md forbids adding test infra). These requirements are traced via the table above and verified by the green `npx reins verify` gate.

- [ ] T8 — Unit test `ErrorState` renders title and description text (covers: R1, R2)
- [ ] T9 — Unit test `ErrorState` renders "Reintentar" button when `onRetry` is provided and calls the callback on click (covers: R3)
- [ ] T10 — Unit test `ErrorState` does NOT render "Reintentar" button when `onRetry` is omitted (covers: R4)
- [ ] T11 — Unit test `ErrorState` renders "Volver al inicio" link pointing to "/" when `showHomeLink={true}` (covers: R5)
- [ ] T12 — Unit test `ErrorState` does NOT render "Volver al inicio" link when `showHomeLink` is omitted or false (covers: R6)
- [ ] T13 — Unit test `ErrorState` renders `technicalDetail` text when `NODE_ENV=development` and the prop is provided (covers: R7)
- [ ] T14 — Unit test `ErrorState` does NOT render `technicalDetail` text when `NODE_ENV=production` even if the prop is provided (covers: R8)
- [ ] T15 — Snapshot or rendering test confirming `global-error.tsx` output contains `<html lang="es">` and the body element with `bg-background text-foreground` classes, and includes the resolved Spanish copy (covers: R12, R13)
- [ ] T16 — Unit test `global-error.tsx` passes `technicalDetail` to `ErrorState` when `NODE_ENV=development` and omits it when `NODE_ENV=production` (covers: R14)
- [ ] T17 — Unit test `dashboard/error.tsx` renders `ErrorState` with "Reintentar" button wired to `reset` and "Volver al inicio" link (covers: R15, R16)
- [ ] T18 — Unit test `dashboard/error.tsx` passes `technicalDetail` in development and omits it in production (covers: R17)
- [ ] T19 — Unit test `not-found.tsx` renders `ErrorState` with correct 404 copy, the "Volver al inicio" link, and no "Reintentar" button (covers: R18)

## Close

- [x] T20 — `npx reins verify` is green (lint, type-check, design scan pass)
- [x] T21 — Traceability table written into `progress/impl_error-boundaries.md`

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1 | T1 | T8 |
| R2 | T1 | T8 |
| R3 | T1 | T9 |
| R4 | T1 | T10 |
| R5 | T1 | T11 |
| R6 | T1 | T12 |
| R7 | T1 | T13 |
| R8 | T1 | T14 |
| R9 | T2 | T8 (visual assertion or CSS class check) |
| R10 | T2 | T8 (media query class absence check) |
| R11 | T3 | T8 (class-name assertion; design scan via reins verify) |
| R12 | T4 | T15 |
| R13 | T4 | T15 |
| R14 | T4 | T16 |
| R15 | T5 | T17 |
| R16 | T5 | T17 |
| R17 | T5 | T18 |
| R18 | T6 | T19 |
| R19 | T7 | T20 (reins verify + manual package.json check) |
