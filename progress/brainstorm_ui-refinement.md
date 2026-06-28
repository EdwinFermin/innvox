# Brainstorm — ui-refinement

## Idea

Refine the system's UI: improve organization, navigation, components, and work
efficiency. Make the dashboard home focused on what is actually used day-to-day,
removing or changing blocks that frequently show zero or carry no useful
information.

### Grounding from exploration

- **Dashboard home is dense and redundant, not full of fake data.** Every block
  is wired to real hooks (no mock values). The real problem is duplication:
  - Pending receivables/payables ("cobros y pagos") appear in **three** places:
    `dashboard-hero.tsx`, `section-cards.tsx`, and `business-widgets.tsx`.
  - Month income/expense appears in the hero, a section card, and the cash-flow
    chart.
  - Trend badges in `section-cards.tsx` (`getVariation`) return **0% when the
    previous month was 0** — mathematically correct but misleading.
- **Navigation has concrete defects** in `dynamic-breadcrumb.tsx` and
  `app-sidebar.tsx`:
  - Breadcrumb map has capitalization mismatches (`Income-types`,
    `Expense-types`) so they never match; `sync-cuadres` and `formulario-dgii`
    have no mapping and render as ugly fallbacks.
  - Admins reach Settings via two different paths (secondary nav + admin
    submenu).
  - Role navs are asymmetric (Fidelidad missing for accountants; Reportes set
    differs across roles).
- **Shared components exist but adoption is patchy.** `EmptyState`,
  `ErrorState`, `TableSkeleton` (from the prior `ux-polish-stability` epic) are
  used in ~3 of 12+ pages; the rest roll their own loading/empty/error. Column
  visibility menus, column-label maps, and form dialogs are duplicated per page.
  No global search; filters are inconsistent across tables.

### Decisions from the human (brainstorm Q&A)

- **Daily-used blocks (keep):** saldos y cuentas, costos operativos, gráficos y
  análisis (flujo de caja + pulso por sucursal).
- **De-prioritized (reduce):** cobros y pagos pendientes — collapse the triple
  duplication down to at most one compact place.
- **Aggressiveness:** simplify hard — remove duplicated metrics and low-value
  blocks, keep only what is actionable.
- **Scope:** everything — dashboard + navigation/breadcrumbs + shared components
  and work efficiency.
- **Roles:** all three (admin, contador, sucursal) matter equally — nav and
  shared components must serve all role variants.

## Proposed features

| # | slug | title | depends on | why |
| - | ---- | ----- | ---------- | --- |
| 1 | breadcrumb-labels | Fix breadcrumb label map and add missing route translations | — | Quick, isolated win; breadcrumbs currently render `Income-types`, `Sync-cuadres`, etc. |
| 2 | nav-cleanup | Consolidate sidebar: single Settings path, consistent role navs, tidy groups | — | Removes duplicate Settings entry and role asymmetries; serves all three roles. |
| 3 | dashboard-focus | Simplify the dashboard home: de-duplicate cobros/pagos and income/expense, drop low-value blocks, fix misleading trend badges | — | The centerpiece "simplificar fuerte"; keeps saldos, costos operativos, flujo de caja, pulso. |
| 4 | table-states | Standardize loading/empty/error across list pages with a shared wrapper | — | Finishes adoption of EmptyState/ErrorState/TableSkeleton; foundation for table work. |
| 5 | table-toolbar | Extract shared column-visibility + page-size + column-label toolbar | table-states | Removes duplicated table-chrome code across every list page. |
| 6 | table-filters | Consistent search + filters (status on payables/receivables, date-range picker on incomes/expenses) | table-states | Work-efficiency: faster lookups in the high-traffic tables. |
| 7 | form-dialog | Extract a shared form-dialog layout for create/edit dialogs | — | Removes duplicated dialog/form/toast boilerplate; consistency across modules. |
| 8 | command-palette | Global Cmd+K command palette: jump to any module + quick actions | nav-cleanup | Cross-module navigation efficiency for all roles. |

