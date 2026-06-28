# Discovery — nav-cleanup

> Written by the **leader** from real exploration. Stays `needs_clarification`
> until the human resolves the open questions below.

## Request

Consolidate the dashboard sidebar: a single path to Settings, consistent
navigation across the three role variants, and tidier groups/labels/icons.

## Findings

All sidebar nav lives in `src/components/ui/app-sidebar.tsx`. It defines three
nearly-identical nav arrays and a secondary nav, then picks one at render time.

- **Role selection** (line 445):
  `canManageSettings ? navAdmin : user?.type === "ACCOUNTANT" ? navAccountant : navMain`.
  Secondary nav (line 446): admins get `navSecondary` as-is; everyone else gets
  it with `/dashboard/settings` filtered out.
- **Duplicate Settings path (admins):**
  - `navAdmin` has a "Configuración" submenu (lines 156–172): General →
    `/dashboard/settings`, Usuarios → `/dashboard/users`, Sucursales →
    `/dashboard/branches`.
  - `navSecondary` ALSO has "Configuracion" → `/dashboard/settings` (lines
    349–352). So admins reach Settings from two places.
  - Label drift: "Configuración" (accented, navAdmin) vs "Configuracion"
    (unaccented, navSecondary).
- **Template-leftover icons in `navSecondary`** (lines 342–353): "Mi cuenta" uses
  `LifeBuoy` (a support/help icon) and "Configuracion" uses `Send` (a paper-plane
  / feedback icon). Both are shadcn-template leftovers, semantically wrong.
- **Heavy duplication:** the "Transacciones" sub-item block (Ingresos, Gastos,
  CxC, CxP, Link de pago, Sincronizar Envios RD) is copy-pasted verbatim in all
  three arrays (lines 56–83, 182–209, 256–283). This duplication is the root
  cause of label/route drift between roles and with the breadcrumb map.
- **Fidelidad asymmetry:** present in `navAdmin` (lines 109–122) and `navMain`
  (lines 224–236), **absent** from `navAccountant`. Routes `/dashboard/loyalty`
  and `/dashboard/loyalty/scanner` exist regardless.
- **Reportes asymmetry:** `navMain` (regular USER) shows only "Cuadre del dia"
  (lines 238–246); `navAdmin`/`navAccountant` show Utilidades + Cuadre del dia +
  Formulario DGII. (Note: this is nav-level hiding only; route-level guards are
  out of scope for this feature.)
- **navMain scoping:** regular USER also lacks Cuentas financieras, Costos
  operativos, and Parametros — appears intentional permission scoping.
- **Accent inconsistency across the sidebar:** "Facturación"/"Configuración"
  carry accents, but "Parametros", "Sincronizar Envios RD", and the group label
  "Acciones rapidas" (line 414) do not. The just-approved `breadcrumb-labels`
  feature normalizes accents, so the sidebar will visibly diverge unless aligned.

## Affected areas

- `src/components/ui/app-sidebar.tsx` — the nav data + role selection + secondary
  nav + group label + icon imports. Primary (likely only) file.
- `src/components/ui/nav-main.tsx`, `nav-secondary.tsx` — renderers; read to
  confirm the item shape, likely untouched.
- No routing, no auth/permission logic changes (visibility per role is preserved
  unless a question below changes it).

## Approaches considered

- **Option A — targeted fixes (minimal diff):** keep the three arrays; remove the
  duplicate Settings link from `navSecondary`, fix the leftover icons, resolve
  Fidelidad/Reportes per the human's answers, normalize accents. Lowest risk,
  but the triple duplication (and its drift risk) remains.
- **Option B — single-source nav (behavior-preserving consolidation):** define
  the nav items once and gate each with explicit role/permission flags, then
  derive each role's list by filtering. Reproduces today's per-role visibility
  exactly (plus the agreed fixes), and kills the duplication that caused the
  drift. Bigger diff, slightly higher risk, must be verified per role.

Leaning toward **Option B** because "varios por igual" (all roles matter) and the
duplication is the documented root cause of drift — but it needs the human's
go-ahead since it restructures the file.

## Open questions ← a human must answer these

1. **Fidelidad for accountants:** should `navAccountant` include the Fidelidad
   group (Tarjetas + Scanner), or is its omission intentional?
