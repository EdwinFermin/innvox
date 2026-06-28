# Discovery — loading-skeletons

## Request

Standardize page-level loading skeletons on the reference pages so loads feel solid rather than flashing/empty — extend the existing dashboard skeleton quality to the payables list and the cuadre movements table.

## Findings

- **Dashboard home already has a mature skeleton set**: `src/components/dashboard/dashboard-loading.tsx` exports `DashboardHomeLoading`, `DashboardKpiCardsSkeleton`, `DashboardChartSkeleton`, `DashboardWidgetsSkeleton`, built on the base `Skeleton` (`src/components/ui/skeleton.tsx`, `bg-accent animate-pulse rounded-md`). `home-content.tsx` shows `DashboardHomeLoading` until `mounted`. This is the quality bar to match — no work needed here.
- **Payables shows a single-cell spinner.** `src/app/dashboard/payables/page.tsx:381-385` renders, when `isLoading`, one `<SpinnerLabel label="Cargando..." />` inside a single table cell — the table frame/columns collapse, producing a jarring empty-to-full jump.
- **Cuadre shows in-cell text.** `src/app/dashboard/reports/cuadre-del-dia/page.tsx:258-259` renders `"Cargando movimientos..."` text in a cell while `isLoading`. Same collapse/jank.
- No reusable **table skeleton** component exists; `Skeleton` is the only primitive. The dashboard skeletons are bespoke per widget.

## Affected areas

- New: a reusable table-body skeleton (e.g. `src/components/ui/table-skeleton.tsx`) — rows of `Skeleton` cells matching the table's column count.
- `src/app/dashboard/payables/page.tsx` — replace the single-cell `SpinnerLabel` with skeleton rows inside the existing table frame.
- `src/app/dashboard/reports/cuadre-del-dia/page.tsx` — replace "Cargando movimientos..." with skeleton rows.
- Dashboard home: unchanged.

## Approaches considered

- **Option A — Reusable `TableSkeleton` (configurable rows + columns).** A small component rendering `rows × columns` `Skeleton` cells as real `<TableRow>/<TableCell>`s so the column layout and header stay stable while loading. Payables and cuadre pass their column count and a row count. Mirrors the dashboard skeleton aesthetic. *Leaning toward this.*
- **Option B — Bespoke skeleton per page** (like the dashboard widgets). More tailored but duplicates effort and drifts; rejected for tables that share the same shape.

Leaning toward: **Option A**.

## Open questions ← a human must answer these

1. **Component location & shape:** Reusable `TableSkeleton` in `src/components/ui/` taking `rows` and `columns` (or a `columnWidths` array for nicer variinstic widths)? Or co-locate a simpler helper per page?
2. **Row count:** How many skeleton rows while loading — a fixed count (~8), or match the table's current page size?
3. **Coverage confirmation:** Scope is **payables + cuadre** tables only (dashboard home already skeletoned). Leave dashboard home untouched — correct?

## Assumptions

- Built on the existing `Skeleton` primitive; same `animate-pulse` aesthetic; respects `prefers-reduced-motion` via the primitive.
- Skeleton renders inside the existing table frame (header visible, body = skeleton rows), not as a full-page replacement.
- No new dependencies.

## Resolution ← filled in after the human answers

- Q1 (component) → **Reusable `TableSkeleton`** in `src/components/ui/table-skeleton.tsx`, props `rows: number` and `columns: number`, rendering real `<TableRow>/<TableCell>` with a `Skeleton` per cell so the column layout + header stay stable.
- Q2 (row count) → **Match the table's current page size** so the loading frame height matches the loaded state (minimal shift). Payables/cuadre pass their effective page size.
- Q3 (coverage) → **Payables + cuadre tables only.** Dashboard home is already skeletoned and stays untouched.
- Decision: **Option A** — build `TableSkeleton(rows, columns)` on the existing `Skeleton` primitive; replace the single-cell `SpinnerLabel`/"Cargando movimientos..." in payables (`page.tsx:381`) and cuadre (`page.tsx:258`) with `<TableSkeleton>` rendered inside the existing table body while `isLoading`. No new dependencies.
