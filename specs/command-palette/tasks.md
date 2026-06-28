# Tasks — command-palette

> Discrete tasks that together cover every requirement. Check each off when done.
> Prerequisite: `nav-cleanup` must be in state `done` before T1 is started.

---

## Implementation

- [x] T1 — Verify (or add) exports `masterNav`, `filterNavForRole`, and `NavRole` in `src/components/ui/app-sidebar.tsx`; if missing, add the `export` keyword only — no logic change (covers: R23)

- [x] T2 — Create `src/components/dashboard/command-palette.tsx` as a `"use client"` module:
  - Define `CommandPaletteContext` with `open` / `setOpen` state
  - Implement `CommandPalette`: registers the Cmd/Ctrl+K keydown listener (with cleanup and text-field guard), renders `CommandDialog` controlled by the context state (covers: R1, R2, R3, R4, R5, R8, R9, R22)
  - Implement the three `CommandGroup` sections inside `CommandList` (covers: R10, R11, R12)
  - Implement "Ir a" group: resolve role via `useAuthStore` + `can`, call `filterNavForRole(masterNav, resolvedRole)`, flatten group nodes to leaf `FlatNavEntry` items with `searchValue` including parent title, render one `CommandItem` per entry with `router.push` + `setOpen(false)` on select (covers: R13, R14, R15, R16, R19)
  - Implement "Acciones rápidas" group: three static `CommandItem` entries with hardcoded URLs, `router.push` + `setOpen(false)` on select (covers: R17, R19)
  - Implement "Cuenta" group: "Mi cuenta" (router.push + close), "Cerrar sesión" (`signOut({ callbackUrl: "/login" })` + close), "Alternar tema" (`setTheme` cycle + close) (covers: R18, R19, R20, R21)
  - Export `CommandPaletteTrigger`: consumes context, renders `<Button variant="outline" size="sm">` with `SearchIcon` + "Buscar…" text (hidden below `sm`) + `<CommandShortcut>⌘K</CommandShortcut>` (covers: R6, R7, R8)

- [x] T3 — Mount `<CommandPalette />` in `src/app/dashboard/layout.tsx` inside `SidebarInset` (before `<header>`); place `<CommandPaletteTrigger />` in the header `div` after `SidebarTrigger` + `Separator`, before the breadcrumb `div` (covers: R6, R9)

---

## Verification (manual)

- [~] T4 — Manual (statically verified; auth-gated, deferred to live browser): open any dashboard page; press Cmd+K (or Ctrl+K) — palette opens; press again — palette closes (covers: R1, R2)

- [~] T5 — Manual (statically verified; auth-gated, deferred to live browser): with palette open, press Escape — palette closes (covers: R5)

- [~] T6 — Manual (statically verified; auth-gated, deferred to live browser): press Cmd+B — sidebar toggles; palette does not open (covers: R3)

- [~] T7 — Manual (statically verified; auth-gated, deferred to live browser): click inside a text input on any page, then press Cmd+K — palette does NOT open (covers: R4)

- [~] T8 — Manual (statically verified; auth-gated, deferred to live browser): click the "Buscar… ⌘K" header button — palette opens; click again — palette closes; confirm only one state is involved (no duplicate open dialogs) (covers: R6, R7, R8)

- [~] T9 — Manual (statically verified; auth-gated, deferred to live browser): open palette, type a string that matches nothing — "Sin resultados" is displayed (covers: R12)

- [~] T10 — Manual (statically verified; auth-gated, deferred to live browser): open palette, confirm three `CommandGroup` headings are visible: "Ir a", "Acciones rápidas", "Cuenta" in that order, with separators between them (covers: R10, R11)

- [~] T11 — Manual (statically verified; auth-gated, deferred to live browser): log in as a USER-role account; open palette; confirm admin-only routes (Configuración, Usuarios, Sucursales, Tipos de ingresos, Tipos de gastos, Formulario DGII, Utilidades, Cuentas financieras, Costos operativos) are absent from "Ir a" (covers: R14)