### Recommended order

1. breadcrumb-labels — isolated quick win.
2. nav-cleanup — navigation/organization.
3. dashboard-focus — the main declutter.
4. table-states — foundation for the table-chrome work.
5. table-toolbar — depends on table-states (same pages).
6. table-filters — depends on table-states (same pages).
7. form-dialog — independent component extraction.
8. command-palette — depends on nav-cleanup's settled nav structure.

Features 7 (form-dialog) and 8 (command-palette) are the most "stretch": pure
code-health and a net-new feature respectively. They can be dropped or deferred
without affecting 1–6.

## Open questions

- **Cobros/pagos on the dashboard:** remove entirely, or keep a single compact
  "pendientes y alertas" block (merged receivables + payables + operating-cost
  alerts)? Recommendation: keep one compact merged block, drop the other two
  appearances.
- **Section cards:** the four metric cards include two de-prioritized ones
  (Cobros pendientes, Pagos comprometidos). Replace them with saldos/costos
  metrics, or reduce the row to two cards? To resolve in dashboard-focus
  discovery.
- **Fidelidad for accountants:** is its absence from the accountant sidebar
  intentional, or a bug to fix in nav-cleanup?
- **Settings consolidation:** collapse the duplicate admin Settings path into the
  submenu only, or keep the secondary-nav shortcut? Recommendation: keep one.
- **CSV/export:** no module currently exports data. Out of scope unless desired —
  flag if it should become a feature.
- **command-palette scope:** in for this epic, or defer as a follow-up?

## Resolution

Approved by the human and registered as 8 features (epic `ui-refinement`), all
walked to `approved` with discovery + spec (requirements/design/tasks) under
`specs/<slug>/`. Implementation order is dependency-first; the spec pipeline
recorded every human decision so `/next-feature` runs gate-free.

| # | slug | state | depends on | key decisions captured in the spec |
| - | ---- | ----- | ---------- | ---------------------------------- |
| 1 | breadcrumb-labels | approved | — | fix broken keys; add sync-cuadres/formulario-dgii; "Detalle" for dynamic ids; **normalize accents**; keep CxC/CxP |
| 2 | nav-cleanup | approved | — | **single role-gated `masterNav` + `filterNavForRole`**; one Settings path; Fidelidad stays hidden for accountant; USER reports restricted; fix icons; normalize accents |
| 3 | dashboard-focus | approved | — | cobros/pagos removed from home (~9→0); KPIs consolidated into the hero (+Facturación); honest trend badge ("Nuevo" when no baseline); SectionCards deleted; widgets = Actividad + Pulso |
| 4 | table-states | approved | — | new `<TableStateBody>`; standardize loading/empty/error on all 8 list pages; filter-aware dual empty; bank-accounts aligned without regressing mobile |
| 5 | table-toolbar | approved | table-states | new `<TableColumnToggle>` / `<TablePagination>` / `<TableToolbar>` (with a `filters` slot); local label maps; bank-accounts partial |
| 6 | table-filters | approved | table-states, table-toolbar | shared `FilterField`/`ActiveFilterChip`/`SelectFilter`/`DateRangeFilter`; status on CxC/CxP; native date-range (no new dep); search+date compose; bank-accounts refactored |
| 7 | form-dialog | approved | — | composable `<FormDialog>` (`footer` + `headerExtra` slots); retrofit all 22 form dialogs; normalize type dialogs; adjust-tokens excluded |
| 8 | command-palette | approved | nav-cleanup | global Cmd/Ctrl+K `CommandDialog`; reuse nav source; groups Ir a / Acciones rápidas / Cuenta (logout + theme); visible header trigger; no new dep |

Decision boundary worth noting: `table-toolbar` now owns the toolbar with a
`filters` slot, so `table-filters` depends on it and fills that slot (instead of
re-extracting). `command-palette` and `nav-cleanup` share one exported nav source.

From here, `/next-feature` implements each feature one at a time with no further
questions or approvals, honoring the dependency order above.
