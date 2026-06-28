# Brainstorm — ux-polish-stability

## Idea

Improve UI/UX so the innvox app looks intentional and cohesive (not generic "AI slop") and behaves robustly (no silent failures, no flicker), starting with three reference pages and shared patterns the rest of the app can adopt.

The foundation is already strong — OKLch design tokens, customized shadcn/ui, Manrope + IBM Plex Mono, `docs/design.md` and `docs/motion.md` anti-slop contracts, full light/dark theming. This is **not** a token-level redesign. The "generic" feeling comes from uniformity and gaps; "instability" maps to concrete missing safety nets.

**Decisions (clarifying Q&A):** Balanced emphasis (stability foundation first, then visual cohesion) · Consistency cleanup, not an identity refresh · Prove on reference pages first (**dashboard home, payables, cuadre-del-dia**), roll out app-wide later.

**Scope guardrails:** keep the existing visual identity and tokens; no new dependencies; reuse existing primitives (`DashboardPageHeader`, `Skeleton`, `Spinner`, `Badge`, sonner). Reference implementations to mirror: `payables/` (CRUD) and `reports/cuadre-del-dia/` (reports).

## Proposed features

Epic slug: `ux-polish-stability`. Order interleaves stability (foundation) and visual cohesion, dependency-first.

| # | slug | title | depends on | why |
| - | ---- | ----- | ---------- | --- |
| 1 | `error-boundaries` | Add error boundaries with a reusable ErrorState | — | Stop silent crashes. Adds `global-error.tsx` + `error.tsx` (app root + dashboard segment) and a reusable `ErrorState` component (per `docs/design.md`) that later features reuse. |
| 2 | `friendly-error-messages` | Normalize server/DB errors into user-friendly Spanish messages | — | Raw Supabase/DB strings reach users. A small `mapError` util feeds toasts and error states with clear `NCF`/`cuadre`-aware messages. |
| 3 | `hydration-mobile-fix` | Fix `useIsMobile` SSR/hydration mismatch | — | Isolated fix for the `undefined → boolean` layout shift; removes visible jank on first paint across many pages. |
| 4 | `query-error-feedback` | Surface query errors with inline retry on reference pages | error-boundaries, friendly-error-messages | Reuse `ErrorState` to handle `isError` (with retry) in the dashboard, payables, and cuadre-del-dia data paths — no more blank/stuck screens on fetch failure. |
| 5 | `loading-skeletons` | Standardize page-level loading skeletons on reference pages | — | Extend the existing dashboard skeleton pattern to payables list + cuadre so loads feel solid, not flashing/empty. |
| 6 | `empty-states` | Designed reusable EmptyState on reference pages | — | Replace text-only "No se encontraron…" with an intentional `EmptyState` (icon + hint + optional action) — a big anti-slop win. |
| 7 | `page-header-consistency` | Standardize page headers across the app | — | Make every page use `DashboardPageHeader` with consistent eyebrow/stat rhythm; fix `account`/`settings` bare headers. Drives the "intentional, cohesive" feel. |
| 8 | `motion-polish` | Apply `docs/motion.md`-compliant micro-interactions on reference pages | empty-states | Subtle, compositor-friendly transitions (dialogs, rows, state changes) that respect `prefers-reduced-motion` — the personality layer that most reads as "not generic." |

## Open questions

Resolved via clarifying Q&A (emphasis / ambition / scope). Remaining details (exact copy for error/empty states, which stats belong in standardized headers) are settled per-feature in the spec pipeline's discovery step, so implementation needs no further questions.

## Resolution

All 8 features registered and walked to **`approved`** through the spec pipeline (discovery → clarification → spec → approval), strictly dependency-first. Each has `discovery.md`, `requirements.md`, `design.md`, `tasks.md` under `specs/<slug>/`.

| # | slug | state | key spec outcome |
| - | ---- | ----- | ---------------- |
| 1 | `error-boundaries` | approved | `ErrorState` component + `global-error.tsx`, `dashboard/error.tsx`, `not-found.tsx`; retry + home link; dev-only error detail. |
| 2 | `friendly-error-messages` | approved | `src/lib/error-messages.ts` `mapError()`; maps PG 23505/23503/42501 + RLS + network; pass-through for friendly text; wired into payables. |
| 3 | `hydration-mobile-fix` | approved | `useIsMobile` rewritten on `useSyncExternalStore` (server snapshot=false); keeps `boolean` return, zero consumer changes. |
| 4 | `query-error-feedback` | approved | Inline `ErrorState`+retry on payables, cuadre (combined), and all 4 dashboard home widgets; header/filters stay visible. |
| 5 | `loading-skeletons` | approved | `TableSkeleton(rows, columns)`; payables uses live pageSize/visible columns, cuadre fixed 8×5; replaces in-cell spinners. |
| 6 | `empty-states` | approved | `EmptyState` (icon+title+hint+action); payables splits empty-vs-no-results (controlled `NewPayableDialog`); cuadre 2 message-only states. |
| 7 | `page-header-consistency` | approved | Converts the 4 bare-header pages (account, settings, parameters×2) to `DashboardPageHeader`; eyebrows + stats where natural. |
| 8 | `motion-polish` | approved | App-wide `prefers-reduced-motion` safeguard in `globals.css`; ~200ms motion-safe loading→content settle on payables + cuadre. |

Dependencies: `query-error-feedback` → {`error-boundaries`, `friendly-error-messages`}; `motion-polish` → `empty-states`.

**Next:** every feature is `approved`. From here, `/next-feature` implements them one at a time in dependency order with no further questions or approvals.
