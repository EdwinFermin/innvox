# Discovery — error-boundaries

## Request

Add React error boundaries so a thrown render error stops crashing silently, and introduce a reusable `ErrorState` presentational component (per `docs/design.md`) that this and later features (e.g. `query-error-feedback`) reuse.

## Findings

- **No `error.tsx`, `global-error.tsx`, or `not-found.tsx` exist anywhere** in `src/app/`. A thrown error during render currently surfaces only Next.js's default dev overlay / blank screen in production.
- Root layout `src/app/layout.tsx` wraps everything in `<ClientRoot>` (`src/app/client-root.tsx`), which provides `ThemeProvider` (next-themes, `attribute="class"`), `AuthSessionProvider`, `ReactQueryProvider`, and the sonner `Toaster`. A `global-error.tsx` replaces the root layout entirely, so it must render its own `<html>`/`<body>` and cannot rely on those providers (theme tokens still apply via CSS, but next-themes class won't be set).
- Dashboard routes live under `src/app/dashboard/` with a shared `layout.tsx` (sidebar + breadcrumb). A segment `error.tsx` here renders **inside** the dashboard shell, so the sidebar stays usable.
- Existing building blocks to reuse: `Button` (CVA variants), `Card`, `Spinner` (`src/components/ui/spinner.tsx`, uses lucide `role="status"`). lucide-react is already a dependency (good for an icon). No existing `ErrorState`/`EmptyState` component yet.
- `docs/design.md` defines the anti-slop contract; `docs/motion.md` requires 150–250ms ease-out entries and `prefers-reduced-motion` respect.

## Affected areas

- New: `src/components/ui/error-state.tsx` (reusable presentational component).
- New: `src/app/global-error.tsx` (root crash fallback, self-contained `<html>`/`<body>`).
- New: `src/app/error.tsx` (app-level segment boundary) and `src/app/dashboard/error.tsx` (dashboard shell boundary).
- Possibly `src/app/not-found.tsx` (404) — in scope only if desired.

## Approaches considered

- **Option A — One reusable `ErrorState` + thin `error.tsx` wrappers.** Each `error.tsx`/`global-error.tsx` is a small `"use client"` file that renders `<ErrorState>` and wires the `reset()` callback. Maximizes reuse, keeps boundaries consistent. *Leaning toward this.*
- **Option B — Inline markup per boundary.** Faster to write one-off but duplicates styling and drifts from the design system — rejected (this is exactly the slop/uniformity problem we're fixing).

Leaning toward: **Option A**.

## Open questions ← a human must answer these

1. **Boundary coverage:** Just the two that matter most — `global-error.tsx` (root crash) + `src/app/dashboard/error.tsx` (dashboard segment) — or also a top-level `src/app/error.tsx` and a `not-found.tsx` (404 page)?
2. **`ErrorState` actions:** Should it offer a "Reintentar" (reset) button + a "Volver al inicio" link, or just retry? Any secondary action like "Reportar"?
3. **Error detail visibility:** Show the raw error message/digest to the user (useful for support), hide it entirely behind a friendly message, or show it only in development?
4. **Copy:** Confirm Spanish microcopy — e.g. title "Algo salió mal", body "Ocurrió un error inesperado. Intenta de nuevo." — or do you have preferred wording/tone?

## Assumptions

- ErrorState lives in `src/components/ui/` and is theme-token-only (no hardcoded colors), with a lucide icon, following `docs/design.md`.
- `global-error.tsx` renders a minimal self-contained document (cannot use providers); the dashboard boundary renders inside the shell.
- No new dependencies; no logging/telemetry integration unless asked.

## Resolution ← filled in after the human answers

- Q1 (coverage) → **Core two + 404**: `src/app/global-error.tsx`, `src/app/dashboard/error.tsx`, and `src/app/not-found.tsx`. No separate app-level `src/app/error.tsx`.
- Q2 (actions) → **Retry + home link**: `ErrorState` offers a primary "Reintentar" button (wired to `reset()` where available) and a secondary "Volver al inicio" link. For `not-found.tsx`, the home link is primary (no reset to retry).
- Q3 (detail) → **Dev only**: friendly message in production; raw `error.message` + `error.digest` shown only when `process.env.NODE_ENV === "development"`.
- Q4 (copy) → Default Spanish microcopy accepted: title "Algo salió mal", body "Ocurrió un error inesperado. Intenta de nuevo." 404: title "Página no encontrada", body "La página que buscas no existe o fue movida."
- Decision: **Option A** — one reusable `src/components/ui/error-state.tsx` (theme tokens, lucide icon, motion per `docs/motion.md`), consumed by thin `"use client"` boundary files. `global-error.tsx` renders a self-contained minimal document (no providers).
