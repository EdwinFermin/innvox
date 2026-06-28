# Implementation — nav-cleanup

## Summary

Consolidated the sidebar into a single source of truth, confined entirely to
`src/components/ui/app-sidebar.tsx`. The three duplicated nav arrays (`data.navAdmin`,
`data.navMain`, `data.navAccountant`) — the documented root cause of label/route drift between roles —
were replaced by one `masterNav` array where every top-level item and every sub-item carries a `roles`
visibility set. A pure `filterNavForRole(items, role)` helper derives each role's view from that single
list: it keeps items whose `roles` include the active role, filters sub-items the same way, drops any
group left with zero visible sub-items (R17), and strips the internal `roles` field so the output
matches `NavMain`'s prop shape exactly (R28). The active role is resolved in `AppSidebar` from the
existing `canManageSettings` / `user?.type` variables with the same precedence the previous ternary
used, so every role boundary is preserved.

The secondary nav was reduced to a single inline "Mi cuenta" entry using `CircleUser` and is passed
directly to `NavSecondary` with no runtime `.filter()` call — Settings now lives solely in the admin
`Configuración` main-nav group, eliminating the duplicate Settings link. The unused `LifeBuoy` and
`Send` lucide imports were removed and `CircleUser` added. All nav labels were accent-normalized at
definition time ("Parámetros", "Sincronizar Envíos RD", "Cuadre del día", "Acciones rápidas",
"Configuración"), and the file was audited so no unaccented variant remains.

No other file changed. `nav-main.tsx`, `nav-secondary.tsx`, `can.ts`, `permissions.ts`, and `roles.ts`
were treated as read-only inputs and are untouched. Net effect on the one touched file: 168 insertions,
314 deletions (the triple duplication is gone).

## Files changed

| File | Task → Requirement | Change |
| --- | --- | --- |
| `src/components/ui/app-sidebar.tsx` | T1 → R1, R2 | Added internal `NavRole` type and `MasterNavItem` / `MasterSubItem` interfaces; imported `type LucideIcon` (lucide) and `type IconType` (react-icons/lib) for the item-shape types. |
| `src/components/ui/app-sidebar.tsx` | T2 → R1, R3–R16, R23, R24, R26, R27 | Replaced `data.navAdmin` / `data.navMain` / `data.navAccountant` with one `const masterNav: MasterNavItem[]`; each item/sub-item carries the exact `roles` set from design.md's matrix; labels accent-normalized at definition ("Parámetros", "Sincronizar Envíos RD", "Cuadre del día", "Configuración"). |
| `src/components/ui/app-sidebar.tsx` | T3 → R1, R2, R17, R28 | Added pure `filterNavForRole(items, role): NavItem[]`; keeps role-matched items, filters sub-items, drops zero-sub-item groups (R17), rebuilds each object to strip the internal `roles` field (R28). Added an internal `NavItem` interface matching `NavMain`'s prop shape. |
| `src/components/ui/app-sidebar.tsx` | T4 → R2, R3, R9, R13 | Derived `const resolvedRole: NavRole` from `canManageSettings` → `user?.type === "ACCOUNTANT"` → else, mirroring the old ternary's precedence; replaced the line-445 expression with `filterNavForRole(masterNav, resolvedRole)`. |
| `src/components/ui/app-sidebar.tsx` | T5 → R18, R19, R20, R21, R29 | Replaced two-item `data.navSecondary` with an inline `const navSecondary` containing only "Mi cuenta" (`CircleUser`); passed directly to `<NavSecondary items={navSecondary} className="mt-auto" />` — removed the `.filter()` at the old line 446. |
| `src/components/ui/app-sidebar.tsx` | T6 → R22 | Removed `LifeBuoy` and `Send` from the lucide import block; added `CircleUser`. Confirmed no remaining `LifeBuoy`/`Send` usage in the file. |
| `src/components/ui/app-sidebar.tsx` | T7 → R25 | Quick-actions group label `"Acciones rapidas"` → `"Acciones rápidas"`. |
| `src/components/ui/app-sidebar.tsx` | T8 → R26 | Quick-actions item title `"Cuadre del dia"` → `"Cuadre del día"`. |
| `src/components/ui/app-sidebar.tsx` | T9 → R23, R24, R25, R26, R27 | Full accent audit (grep) — no stray "Parametros", "Envios RD", "Cuadre del dia", "Configuracion", or "Acciones rapidas" remains. |

## Key decisions

