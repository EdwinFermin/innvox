# Requirements — empty-states

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1 — Component exists and accepts required props

WHEN `EmptyState` is rendered with an `icon` node, a `title` string, and a `description` string, the system SHALL render all three in a centered column layout with the icon in a soft rounded container above the title and description.

## R2 — Optional action slot

WHEN `EmptyState` is rendered with an `action` prop, the system SHALL render the action node below the description. WHEN `EmptyState` is rendered without an `action` prop, the system SHALL render no action element.

## R3 — Token-only styling

WHEN `EmptyState` is rendered, the system SHALL apply only design-system tokens (color, spacing, typography) and SHALL NOT introduce any hardcoded hex color literals, arbitrary pixel values, or Tailwind classes outside the project's spacing/type scale.

## R4 — Entry motion

WHEN `EmptyState` is mounted and the user's system does not have `prefers-reduced-motion: reduce` set, the system SHALL animate the component's entrance with an opacity fade from 0 to 1 and a translateY shift (upward settle) in the 150–250ms range using ease-out easing, animating only compositor-friendly properties (`opacity` and `transform`).

## R5 — Reduced-motion gate

WHEN `EmptyState` is mounted and the user's system has `prefers-reduced-motion: reduce` set, the system SHALL render without any animation or transition.

## R6 — Layout neutrality

WHEN `EmptyState` is placed inside a `<TableCell>` or a `<CardContent>` by its caller, the system SHALL not impose any outer margin, padding, or fixed width that would conflict with the parent container's layout.

## R7 — Payables: empty dataset case

WHEN the payables page finishes loading AND the total `payables` array is empty (length === 0), the system SHALL render `EmptyState` inside the table's no-rows `<TableCell>` with icon `Inbox`, title "Sin cuentas por pagar", description "Registra la primera para verla aquí.", and an action that opens the "Nueva cuenta por pagar" dialog.

## R8 — Payables: no search results case

WHEN the payables page finishes loading AND the total `payables` array is non-empty AND `filteredPayables` (after `visibilityScope` + `searchQuery` filtering) has length 0, the system SHALL render `EmptyState` inside the table's no-rows `<TableCell>` with icon `SearchX`, title "Sin resultados", description "Ajusta la búsqueda o limpia el filtro.", and an action button labeled "Limpiar búsqueda" that calls `setSearchQuery("")`.

## R9 — Payables: loading state unchanged

WHILE the payables query is loading (`isLoading === true`), the system SHALL render the existing loading skeleton/spinner branch and SHALL NOT render `EmptyState`.

## R10 — Payables create-dialog action wiring

WHEN the user activates the "Nueva cuenta por pagar" action rendered inside the empty-dataset `EmptyState` (R7), the system SHALL open the same `NewPayableDialog` that the page header already renders, without duplicating dialog state management by sharing a single `open` / `setOpen` state between the header trigger and the in-table trigger.

## R11 — Cuadre: no movements case

WHEN the cuadre-del-dia page finishes loading AND `report.movementRows` is empty AND `isLoading` is false, the system SHALL render `EmptyState` inside the existing `<TableCell colSpan={5}>` with icon `Inbox`, title "Sin movimientos", description "No hay ingresos ni gastos para la fecha y sucursal seleccionadas.", and no action.

## R12 — Cuadre: no branches case

WHEN the cuadre-del-dia page finishes loading AND `branches` is empty AND `isLoading` is false, the system SHALL render `EmptyState` inside the existing `<Card>` body (replacing the plain-text `<CardContent>`) with icon `Building2`, title "Sin sucursales", description "No hay sucursales disponibles para generar el cuadre del día.", and no action.

## R13 — Cuadre: loading state unchanged

WHILE the cuadre-del-dia query is loading, the system SHALL preserve the existing loading branches for both movements and branches and SHALL NOT render `EmptyState` in their place.

## R14 — No new runtime dependencies

WHEN the implementation is complete, the system SHALL introduce no new entries in `package.json` dependencies or devDependencies; all icons SHALL be sourced from the already-present `lucide-react` package.
