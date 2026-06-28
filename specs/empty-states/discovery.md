# Discovery — empty-states

## Request

Replace text-only empty messages with an intentional, reusable `EmptyState` component (icon + title + hint + optional action) on the reference pages — a high-impact anti-slop change.

## Findings

- **Payables** (`src/app/dashboard/payables/page.tsx:405-413`): when there are no rows, a single `<TableCell colSpan={columns.length}>` shows plain text "No se encontraron cuentas por pagar." This **conflates two cases**: a truly empty table (first use) vs. a non-empty dataset filtered to nothing by the search box (`filteredPayables`, search via `searchQuery`). No icon, no action.
- **Cuadre** (`src/app/dashboard/reports/cuadre-del-dia/page.tsx`): two text-only empties — "No hay sucursales disponibles para generar el cuadre del día." (no branches configured, line 200-203, rendered as `Card` body) and "Sin movimientos en la fecha seleccionada." (no movements for the chosen date/branch, line 258-260, inside a `<TableCell colSpan={5}>`).
- No reusable `EmptyState` exists. `Card`/`CardContent` and `Button` are available; lucide-react is already a dependency for icons.
- Empties must render in **two containers**: inside a table cell (`colSpan`, centered) for payables/cuadre tables, and as a `Card` body for the cuadre no-branches case.

## Affected areas

- New: `src/components/ui/empty-state.tsx`.
- `src/app/dashboard/payables/page.tsx` — split the no-rows branch into "no data" vs "no search results" and render `EmptyState` (inside the table cell).
- `src/app/dashboard/reports/cuadre-del-dia/page.tsx` — `EmptyState` for "no movements" (in cell) and "no branches" (card body).

## Approaches considered

- **Option A — One `EmptyState` (icon, title, description, optional action), context-distinct usage.** A single presentational component; each page passes the right icon/copy/action. Payables distinguishes empty-dataset (icon + "Nueva cuenta por pagar" action) from no-search-results (search icon + "Limpiar búsqueda" action). *Leaning toward this.*
- **Option B — Single generic empty state, same copy for all cases.** Less code but keeps the conflation and reads generic — rejected (defeats the anti-slop goal).

Leaning toward: **Option A**.

## Open questions ← a human must answer these

1. **Distinguish cases?** For payables, split "no data yet" (offer the create action) from "no results for this search" (offer "Limpiar búsqueda")? Or keep one generic empty message?
2. **Action slot:** Should `EmptyState` support an optional action (button/link) — e.g. payables empty → trigger the "Nueva cuenta por pagar" dialog, search-empty → clear the search? (Cuadre cases would have no action, just message.)
3. **Icons:** Use lucide icons per context (e.g. an inbox/document icon for empty data, a search icon for no-results, a building/branch icon for no-branches)? Confirm lucide + that an icon is desired.
4. **Copy:** Confirm Spanish wording per case (e.g. payables empty: title "Sin cuentas por pagar", hint "Registra la primera para verla aquí."; no-results: "Sin resultados", "Ajusta la búsqueda o limpia el filtro."; cuadre no movements: "Sin movimientos", "No hay ingresos ni gastos para la fecha y sucursal seleccionadas.").

## Assumptions

- `EmptyState` is presentational, token-only, with subtle entry motion per `docs/motion.md` (or none — inherits design system).
- Reused in both table-cell and card-body contexts (the component is layout-neutral; the caller provides the wrapping cell/card).
- No new dependencies.

## Resolution ← filled in after the human answers

- Q1 (distinguish) → **Yes.** Payables splits empty-dataset from no-search-results, each with its own icon/copy/action.
- Q2 (anatomy) → **Icon + optional action.** `EmptyState` = lucide icon + title + hint + optional action slot. Cuadre cases pass message-only; payables passes actions.
- Q3 (icons) → **lucide**, per context: empty data → `Inbox` (or `FileText`), no-results → `SearchX`, no-branches → `Building2`.
- Q4 (copy) → Default Spanish accepted: payables empty → title "Sin cuentas por pagar", hint "Registra la primera para verla aquí." + action "Nueva cuenta por pagar"; no-results → title "Sin resultados", hint "Ajusta la búsqueda o limpia el filtro." + action "Limpiar búsqueda"; cuadre no-movements → title "Sin movimientos", hint "No hay ingresos ni gastos para la fecha y sucursal seleccionadas." (no action); cuadre no-branches → title "Sin sucursales", hint "No hay sucursales disponibles para generar el cuadre del día." (no action).
- Decision: **Option A** — `src/components/ui/empty-state.tsx` (props: `icon`, `title`, `description`, optional `action`), token-only, subtle entry motion per `docs/motion.md`, layout-neutral so it renders inside a table cell (`colSpan`) or a `Card` body. Payables wires create-dialog trigger + clear-search; cuadre wires message-only. No new dependencies.