- **`filterNavForRole` rebuilds objects explicitly instead of rest-destructuring.** The design.md sketch
  used `.map(({ roles: _roles, ...rest }) => …)` to drop the internal field. That pattern produced two
  `@typescript-eslint/no-unused-vars` warnings (`_roles` / `_subRoles`) because the project's ESLint
  config has no underscore `varsIgnorePattern` override and the repo has no `eslint-disable` precedent.
  T10 requires zero new warnings, so the helper instead constructs each returned object property-by-
  property (`{ title, url, icon, isActive }`, plus `items` when present). This is warning-free, makes
  the "strip `roles`" intent explicit, and produces the identical NavMain-shaped output the sketch
  described. Behavior is unchanged versus the sketch; only the mechanism differs.
- **Group items keep `url: undefined` / `isActive: undefined` in the rebuilt object.** `NavMain`'s prop
  type marks both `url?` and `isActive?` optional, so an explicit `undefined` is type-compatible and
  renders identically to the old arrays (which simply omitted those keys on group items). No behavior
  change in `NavMain`'s `isItemActive`/render logic.
- **`resolvedRole` precedence mirrors the old ternary exactly.** Old: `canManageSettings ? navAdmin :
  user?.type === "ACCOUNTANT" ? navAccountant : navMain`. New: `canManageSettings ? "admin" :
  user?.type === "ACCOUNTANT" ? "accountant" : "user"`. Admin wins over accountant (an admin who is also
  typed ACCOUNTANT still resolves to admin), preserving R2's boundary definition verbatim.
- **`type IconType` import added.** The `MasterNavItem.icon` field is typed `LucideIcon | IconType` to
  match `NavMain`'s prop type (which already accepts both, since `react-icons` icons can appear). No
  current masterNav item uses an `IconType` icon, but the union keeps the internal type a superset of
  `NavMain`'s contract so `filterNavForRole`'s output is assignable without a cast.
- **Manual role-simulation tasks (T12–T15) verified statically.** Live verification requires the
  auth-gated dev server, which the implementer cannot exercise here; per the established pattern these
  are marked `[~]` (deferred) in `tasks.md`. Each was instead confirmed by tracing the visibility matrix
  (below) and by grep proving no unaccented label survives. T16 (`nav-main`/`nav-secondary` unmodified)
  was confirmed via `git diff --name-only` (neither file appears).

### Per-role matrix trace (static verification of T12–T14)

- **admin** → all 10 top-level items render. Reportes = {Utilidades, Cuadre del día, Formulario DGII};
  Parámetros = {Tipos de ingresos, Tipos de gastos}; Configuración = {General, Usuarios, Sucursales};
  Fidelidad = {Tarjetas, Scanner}; Transacciones = 6 sub-items. (R3–R8)
- **accountant** → Fidelidad (`["admin","user"]`) and Configuración (`["admin"]`) drop, leaving 8
  items: Dashboard, Transacciones (6), Facturación, Clientes, Cuentas financieras, Costos operativos,
  Reportes (3), Parámetros (2). (R9–R12)
- **user** → Cuentas financieras / Costos operativos (`["admin","accountant"]`), Parámetros, and
  Configuración drop, leaving 6 items: Dashboard, Transacciones (6), Facturación, Clientes, Fidelidad
  (2), Reportes. For `user`, Reportes keeps only "Cuadre del día" (Utilidades and Formulario DGII are
  `["admin","accountant"]`), exactly one sub-item — R16. No group is emptied for `user`, so R17's
  drop-empty path is exercised conceptually but not triggered with this matrix. (R13–R16)

## Requirement → coverage (traceability) table

