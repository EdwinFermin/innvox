# Design Review — dashboard-focus

**Reviewer:** design-reviewer
**Date:** 2026-06-27 (re-verified 2026-06-27)
**Verdict:** DESIGN_OK

---

## Scope

UI-touching files audited (changed by this feature):

- `src/components/dashboard/home-content.tsx`
- `src/components/dashboard/dashboard-hero.tsx`
- `src/components/dashboard/business-widgets.tsx`
- `src/components/dashboard/dashboard-loading.tsx`
- `src/components/dashboard/section-cards.tsx` (deleted)

Contracts applied: `docs/design.md`, `docs/motion.md`.

---

## Deterministic scan

`npx reins verify --only design` — PASS (15 advisories, 0 blocks). No new block-severity slop tells detected mechanically. Advisories are pre-existing on the hero's gradient background and are not this feature's responsibility.

---

## First-pass findings (now resolved)

### F1 — [block] RESOLVED: "Acciones rapidas" → "Acciones rápidas"

**File:** `src/components/dashboard/dashboard-hero.tsx:262`

Verified: line 262 now reads `Acciones rápidas` (correct accent). Matches the sidebar label at `app-sidebar.tsx:268`. Consistent.

### F2 — [block] RESOLVED: DashboardWidgetsSkeleton layout now matches BusinessWidgets

**File:** `src/components/dashboard/dashboard-loading.tsx:22–48`

Verified: `DashboardWidgetsSkeleton` now uses `grid-cols-1` (no `xl:grid-cols-[1.2fr_0.8fr]`). The two-column XL wrapper and the third nested card slot are gone. The skeleton now renders one list-card skeleton (Actividad reciente shape) followed by one `DashboardChartSkeleton` (Pulso por sucursal shape), matching the two-card single-column `BusinessWidgets` layout exactly. Layout-shift risk is eliminated.

### F3 — [advisory] RESOLVED: Accent fixes in business-widgets.tsx

**File:** `src/components/dashboard/business-widgets.tsx:223, 269`

Verified:
- Line 223: `"Últimos eventos que impactan ventas, cobros y egresos."` — accent present.
- Line 269: `"Aún no hay actividad reciente para mostrar."` — accent present.

Note: the two pre-existing unaccented instances ("traccion" at line 283 and "Aun" at line 314) remain unchanged, which is correct — they were not introduced by this feature and are outside this review's scope.

---

## Disciplines summary

| Discipline | Result | Notes |
|---|---|---|
| Typography | Pass | Hierarchy clear; scale consistent across hero KPI boxes and widget cards. |
| Color | Pass | Hero gradient pre-existing; dark-mode variants present on both widget cards. |
| Layout & spacing | Pass | Hero grid (`lg:grid-cols-[1.3fr_0.95fr]`) is balanced; BusinessWidgets collapses cleanly to single-column with no orphaned half-width card. |
| Components | Pass | `TrendBadge` is a focused spec-driven sub-component; no reinvented primitives; buttons have hover and dark-mode states. |
| Accessibility | Pass | `aria-hidden` on decorative icons; buttons use semantic `<Button asChild>` + `<Link>`; `prefers-reduced-motion` handled globally in `globals.css`. |
| Content & voice | Pass | All user-visible copy correct; Spanish accents consistent; no placeholder copy. |
| Motion | Pass | `animate-pulse` on skeleton; global `prefers-reduced-motion` override active; no layout-property animation introduced. |
| Loading / error / empty states | Pass | Skeleton now matches populated layout (F2 resolved); error state present on hero and widgets; empty states present for both sub-cards. |
| Slop tells | Pass | No gradient text, no emoji icons, no `hover:scale-*`, no placeholder copy. |
| Design-system fidelity | Pass | No new tokens, colors, fonts, or radii outside the system. |
