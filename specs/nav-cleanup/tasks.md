# Tasks — nav-cleanup

> Discrete tasks that together cover every requirement. All changes are confined to
> `src/components/ui/app-sidebar.tsx` unless explicitly stated otherwise.
> Check each off as it is completed.

---

## Implementation

- [x] T1 — Add `NavRole` type (`"admin" | "accountant" | "user"`) and the `MasterNavItem` / `MasterSubItem` internal interfaces inside `app-sidebar.tsx`. (covers: R1, R2)

- [x] T2 — Write `const masterNav: MasterNavItem[]` replacing `data.navAdmin`, `data.navMain`, and `data.navAccountant`. Populate every item and sub-item with the correct `roles` array per the visibility matrix, and apply all accent-normalized labels at definition time ("Parámetros", "Sincronizar Envíos RD", "Cuadre del día", "Configuración"). (covers: R1, R3–R16, R23, R24, R26, R27)

- [x] T3 — Write the pure `filterNavForRole(items, role)` helper that (a) keeps only items whose `roles` includes `role`, (b) filters sub-items the same way, (c) drops any group whose filtered sub-item count is zero, and (d) strips the `roles` field from every returned object so the output matches `NavMain`'s prop type. (covers: R1, R2, R17, R28)

- [x] T4 — In the `AppSidebar` component body, derive `resolvedRole: NavRole` from the existing `canManageSettings` and `user?.type` variables (admin → accountant → user precedence), then replace the line-445 ternary with `filterNavForRole(masterNav, resolvedRole)`. (covers: R2, R3, R9, R13)

- [x] T5 — Replace the secondary nav: remove the two-item `data.navSecondary` array; define an inline `navSecondary` constant with only the "Mi cuenta" item using `CircleUser`; pass it directly to `<NavSecondary items={navSecondary} ... />` without any `.filter()` call. (covers: R18, R19, R20, R21, R29)

- [x] T6 — Update the lucide import block: add `CircleUser`; remove `LifeBuoy` and `Send`. Verify no other usage of `LifeBuoy` or `Send` remains in the file. (covers: R22)

- [x] T7 — Normalize the quick-actions group label from `"Acciones rapidas"` to `"Acciones rápidas"` (line 414 in the original file). (covers: R25)

- [x] T8 — Normalize the "Cuadre del dia" title inside the `quickActions` array to `"Cuadre del día"`. (covers: R26)

- [x] T9 — Audit every remaining string literal in the file for missing Spanish accents and apply any outstanding corrections (e.g. ensure no stray unaccented "Configuracion", "Parametros", "Envios", or "dia"). (covers: R23, R24, R25, R26, R27)

---

## Verification

- [x] T10 — Run `npm run lint` and confirm zero new errors or warnings attributable to this change. (covers: R22, R28, R29) — lint exit 0, no errors, no warnings.

- [x] T11 — Run `npm run typecheck` and confirm zero type errors attributable to this change. (covers: R28, R29) — typecheck exit 0.

- [~] T12 — Manual role simulation — admin: log in (or simulate `canManageSettings = true`) and verify the sidebar shows exactly: Dashboard, Transacciones (6 sub-items), Facturación, Clientes, Cuentas financieras, Costos operativos, Fidelidad (Tarjetas + Scanner), Reportes (Utilidades + Cuadre del día + Formulario DGII), Parámetros (Tipos de ingresos + Tipos de gastos), Configuración (General + Usuarios + Sucursales). Secondary nav shows only "Mi cuenta". No duplicate Settings link. (covers: R3–R8, R18, R20, R21) — verified statically by tracing the matrix; live browser check deferred (auth-gated dev server).