| Requirement | Task(s) | Implemented in | Verified by |
| --- | --- | --- | --- |
| R1 — Single-source master nav | T1, T2, T3 | `masterNav` + types + `filterNavForRole` | typecheck green; matrix trace (T12–T14, static) |
| R2 — Role resolution unchanged | T4 | `resolvedRole` ternary mirrors old precedence | typecheck green; matrix trace |
| R3 — Admin: full top-level items | T2, T4 | `masterNav` roles + admin filter | matrix trace (admin) |
| R4 — Admin: Transacciones 6 sub-items | T2 | Transacciones sub-items all `[admin,…]` | matrix trace (admin) |
| R5 — Admin: Fidelidad sub-items | T2 | Fidelidad {Tarjetas, Scanner} `[admin,user]` | matrix trace (admin) |
| R6 — Admin: Reportes 3 sub-items | T2 | Reportes 3 sub-items include admin | matrix trace (admin) |
| R7 — Admin: Parámetros sub-items | T2 | Parámetros {ingresos, gastos} `[admin,accountant]` | matrix trace (admin) |
| R8 — Admin: Configuración sub-items | T2 | Configuración {General, Usuarios, Sucursales} `[admin]` | matrix trace (admin) |
| R9 — Accountant: exact top-level items | T2, T4 | Fidelidad/Configuración exclude accountant | matrix trace (accountant) |
| R10 — Accountant: Transacciones 6 sub-items | T2 | same shared sub-items | matrix trace (accountant) |
| R11 — Accountant: Reportes 3 sub-items | T2 | Reportes sub-items include accountant | matrix trace (accountant) |
| R12 — Accountant: Parámetros sub-items | T2 | Parámetros include accountant | matrix trace (accountant) |
| R13 — User: exact top-level items | T2, T4 | financieras/costos/Parámetros/Config exclude user | matrix trace (user) |
| R14 — User: Transacciones 6 sub-items | T2 | shared sub-items include user | matrix trace (user) |
| R15 — User: Fidelidad sub-items | T2 | Fidelidad `[admin,user]` | matrix trace (user) |
| R16 — User: Reportes 1 sub-item only | T2, T3 | only "Cuadre del día" includes user | matrix trace (user) |
| R17 — Empty groups omitted | T3 | `filteredSubs.length === 0 → continue` | code inspection; lint/typecheck green |
| R18 — Single Settings path for admin | T5 | Settings only in Configuración group; no secondary Settings | matrix trace (admin) |
| R19 — No Settings for accountant/user | T2, T5 | Configuración `[admin]`; secondary has no Settings | matrix trace |
| R20 — No .filter() on secondary nav | T5 | `<NavSecondary items={navSecondary} …/>` direct | code inspection; grep shows no `.filter` |
| R21 — CircleUser icon for Mi cuenta | T5 | `icon: CircleUser` | code inspection |
| R22 — LifeBuoy/Send imports removed | T6 | import block updated | `git diff`; grep: no `LifeBuoy`/`Send`; lint green |
| R23 — "Parámetros" accent | T2, T9 | label `"Parámetros"` | grep: no "Parametros" |
| R24 — "Sincronizar Envíos RD" accent | T2, T9 | label `"Sincronizar Envíos RD"` | grep: no "Envios RD" |
| R25 — "Acciones rápidas" accent | T7 | group label `"Acciones rápidas"` | grep: no "Acciones rapidas" |
| R26 — "Cuadre del día" accent | T2, T8, T9 | nav + quick-action titles `"Cuadre del día"` | grep: no "Cuadre del dia" |
| R27 — All accents correct, no "Configuracion" | T9 | `"Configuración"`; full grep audit | grep: no "Configuracion" |
| R28 — NavMain prop shape unchanged | T3 | `filterNavForRole` strips `roles`; `NavItem` matches | typecheck green; `nav-main.tsx` unmodified |
| R29 — NavSecondary prop shape unchanged | T5 | inline `navSecondary` is `{title,url,icon}[]` | typecheck green; `nav-secondary.tsx` unmodified |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** the diff touches exactly one file, `src/components/ui/app-sidebar.tsx`, as design.md
  mandates. `git diff --name-only` confirms `nav-main.tsx`, `nav-secondary.tsx`, `can.ts`,
  `permissions.ts`, and `roles.ts` are untouched. The other files in the working tree's `git diff` were
  already dirty before this session (they are in the pre-session git-status snapshot) and are not part
  of this change. No drive-by refactor of unrelated code; the quick-actions JSX, header, and footer are
  byte-identical except the two accent fixes the spec requires.
- **Reversibility:** no public signature, route, serialized format, or on-disk state changed.
  `masterNav`, `filterNavForRole`, `NavRole`, `MasterNavItem`, `MasterSubItem`, `NavItem`, and
  `navSecondary` are all module-local — none is exported. Every route string in `masterNav` is identical
  to the pre-change routes (only labels gained accents); no navigation target moved. The change is a
  pure presentational consolidation, trivially reverted by `git revert`.
- **Blast radius:** contained to the sidebar. `AppSidebar` is the only consumer; `NavMain` and
  `NavSecondary` receive the same prop shapes as before, verified by a green typecheck against their
  unmodified prop types.
- **Proof proportional to blast radius:** the project has no unit runner (`reins.config.json` →
  `test: null`; CLAUDE.md forbids adding test infra), so the proportionate proof for a presentational,
  route-preserving change is typecheck + lint + the gate, plus the per-role matrix trace above and the
  grep audit. The change is reversible and route-preserving, so no reversibility artifact is owed.

