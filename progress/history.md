# History

Append-only log of sessions. Newest entries at the bottom. **Never edit past entries.**

---

## 2026-06-27 — Harness installed

Reins `sdd` harness (v0.9.0) initialized for `innvox`.

---

## 2026-06-27 — error-boundaries (done)

Autopilot run. Added reusable `ErrorState` (`src/components/ui/error-state.tsx`) plus `global-error.tsx`, `dashboard/error.tsx`, `not-found.tsx`. reviewer APPROVED; design-reviewer initially blocked on a dark-mode protocol violation in `global-error.tsx` (own `<html>` bypassed next-themes), fixed with a vanilla-JS pre-paint theme script (no new deps, no React context), then DESIGN_OK. `npx reins verify` green. See `progress/impl_error-boundaries.md` / `progress/review_error-boundaries.md`.

---

## 2026-06-27 — friendly-error-messages (done)

Autopilot run. Added `src/lib/error-messages.ts` `mapError(error: unknown): string`; wired into `payables` new-dialog `onError` and `deletePayable` catch. reviewer APPROVED, design DESIGN_OK. security-reviewer initially SECURITY_BLOCK (HIGH info-disclosure: deny-list passed raw Postgres text — e.g. `permission denied for table payables`, `invalid input syntax for type uuid` — through verbatim from `payables.ts` action-throw wrappers; plus a LOW prototype-walk on `code in CODE_MAP`). Fixed fail-closed: `ACTION_WRAPPER_RE` + broadened markers + `looksLikeRawDb`, both branches route DB-origin text through map-or-generic, `Object.hasOwn`. Re-reviews: APPROVED + SECURITY_OK. `npx reins verify` green. See `progress/impl_friendly-error-messages.md` / `progress/review_friendly-error-messages.md`.

---

## 2026-06-27 — hydration-mobile-fix (done)

Autopilot run. Rewrote `src/hooks/use-mobile.ts` to use `React.useSyncExternalStore` (`getServerSnapshot → false`, module-level `mql`, subscribe/cleanup), eliminating the post-mount `false→true` flip / sidebar CLS. Confined to the one file (R10), return type stays `boolean`, no consumer changes, no new deps. reviewer APPROVED, design DESIGN_OK (CLS goal confirmed met). `npx reins verify` green. See `progress/impl_hydration-mobile-fix.md` / `progress/review_hydration-mobile-fix.md`.

---

## 2026-06-27 — loading-skeletons (done)

Autopilot run. Added `src/components/ui/table-skeleton.tsx` (body-only `rows × columns` skeleton on existing primitives); wired payables page (pageSize × visible columns) and cuadre-del-dia page (8 × 5), header stays visible. reviewer APPROVED; design-reviewer initially DESIGN_BLOCK because the base `src/components/ui/skeleton.tsx` used unconditional `animate-pulse` (Tailwind v4 doesn't auto-gate `animate-*`), so R6 reduced-motion was unmet; fixed one token → `motion-safe:animate-pulse` (improves every consumer), then DESIGN_OK + re-APPROVED. `npx reins verify` green. See `progress/impl_loading-skeletons.md` / `progress/review_loading-skeletons.md`.

---

## 2026-06-27 — empty-states (done)

Autopilot run. Added `src/components/ui/empty-state.tsx` (token-only, layout-neutral, motion-safe entry). Made `NewPayableDialog` controlled (`open`/`onOpenChange`) and lifted a single shared `dialogOpen` into `PayablesPage` (R10); added Inbox empty-dataset + SearchX no-results branches (loading untouched). Cuadre page got Building2 "Sin sucursales" and Inbox "Sin movimientos" empty states. Two implementer deviations judged sound: `icon` prop typed `LucideIcon`; `SearchX` not imported into cuadre (no search case → would be unused). reviewer APPROVED + design DESIGN_OK first pass. `npx reins verify` green. See `progress/impl_empty-states.md` / `progress/review_empty-states.md`.

---

## 2026-06-27 — page-header-consistency (done)

Autopilot run. Presentational swap of bare `<h3>`/`<p>` headers to the existing `<DashboardPageHeader>` on account, settings (both branches), expense-types, and income-types pages; moved the New*Dialog into the header `actions` and simplified the parameters toolbars; settings in-form section headings preserved (R4); `dashboard-page-header.tsx` and dashboard home untouched (R7/R8). reviewer APPROVED + design DESIGN_OK first pass (one non-blocking advisory: settings outer wrapper kept its pre-existing classes — out of scope). T8 live preview deferred (auth-gated pages, unattended run) — covered by static design audit + typecheck/lint/design-scan. `npx reins verify` green. See `progress/impl_page-header-consistency.md` / `progress/review_page-header-consistency.md`.

---

## 2026-06-27 — query-error-feedback (done)

Autopilot run. Wired the hardened `ErrorState` + `mapError` into 6 files (payables page, cuadre page, dashboard-hero, section-cards, chart-area-interactive, business-widgets) with combined-error derivation (`firstError` via `??`, `retryAll` calling every `refetch`), `isError` guard before `isLoading` (R13/R14), `mapError` on every description (no raw leak), never `showHomeLink`. reviewer APPROVED + security SECURITY_OK + design DESIGN_OK. Post-review fixes: cuadre "Sin sucursales" guard now `!isLoading && !isError && !branches.length` (was rendering EmptyState + ErrorState simultaneously on branches-error); dashboard-hero ErrorState given `border-0 shadow-none` (double-border). Re-reviews: APPROVED + DESIGN_OK. `npx reins verify` green. See `progress/impl_query-error-feedback.md` / `progress/review_query-error-feedback.md`.

---

## 2026-06-27 — motion-polish (done)

Autopilot run (final feature). Added a global `@media (prefers-reduced-motion: reduce)` safeguard to `globals.css` (placed after `@layer`/`@media print` so it overrides `tw-animate-css`), plus a settle-once (`isLoaded`) ~200ms motion-safe opacity+translateY entrance on the payables `dashboard-table-frame` and the cuadre movement-table `Card` — identical class vocabulary on both, coherent with ErrorState/EmptyState (R4), no per-row stagger/hover-lift (R6), no new deps. reviewer APPROVED + design DESIGN_OK (full motion-contract audit clean; first review attempt died on a transport error and was re-run). T6 live devtools preview deferred (auth-gated, unattended) — covered by the design-reviewer's static motion audit. `npx reins verify` green. See `progress/impl_motion-polish.md` / `progress/review_motion-polish.md`.

---

## 2026-06-27 — Autopilot run complete

All 8 approved features driven to `done` in one run, strictly one `in_progress` at a time, each implementer→reviewer(+security/design) to approval then re-verified green. Final `npx reins verify`: PASS.