- [~] T13 — Manual role simulation — accountant: simulate `user.type = "ACCOUNTANT"` (non-admin) and verify the sidebar shows exactly: Dashboard, Transacciones (6 sub-items), Facturación, Clientes, Cuentas financieras, Costos operativos, Reportes (Utilidades + Cuadre del día + Formulario DGII), Parámetros (Tipos de ingresos + Tipos de gastos). Fidelidad and Configuración are absent. Secondary nav shows only "Mi cuenta". (covers: R9–R12, R19, R20, R21) — verified statically; live check deferred.

- [~] T14 — Manual role simulation — user: simulate `user.type = "USER"` and verify the sidebar shows exactly: Dashboard, Transacciones (6 sub-items), Facturación, Clientes, Fidelidad (Tarjetas + Scanner), Reportes (Cuadre del día only — Utilidades and Formulario DGII absent). Cuentas financieras, Costos operativos, Parámetros, Configuración are all absent. Secondary nav shows only "Mi cuenta". (covers: R13–R16, R17, R19, R20, R21) — verified statically; live check deferred.

- [~] T15 — Visually confirm all accent-normalized labels appear correctly in each role's sidebar: "Parámetros", "Sincronizar Envíos RD", "Cuadre del día", "Acciones rápidas", "Configuración". (covers: R23–R27) — verified statically (grep shows no unaccented variants remain); live visual check deferred.

- [x] T16 — Confirm that `nav-main.tsx` and `nav-secondary.tsx` are unmodified (git diff shows no changes to those files). (covers: R28, R29) — `git diff --name-only` lists neither file; 0 changes.

---

## Close

- [x] T17 — `npx reins verify` is green (lint + typecheck pass). — Result: PASS.
- [x] T18 — Traceability table confirmed complete; write the implementation summary to `progress/impl_nav-cleanup.md`.

---

## Traceability

| Requirement | Task(s) | Verification task(s) |
| --- | --- | --- |
| R1 — Single-source master nav | T1, T2, T3 | T12, T13, T14 |
| R2 — Role resolution unchanged | T4 | T12, T13, T14 |
| R3 — Admin: full top-level items | T2, T4 | T12 |
| R4 — Admin: Transacciones 6 sub-items | T2 | T12 |
| R5 — Admin: Fidelidad sub-items | T2 | T12 |
| R6 — Admin: Reportes 3 sub-items | T2 | T12 |
| R7 — Admin: Parámetros sub-items | T2 | T12 |
| R8 — Admin: Configuración sub-items | T2 | T12 |
| R9 — Accountant: exact top-level items | T2, T4 | T13 |
| R10 — Accountant: Transacciones 6 sub-items | T2 | T13 |
| R11 — Accountant: Reportes 3 sub-items | T2 | T13 |
| R12 — Accountant: Parámetros sub-items | T2 | T13 |
| R13 — User: exact top-level items | T2, T4 | T14 |
| R14 — User: Transacciones 6 sub-items | T2 | T14 |
| R15 — User: Fidelidad sub-items | T2 | T14 |
| R16 — User: Reportes 1 sub-item only | T2, T3 | T14 |
| R17 — Empty groups are omitted | T3 | T14 |
| R18 — Single Settings path for admin | T5 | T12 |
| R19 — No Settings for accountant/user | T2, T5 | T13, T14 |
| R20 — No .filter() on secondary nav | T5 | T12, T13, T14 |
| R21 — CircleUser icon for Mi cuenta | T5 | T12, T13, T14 |
| R22 — LifeBuoy/Send imports removed | T6 | T10 |
| R23 — "Parámetros" accent | T2, T9 | T15 |
| R24 — "Sincronizar Envíos RD" accent | T2, T9 | T15 |
| R25 — "Acciones rápidas" accent | T7 | T15 |
| R26 — "Cuadre del día" accent | T2, T8, T9 | T15 |
| R27 — All accents correct, no "Configuracion" | T9 | T15 |
| R28 — NavMain prop shape unchanged | T3 | T11, T16 |
| R29 — NavSecondary prop shape unchanged | T5 | T11, T16 |
