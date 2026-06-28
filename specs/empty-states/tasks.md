# Tasks — empty-states

> Discrete tasks that together cover every requirement. Check each off when done.

## Implementation

- [x] T1 — Create `src/components/ui/empty-state.tsx` exporting `EmptyState` with props `icon`, `title`, `description`, `action?`, `className?`; centered column layout using token-only Tailwind classes; icon in `bg-muted rounded-xl p-3` container; `motion-safe:` variant drives opacity+translateY entry animation at 150–250ms ease-out; no animation under `prefers-reduced-motion: reduce`. (covers: R1, R2, R3, R4, R5, R6, R14)

- [x] T2 — Lift `open` / `setOpen` state to `PayablesPage`; add `open: boolean` and `onOpenChange: (open: boolean) => void` props to `NewPayableDialog`; replace the internal state with the passed props; thread the props through the header usage `<NewPayableDialog open={dialogOpen} onOpenChange={setDialogOpen} />`. (covers: R10)

- [x] T3 — In `PayablesPage`, replace the single no-rows `<TableCell>` text branch with two nested conditions: when `payables.length === 0` render `EmptyState` (icon `Inbox`, title "Sin cuentas por pagar", description "Registra la primera para verla aquí.", action `<Button onClick={() => setDialogOpen(true)}>Nueva cuenta por pagar</Button>`); when `filteredPayables.length === 0` render `EmptyState` (icon `SearchX`, title "Sin resultados", description "Ajusta la búsqueda o limpia el filtro.", action `<Button onClick={() => setSearchQuery("")}>Limpiar búsqueda</Button>`). Keep the `isLoading` branch above these untouched. (covers: R7, R8, R9, R10)

- [x] T4 — In `cuadre-del-dia/page.tsx`, replace the no-branches plain-text `<CardContent>` with `<CardContent className="py-10"><EmptyState icon={Building2} title="Sin sucursales" description="No hay sucursales disponibles para generar el cuadre del día." /></CardContent>`. Import `Building2` from `lucide-react`. (covers: R12, R13)

- [x] T5 — In `cuadre-del-dia/page.tsx`, replace the no-movements else-branch text `"Sin movimientos en la fecha seleccionada."` (inside the `isLoading ? ... : ...` ternary) with `<EmptyState icon={Inbox} title="Sin movimientos" description="No hay ingresos ni gastos para la fecha y sucursal seleccionadas." />`. Keep the `isLoading` text branch above it unchanged. Import `Inbox` from `lucide-react` (`SearchX` is only needed in `payables/page.tsx`; importing it unused in the cuadre page would fail lint). (covers: R11, R13)

## Verification

- [x] T6 — Run `npm run typecheck`; zero new type errors. (covers: R1, R2, R7, R8, R10, R11, R12)

- [x] T7 — Run `npm run lint`; zero new lint errors. (covers: R3, R14)

## Tests

> The project has no unit runner (`reins.config.json` `test: null`). T8–T11 are skippable until one exists; until then these requirements are covered by the traceability table below and a green `npx reins verify` (lint + design scan + typecheck). The tests below are described for future enablement.

- [ ] T8 — Unit test: render `EmptyState` with `icon`, `title`, `description` → assert icon container, title text, and description text appear in the output; assert no action element is present. (covers: R1, R2)

- [ ] T9 — Unit test: render `EmptyState` with all props including `action` → assert the action node appears in the output below the description. (covers: R2)

- [ ] T10 — Unit test: render `EmptyState` → assert root element carries the motion-safe animation class (or equivalent data attribute) and that the `prefers-reduced-motion` media query branch is handled (mock the media query to `reduce` and assert no transition/animation class is applied). (covers: R4, R5)

- [ ] T11 — Unit test: render `EmptyState` inside a `<td>` wrapper → assert no overflow or imposed outer margin from the component itself. (covers: R6)

## Close

- [x] T12 — `npx reins verify` is green (lint + design scan pass; no block-severity slop tells in the new component).

- [x] T13 — Traceability table confirmed complete in `progress/impl_empty-states.md`.

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1  | T1 | T8 |
| R2  | T1 | T8, T9 |
| R3  | T1 | T7 |
| R4  | T1 | T10 |
| R5  | T1 | T10 |
| R6  | T1 | T11 |
| R7  | T3 | T8 (via EmptyState props) |
| R8  | T3 | T8 (via EmptyState props) |
| R9  | T3 | — (structural: loading branch not removed) |
| R10 | T2, T3 | T9 (action render) |
| R11 | T5 | T8 (via EmptyState props) |
| R12 | T4 | T8 (via EmptyState props) |
| R13 | T4, T5 | — (structural: loading branch not removed) |
| R14 | T1 | T7 (lint/import audit) |