### Readability — intent recoverable by the next cold agent
- Names match behavior: `masterNav` is the single source list; `filterNavForRole(items, role)` reads
  exactly as "give me the nav this role sees"; `resolvedRole` is the role the runtime checks resolved
  to; `MasterNavItem`/`MasterSubItem` carry the internal `roles` field, `NavItem` is the stripped output
  shape. No symbol drifts from its meaning.
- Non-obvious decisions captured: the comment on `NavRole` explains it maps the runtime auth checks onto
  the visibility sets; the comments on `MasterSubItem`/`filterNavForRole` flag that `roles` is internal
  and stripped before `NavMain`; the `navSecondary` comment explains why no runtime filter is needed
  (Settings moved to the admin Configuración group). The ESLint-driven decision to rebuild objects
  rather than rest-destructure is documented in Key decisions above.
- No dead code, commented-out blocks, or vestigial parameters: the old `data` object and the
  `.filter()` call are fully removed, not left commented. `import Image`, `Link`, and every still-used
  lucide icon remain live.
- New symbols' contracts are evident: `filterNavForRole`'s signature `(MasterNavItem[], NavRole) =>
  NavItem[]` plus its comment state inputs, the filtering/dropping rules, and the strip-roles output
  guarantee.

### Reliability — right answer for in-contract inputs
- **Finite enum coverage:** `NavRole` has exactly three values; the matrix trace above checks all three
  (admin, accountant, user) against the requirement's expected item/sub-item sets, including the
  discriminating cases — Fidelidad/Configuración absence for accountant, the four absent top-level items
  for user, and the user-only single-sub-item Reportes (R16).
- **Boundary classes of `filterNavForRole`:** an item whose `roles` excludes the role is dropped
  (`continue`); a group whose every sub-item excludes the role yields `filteredSubs.length === 0` and is
  dropped (R17); a leaf item (no `items`) is pushed with its `roles` stripped; a group with ≥1 surviving
  sub-item is pushed with `{ ...base, items }`. The `roles` field never appears on any returned object
  because each object is rebuilt from named properties only.
- **Determinism:** `masterNav` is a static literal and `filterNavForRole` iterates it in array order
  with no wall-clock, locale, timezone, or randomness, so output order is stable and matches the R3/R9/
  R13 "in order" requirements. A re-render is idempotent.
- **No unit test owed at runtime:** the project has no unit runner; correctness of each in-contract role
  is asserted statically by typecheck (shape conformance) and by the matrix trace. No test was weakened
  or deleted.

### Resilience — fails safe when the world breaks
- No external call, FS, network, subprocess, DB, or resource acquisition is introduced or changed —
  there is no new timeout, retry, cleanup, or atomic-write surface. The component reads
  `useAuthStore()`, `can()`, and `usePathname()` (all already in place) and does pure array/string work.
- No on-disk or shared-state mutation, so there is no atomicity or clean-restart concern; rendering is
  idempotent.
- **Garbage/partial-input guard:** `resolvedRole` is total over the auth state — if `user` is `null`/
  `undefined` or `user?.type` is any unexpected value, both `canManageSettings` and the `=== "ACCOUNTANT"`
  check fall through to `"user"`, the least-privileged view, so a malformed/missing user never throws and
  never over-exposes admin-only items. `filterNavForRole` returns `[]`-or-fewer items for any role and
  never indexes into a possibly-empty array unguarded.

## Verify output

```
$ npm run lint
> innvox-dashboard@0.1.0 lint
> eslint
EXIT: 0   (no errors, no warnings)

$ npm run typecheck
> innvox-dashboard@0.1.0 typecheck
> tsc --noEmit
EXIT: 0

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  8.3s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.5s
  ✓ design        17 advisory slop tell(s)  50ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  3ms
  ✓ traceability  every requirement maps to a task  4ms
Result: PASS
```

## Manual checks (T12–T15) — deferred

T12–T15 are live, auth-gated browser checks the implementer cannot exercise in this environment, so they
remain `[~]` (deferred) in `tasks.md` and are handed to the leader / design-reviewer. Each was verified
statically: the per-role matrix trace above confirms the exact top-level and sub-item sets for admin,
accountant, and user (including R16's single "Cuadre del día" for user and the single "Mi cuenta"
secondary entry for every role), and a grep audit confirms no unaccented label ("Parametros",
"Envios RD", "Cuadre del dia", "Configuracion", "Acciones rapidas") survives in the file.