- [~] T12 — Manual (statically verified; auth-gated, deferred to live browser): log in as ADMIN; open palette; confirm all routes from `masterNav` appear in "Ir a" (covers: R15)

- [~] T13 — Manual (statically verified; auth-gated, deferred to live browser): log in as ACCOUNTANT; open palette; confirm "Ir a" contains exactly the routes whose `roles` includes `"accountant"` and excludes user-only and admin-only items (covers: R16)

- [~] T14 — Manual (statically verified; auth-gated, deferred to live browser): open palette, confirm "Acciones rápidas" contains exactly "Nuevo ingreso", "Nuevo gasto", "Cuadre del día"; select "Nuevo ingreso" — navigates to `/dashboard/transactions/incomes?new=1` and palette closes (covers: R17, R19)

- [~] T15 — Manual (statically verified; auth-gated, deferred to live browser): open palette, select "Mi cuenta" — navigates to `/dashboard/account` and palette closes (covers: R18, R19)

- [~] T16 — Manual (statically verified; auth-gated, deferred to live browser): open palette, select "Cerrar sesión" — user is signed out and redirected to `/login`; palette closes (covers: R18, R20)

- [~] T17 — Manual (statically verified; auth-gated, deferred to live browser): open palette, select "Alternar tema" multiple times — theme cycles through light/dark/system; palette closes after each selection (covers: R18, R21)

- [~] T18 — Manual (statically verified; auth-gated, deferred to live browser): navigate to at least three different dashboard pages without reloading the browser; confirm palette works identically on each page with no per-page wiring (covers: R9)

---

## Tooling gates

- [x] T19 — `npm run lint` passes with no new errors (covers: R22)

- [x] T20 — `npm run typecheck` passes with no new errors (covers: R22)

- [x] T21 — `npm run build` succeeds (covers: R9, R22)

---

## Close

- [ ] T22 — Traceability table verified; all requirements map to at least one passing verification step; `feature_list.json` state set to `done`

---

## Traceability

| Requirement | Task(s) | Verification |
| --- | --- | --- |
| R1 — Cmd/Ctrl+K opens palette when closed | T2 | T4 |
| R2 — Cmd/Ctrl+K closes palette when open | T2 | T4 |
| R3 — No interference with Cmd/Ctrl+B | T2 | T6 |
| R4 — No open when typing in a text field | T2 | T7 |
| R5 — Esc closes palette | T2 | T5 |
| R6 — Visible "Buscar… ⌘K" header button | T2, T3 | T8 |
| R7 — Header button opens/closes palette | T2 | T8 |
| R8 — Single shared open-state source | T2 | T8 |
| R9 — Single global mount, all dashboard pages | T3 | T18, T21 |
| R10 — Three CommandGroups in order | T2 | T10 |
| R11 — CommandInput filters all groups | T2 | T10 |
| R12 — CommandEmpty "Sin resultados" | T2 | T9 |
| R13 — "Ir a" derived from filterNavForRole | T2 | T11, T12, T13 |
| R14 — USER role excludes admin-only routes | T2 | T11 |
| R15 — ADMIN role sees all routes | T2 | T12 |
| R16 — ACCOUNTANT role sees accountant routes | T2 | T13 |
| R17 — "Acciones rápidas" three static entries | T2 | T14 |
| R18 — "Cuenta" three entries (Mi cuenta, logout, theme) | T2 | T15, T16, T17 |
| R19 — Select navigates and closes | T2 | T14, T15 |
| R20 — "Cerrar sesión" calls signOut + closes | T2 | T16 |
| R21 — "Alternar tema" cycles theme + closes | T2 | T17 |
| R22 — No new npm dependencies | T2 | T19, T20, T21 |
| R23 — masterNav + filterNavForRole exported | T1 | T12, T13, T14 |