2. **Reportes for regular USER:** keep the restriction (USER sees only "Cuadre
   del dia"), or give USER the full Reportes group (Utilidades + DGII)?
3. **Refactor depth:** Option A (targeted fixes, keep three arrays) or Option B
   (single permission-gated nav source that reproduces current visibility)?
4. **Sidebar accent normalization:** normalize all sidebar labels + group labels
   to proper accents (Parámetros, "Sincronizar Envíos RD", "Acciones rápidas",
   single "Configuración"), to stay consistent with the breadcrumb feature — or
   leave the sidebar labels as-is?

## Assumptions

- **Single Settings path (headline of the feature):** keep the richer admin
  "Configuración" submenu (General/Usuarios/Sucursales) and remove the duplicate
  "Configuracion" link from `navSecondary`; `navSecondary` reduces to "Mi
  cuenta" only, dropping the now-unneeded settings filter at line 446. (Override
  in your answer if you prefer keeping the secondary link instead.)
- Fix the leftover icons: "Mi cuenta" → a user/account icon (e.g. `CircleUser`),
  not `LifeBuoy`; the secondary "Configuracion" is removed so `Send` goes too.
  Remove now-unused icon imports.
- Per-role visibility is otherwise preserved exactly (no role gains/loses
  modules) except where Q1/Q2 decide.

## Resolution ← filled in after the human answers

- **Q1 → Fidelidad stays hidden for accountants** (omission is intentional).
- **Q2 → Keep the Reportes restriction:** regular USER sees only "Cuadre del
  día"; admin/accountant keep Utilidades + DGII.
- **Q3 → Option B (single permission-gated nav source)** that reproduces the
  exact current per-role visibility, plus the agreed fixes.
- **Q4 → Normalize accents** across all sidebar + group labels.

### Settings (headline) — confirmed default

Keep the admin "Configuración" submenu (General/Usuarios/Sucursales); remove the
duplicate "Configuracion" link from `navSecondary`. `navSecondary` becomes "Mi
cuenta" only, so the line-446 settings filter is dropped. Fix the leftover
icons: "Mi cuenta" → `CircleUser` (drop `LifeBuoy`); drop `Send` (now unused).
Remove any icon imports left unused.

### Exact per-role visibility matrix to reproduce (Option B)

Roles resolve as today: `admin` = `canManageSettings` true; `accountant` =
`type === "ACCOUNTANT"`; `user` = everything else.

| Item | admin | accountant | user |
| --- | :-: | :-: | :-: |
| Dashboard | ✓ | ✓ | ✓ |
| Transacciones (Ingresos, Gastos, CxC, CxP, Link de pago, Sincronizar Envíos RD) | ✓ | ✓ | ✓ |
| Facturación | ✓ | ✓ | ✓ |
| Clientes | ✓ | ✓ | ✓ |
| Cuentas financieras | ✓ | ✓ | ✗ |
| Costos operativos | ✓ | ✓ | ✗ |
| Fidelidad (Tarjetas, Scanner) | ✓ | ✗ | ✓ |
| Reportes → Utilidades | ✓ | ✓ | ✗ |
| Reportes → Cuadre del día | ✓ | ✓ | ✓ |
| Reportes → Formulario DGII | ✓ | ✓ | ✗ |
| Parámetros (Tipos de ingresos, Tipos de gastos) | ✓ | ✓ | ✗ |
| Configuración (General, Usuarios, Sucursales) | ✓ | ✗ | ✗ |
| Mi cuenta (secondary) | ✓ | ✓ | ✓ |

Notes for the design:
- A group is shown only if it has ≥1 visible sub-item (so USER's "Reportes" shows
  just "Cuadre del día"; per-sub-item gating is required, not just per-group).
- Filtering happens before passing items to `nav-main.tsx`/`nav-secondary.tsx`,
  so those renderers stay unchanged.

### Accent-normalized labels

`Parametros → Parámetros`, `Sincronizar Envios RD → Sincronizar Envíos RD`,
`Acciones rapidas → Acciones rápidas`, single `Configuración`. Audit every label
and group label for missing accents.

- **Decision:** Single-source, role-gated nav in `app-sidebar.tsx` reproducing
  the matrix above; dedupe Settings; fix icons; normalize accents. No route or
  permission-logic changes; no role gains/loses any module vs. today.
