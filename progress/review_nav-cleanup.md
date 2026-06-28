# Review — nav-cleanup
Verdict: APPROVED

## Checkpoints

- C1: [x] `reins doctor` reports HEALTHY — all 15 core files present, all agent definitions wired.
- C2: [x] Exactly one feature `in_progress` (`nav-cleanup`); all states valid per `npx reins verify --only feature-list`.
- C3: [x] `npx reins verify --only lint` / `npm run lint` exits 0, no errors, no warnings.
- C4: [x] `reins.config.json` sets `test: null`; CLAUDE.md forbids adding test infrastructure. Unit gate skips (`∘`). Correctness is covered by the typecheck gate (C3 overlap), the per-role matrix trace in `impl_nav-cleanup.md`, and the grep accent audit — proportionate to the blast radius of a single presentational file with no public exports. No test was weakened or deleted.
- C5: [x] `npx reins verify --only security` passes — no vulnerabilities >= high, no secrets found.
- C6: [x] `npx reins verify --only design` passes at block threshold (21 advisory tells, zero block). Design-reviewer handles qualitative depth; this checkpoint is mechanically green.
- C7: [x] `npx reins verify --only traceability` passes — every R1–R29 maps to at least one task, confirmed in `tasks.md` traceability table.
- C8: [x] Implementation verified against spec line-by-line (detail below). All 29 requirements satisfied.
- C9: [ ] `progress/history.md` does NOT contain a nav-cleanup entry yet (the session's autopilot run closed at `motion-polish`; `current.md` shows `(none)` in-progress). History update is pending the leader's session-close step, not the implementer's obligation at hand-off time. Advisory only — the work is done and the file is not corrupt.

## Specification verification (C8 detail)

### R1 — Single master nav
Verified: `masterNav` at line 73 replaces all three old arrays. No `data` object remains (comment at line 72 is the only reference to the removed names). PASS.

### R2 — Role resolution unchanged
Lines 208–212: `canManageSettings ? "admin" : user?.type === "ACCOUNTANT" ? "accountant" : "user"`. Precedence mirrors the old ternary exactly. PASS.

### R3–R8 — Admin visibility matrix
All 10 top-level items present in `masterNav` with `"admin"` in their `roles` arrays. Sub-item counts: Transacciones 6 (line 86–91), Fidelidad 2 (line 127–128), Reportes 3 (line 136–138), Parámetros 2 (line 146–147), Configuración 3 (line 155–157). PASS.

### R9–R12 — Accountant visibility matrix
Fidelidad carries `["admin", "user"]` (line 125) — excludes accountant. Configuración carries `["admin"]` (line 153) — excludes accountant. Remaining 8 items all include `"accountant"`. Reportes 3 sub-items all include `"accountant"`. Parámetros 2 sub-items include `"accountant"`. PASS.

### R13–R16 — User visibility matrix
Cuentas financieras `["admin","accountant"]` (line 113), Costos operativos `["admin","accountant"]` (line 120), Parámetros `["admin","accountant"]` (line 144), Configuración `["admin"]` (line 153) — all exclude user. Reportes sub-items: Utilidades `["admin","accountant"]` (line 136), Cuadre del día `["admin","accountant","user"]` (line 137), Formulario DGII `["admin","accountant"]` (line 138) — user sees exactly one sub-item (R16). PASS.

### R17 — Empty groups omitted
`filterNavForRole` line 193: `if (filteredSubs.length === 0) continue;` — confirmed in code. No current matrix combination actually zeroes out a group for the three roles, but the guard is in place and correct. PASS.

### R18–R20 — Single Settings path / no secondary filter
Line 300: `<NavSecondary items={navSecondary} className="mt-auto" />` — no `.filter()` call. `navSecondary` is the module-scope inline constant (lines 201–203) with only "Mi cuenta". The only `.filter()` in the file is inside `filterNavForRole` on sub-items (line 191), which is correct. PASS.

### R21 — CircleUser for Mi cuenta
Line 202: `icon: CircleUser`. PASS.

### R22 — LifeBuoy/Send imports removed
Diff confirms `LifeBuoy` and `Send` removed from lucide import block; grep returns no matches in the current file. PASS.

### R23–R27 — Accent normalization
Grep for "Parametros", "Envios", "Cuadre del dia", "Configuracion", "Acciones rapidas" returns zero hits. Correct accented forms present: "Parámetros" (line 142), "Sincronizar Envíos RD" (line 91), "Cuadre del día" (lines 137, 229), "Acciones rápidas" (line 268), "Configuración" (line 151). PASS.

### R28 — NavMain prop shape
`filterNavForRole` returns `NavItem[]` (interface at lines 163–169: `title, url?, icon, isActive?, items?:{title,url}[]`). Each object is built explicitly, stripping `roles`. Typecheck exits 0 against unmodified `nav-main.tsx`. PASS.

### R29 — NavSecondary prop shape
Inline `navSecondary` is `{title: string, url: string, icon: LucideIcon}[]` — matches `NavSecondary`'s prop type. Typecheck exits 0 against unmodified `nav-secondary.tsx`. PASS.

### Scope
`git diff --name-only` includes `app-sidebar.tsx` among other files modified in the working tree **before this session** (confirmed by the pre-session `git status` snapshot in the task). The spec's design.md mandates only `app-sidebar.tsx`. `nav-main.tsx` and `nav-secondary.tsx` are unmodified (confirmed: `git diff HEAD -- src/components/ui/nav-main.tsx nav-secondary.tsx` returns no output). PASS.

### Documented deviation — property-by-property rebuild vs rest-destructuring
The implementer elected to rebuild objects explicitly (`{ title, url, icon, isActive }`) rather than rest-destructure (`{ roles: _roles, ...rest }`) to avoid two `@typescript-eslint/no-unused-vars` warnings. The output shape and filtering semantics are identical to the design sketch. The rationale is documented in `progress/impl_nav-cleanup.md` under "Key decisions". Functionally equivalent; acceptable.

## Judgment (Four R's)

### Risk
- **Scope fidelity:** the diff is entirely confined to `src/components/ui/app-sidebar.tsx`. Other modified files in the working tree (`globals.css`, `payables/page.tsx`, etc.) are pre-existing dirty files from prior sessions — confirmed by the pre-session `git status` snapshot. No drive-by changes bundled. [advisory — informational only, no defect]
- **Reversibility:** no public export, route string, serialized format, or on-disk state was changed. `masterNav`, `filterNavForRole`, `NavRole`, `NavItem`, and `navSecondary` are all module-local. Every route URL in `masterNav` is identical to the pre-change routes. The change is trivially `git revert`-able. No reversibility artifact required.
- **Blast radius vs proof:** the sidebar is consumed by one component (`AppSidebar`); `NavMain`/`NavSecondary` receive the same prop shapes. Proof (typecheck + lint + matrix trace + grep) is proportionate for a presentational, route-preserving consolidation in a project with `test: null`. Claim checks out against the diff.

### Readability
- `masterNav`, `filterNavForRole`, `resolvedRole`, `MasterNavItem`, `MasterSubItem`, `NavItem` — all names match their behavior after the change. No drift detected.
- The non-obvious decisions (property-by-property rebuild rationale, `url: undefined` / `isActive: undefined` on group items being type-compatible, `type IconType` union kept for future-proofing) are documented in `impl_nav-cleanup.md` "Key decisions" — not in-code comments, but the doc is the designated place for implementer rationale per the Four R's contract. In-code comments at lines 48–53, 162–173, 199–200 cover the internal/stripping semantics. Adequate.
- No dead code or commented-out blocks remain; the old `data` object and runtime `.filter()` are fully removed.
- `filterNavForRole`'s contract (inputs, filtering rules, strip-roles output) is evident from its signature, comment, and `NavItem` interface.

### Reliability
- **Finite enum coverage:** all three `NavRole` values traced against the visibility matrix; every discriminating case (Fidelidad absent for accountant, four items absent for user, Reportes single sub-item for user per R16) confirmed correct in the diff.
- **Boundary of `filterNavForRole`:** empty top-level list → returns `[]`; item excluded by role → `continue`; group with zero surviving sub-items → `continue` (R17); leaf item → pushed without `items`; group with sub-items → pushed with filtered `items`. All cases covered.
- **Determinism:** static `masterNav`, pure array iteration, no wall-clock/locale/randomness. Output order is stable and matches the "in order" requirements (R3, R9, R13).
- No unit test exists (project has `test: null`) — the implementer's claim that "no test was weakened or deleted" is accurate and the traceability gate is green. No regression introduced.

### Resilience
- No new external call, network, DB, FS, subprocess, or resource acquisition. Resilience surface is zero — the change is pure synchronous array/string computation inside a React component.
- `resolvedRole` is total over auth state: `null`/`undefined` user and any unexpected `user.type` all fall through to `"user"` (least-privileged), so no throw and no over-exposure. Claim verified at lines 208–212.
- `filterNavForRole` never indexes into an array without first filtering — no unguarded access.

## Changes required

None.
