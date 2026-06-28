# Design — error-boundaries

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/error-state.tsx` | Create — reusable presentational component |
| `src/app/global-error.tsx` | Create — root crash fallback (self-contained document) |
| `src/app/dashboard/error.tsx` | Create — dashboard segment boundary |
| `src/app/not-found.tsx` | Create — 404 fallback |

No existing files are modified.

## Approach

1. **Build `ErrorState` first.** It is a pure presentational `"use client"` component that accepts structured props and renders with design-system tokens and a lucide icon. Motion is implemented via Tailwind `animate-*` or inline CSS using `@keyframes` respecting `prefers-reduced-motion` via the `motion-safe:` Tailwind variant (or a `useReducedMotion`-compatible CSS media query). No new dependencies are introduced.
2. **Wire `global-error.tsx`.** Next.js calls this when the root layout itself throws. It must render its own `<html lang="es"><body>`. Body receives `bg-background text-foreground` token classes so CSS custom properties from the design system still apply even without the `ThemeProvider`. It calls `ErrorState` with the resolved copy and passes `reset` as `onRetry`.
3. **Wire `dashboard/error.tsx`.** Next.js renders this inside the existing `src/app/dashboard/layout.tsx` shell, so no `<html>`/`<body>` wrapper is needed. It calls `ErrorState` and passes `reset` as `onRetry`. The dashboard shell (sidebar, breadcrumb) remains visible.
4. **Wire `not-found.tsx`.** Next.js renders this inside the root layout. No `reset` function is available (there is nothing to retry on a missing route), so `ErrorState` is called with only `showHomeLink` — the home link is the primary action.
5. **Development detail.** Each `error.tsx` / `global-error.tsx` constructs a `technicalDetail` string from `error.message` and (if truthy) `error.digest`, passed only when `process.env.NODE_ENV === "development"`.

## Signatures / data shapes

```typescript
// src/components/ui/error-state.tsx

export interface ErrorStateProps {
  /** Primary heading, e.g. "Algo salió mal" */
  title: string
  /** Supporting body text */
  description: string
  /** If provided, renders a "Reintentar" <button> that calls this on click */
  onRetry?: () => void
  /** If true, renders a "Volver al inicio" <a href="/"> link */
  showHomeLink?: boolean
  /** Shown only when process.env.NODE_ENV === "development" */
  technicalDetail?: string
}

export function ErrorState(props: ErrorStateProps): JSX.Element

// -----------------------------------------------------------------------
// src/app/global-error.tsx  (Next.js convention — default export required)

// Props injected by Next.js:
//   error: Error & { digest?: string }
//   reset: () => void
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): JSX.Element

// -----------------------------------------------------------------------
// src/app/dashboard/error.tsx  (Next.js convention — default export required)

// Same Next.js props shape as global-error.tsx
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): JSX.Element

// -----------------------------------------------------------------------
// src/app/not-found.tsx  (Next.js convention — default export required)
// No props; Next.js calls it with no arguments.
export default function NotFound(): JSX.Element
```

### Entry animation contract for `ErrorState`

The root element applies:
- `opacity-0 translate-y-2` as the initial state (via Tailwind `animate-*` or a CSS class).
- Animates to `opacity-100 translate-y-0` over 200 ms with `ease-out`.
- Wrapped in `motion-safe:` (or equivalent `@media (prefers-reduced-motion: no-preference)`) so the animation is skipped entirely when reduced motion is requested.
- Animates only `opacity` and `transform` (compositor-friendly; no layout properties).

## Rejected alternative

**Option B — inline markup per boundary (no shared component):** each `error.tsx` and `global-error.tsx` renders its own bespoke HTML and styles. Rejected because it duplicates visual logic and copy across four files, making future style changes require edits in four places and risking drift from the design system — the same uniformity problem the feature is intended to solve.
