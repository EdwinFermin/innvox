# Implementation — command-palette

## Summary

Added a global Cmd/Ctrl+K command palette to the dashboard. A new client component
`src/components/dashboard/command-palette.tsx` exports `CommandPalette` (the dialog + keyboard
listener) and `CommandPaletteTrigger` (the header button). The palette renders three groups in
order — "Ir a", "Acciones rápidas", "Cuenta" — separated by `CommandSeparator`, all composed from
the existing `command.tsx` primitives (cmdk) with no new dependency (R22). The "Ir a" group is
derived from the single role-gated nav source (`masterNav` + `filterNavForRole`) that `nav-cleanup`
established, so the palette and the sidebar can never drift.

The dependency `nav-cleanup` had already rewritten `app-sidebar.tsx` into `masterNav` /
`filterNavForRole` / `NavRole` but left them as module-scope symbols (no `export`). This feature's
only change to that file is adding the `export` keyword to those three symbols (T1, R23) plus a
one-line comment update on `NavRole` because the old comment ("never exported") now lies. No logic
in `app-sidebar.tsx` changed.

`src/app/dashboard/layout.tsx` (a server component) mounts `<CommandPalette />` once inside
`SidebarInset` before `<header>`, and places `<CommandPaletteTrigger />` in the header `div` after
`SidebarTrigger` + `Separator`, before the breadcrumb `div` (T3, R6, R9). A single global mount
covers every `/dashboard` route with no per-page wiring.

## Files changed

| File | Task → Requirement | Change |
| --- | --- | --- |
| `src/components/ui/app-sidebar.tsx` | T1 → R23 | Added `export` to `type NavRole`, `const masterNav`, and `function filterNavForRole`. Updated the `NavRole` comment (was "never exported") to state it is now exported for the palette. **No logic change** — verified by diffing against the pre-session (nav-cleanup) file: the only line changes are the three `export` keywords + that comment. |
| `src/components/dashboard/command-palette.tsx` | T2 → R1–R8, R10–R22 | **New.** `"use client"` module. Module-scoped external store (open boolean) subscribed via `useSyncExternalStore`; `CommandPalette` (keydown listener + `CommandDialog` + three groups); `CommandPaletteTrigger` (header `Button`). |
| `src/app/dashboard/layout.tsx` | T3 → R6, R9 | Imported `CommandPalette` + `CommandPaletteTrigger`; mounted `<CommandPalette />` inside `SidebarInset` before `<header>`; inserted `<CommandPaletteTrigger />` after `SidebarTrigger` + `Separator`, before the breadcrumb `div`. |

`git status` confirms exactly these three files (`M layout.tsx`, `M app-sidebar.tsx`, `??
command-palette.tsx`). `package.json` / `package-lock.json` are **unchanged** (R22).

## Key decisions

### Shared open-state seam — module-scoped external store via `useSyncExternalStore` (approach a)

**Why not the design.md sketch (React context provided by `CommandPalette`).** In `layout.tsx`,
`<CommandPalette />` and `<CommandPaletteTrigger />` are mounted as **siblings**, not parent/child
(`CommandPalette` sits before `<header>`; the trigger sits inside the header `div`). A context
provider that wraps only the dialog inside `CommandPalette` would never reach a sibling trigger, so
the sketch's "context provided by CommandPalette, consumed by the trigger" cannot share state across
this mount layout. Wrapping the whole subtree in a provider would mean introducing a provider in the
server layout and changing the tree shape — more churn than needed.

**Chosen seam.** A single module-scoped store object (a closure over one `open` boolean with a
`Set<listener>`, `subscribe`, `getSnapshot`, and `set`) lives at the top of `command-palette.tsx`.
Both `CommandPalette` and `CommandPaletteTrigger` call the same `useCommandPaletteOpen()` hook,
which subscribes to that singleton via `React.useSyncExternalStore`. Because the store is a single
module-level singleton, *both siblings read and write the exact same state* regardless of where they
sit in the tree — opening via the keyboard is reflected by the trigger and vice-versa. There is no
second `useState`. `useSyncExternalStore`'s third argument (server snapshot) returns `false`, so SSR
renders the palette closed and hydration is consistent. No new npm dependency — `useSyncExternalStore`
is a built-in React 18 hook (R22).

`paletteStore.set` accepts `boolean | (prev) => boolean` (mirroring `setOpen`) and no-ops when the
value is unchanged, so a redundant notify never fires.

### Role resolution mirrors `AppSidebar` exactly

`resolvedRole` is computed with the same precedence `AppSidebar` uses: `can(user?.type,
PERMISSIONS.settingsManage)` → `"admin"`; else `user?.type === "ACCOUNTANT"` → `"accountant"`; else
`"user"`. This guarantees the palette's "Ir a" group shows the same role-gated routes the sidebar
shows (no drift), and a missing/garbage `user` falls through to `"user"` (least-privileged), so the
palette never over-exposes admin-only routes.

### "Ir a" flattening + `searchValue`

`flattenNav(role)` calls `filterNavForRole(masterNav, role)` (the same helper the sidebar consumes)
and flattens its output: a **leaf** node (has `url`) becomes one `CommandItem`; a **group** node (has
`items`) becomes one `CommandItem` per sub-item, each carrying the parent's icon. The cmdk `value`
prop (`searchValue`) for a sub-item is `"<parent title> <sub title>"` (e.g. `"Reportes Cuadre del
día"`), so typing the parent group name surfaces its children in the filtered list. Leaf entries use
their own title as `searchValue`. The list is memoized on `resolvedRole`. Iteration is in `masterNav`
array order, so the group ordering is stable and deterministic.

### Theme cycle for "Alternar tema"

A static `THEME_CYCLE` map (`light→dark`, `dark→system`, `system→light`) reads the current
`useTheme().theme` and advances one step via `setTheme`. An undefined/unknown current theme falls
back to `"light"`, keeping the action total. `SunMoon` is the icon (a stable single icon that reads
as "theme", avoiding a per-state icon swap that would complicate the static command list).

### Verification approach — static / no test runner

The project has no unit runner (`reins.config.json` → `test: null`; CLAUDE.md forbids adding test
infra), and the dashboard is auth-gated so the live browser checks T4–T18 cannot be exercised in this
environment. Per the established `nav-cleanup` pattern, T4–T18 are marked `[~]` (deferred to live
browser) in `tasks.md` and verified **statically** against the code: the keydown/text-field/Escape
behavior is read directly from the listener; the per-role "Ir a" sets are traced from `masterNav`
(below); the group order, copy, and three static actions are read from the JSX. The mechanical gates
(lint / typecheck / build / `reins verify`) all pass.

### Per-role "Ir a" trace (static verification of R13–R16)

- **admin** → all 21 leaf entries (every `masterNav` item/sub-item includes `"admin"`): Dashboard,
  Ingresos, Gastos, Cuentas por cobrar, Cuentas por pagar, Link de pago, Sincronizar Envíos RD,
  Facturación, Clientes, Cuentas financieras, Costos operativos, Tarjetas, Scanner, Utilidades,
  Cuadre del día, Formulario DGII, Tipos de ingresos, Tipos de gastos, General, Usuarios,
  Sucursales. (R15) ✓
- **accountant** → Fidelidad (`[admin,user]`) and Configuración (`[admin]`) drop; Cuentas
  financieras, Costos operativos, and all Reportes/Parámetros sub-items remain. Excludes
  Tarjetas/Scanner and General/Usuarios/Sucursales. (R16) ✓
- **user** → drops Cuentas financieras + Costos operativos (`[admin,accountant]`), Parámetros
  (`[admin,accountant]`), Configuración (`[admin]`), and within Reportes keeps only "Cuadre del día"
  (Utilidades + Formulario DGII are `[admin,accountant]`). Absent set matches R14 exactly:
  Configuración, Usuarios, Sucursales, Tipos de ingresos, Tipos de gastos, Formulario DGII,
  Utilidades, Cuentas financieras, Costos operativos. (R14) ✓

## Requirement → coverage (traceability) table

| Requirement | Task(s) | Implemented in | Verified by |
| --- | --- | --- | --- |
| R1 — Cmd/Ctrl+K opens when closed | T2 | keydown listener `setOpen((p)=>!p)` | code inspection (T4, static); build green |
| R2 — Cmd/Ctrl+K closes when open | T2 | same toggle | code inspection (T4, static) |
| R3 — No interference with Cmd/Ctrl+B | T2 | listener checks `"k"` only; never `"b"` | code inspection (T6, static); sidebar listener untouched |
| R4 — No open when typing in a text field | T2 | `isTextField && !open → return` guard | code inspection (T7, static) |
| R5 — Esc closes | T2 | `CommandDialog` (Radix Dialog) built-in | code inspection (T5, static) |
| R6 — Visible "Buscar… ⌘K" header button | T2, T3 | `CommandPaletteTrigger` in header div | code inspection (T8, static); build green |
| R7 — Header button opens/closes | T2 | trigger `onClick={()=>setOpen((p)=>!p)}` | code inspection (T8, static) |
| R8 — Single shared open-state source | T2 | module-scoped store via `useSyncExternalStore` (one singleton, both siblings) | code inspection (T8, static); key-decision rationale |
| R9 — Single global mount, all dashboard pages | T3 | one `<CommandPalette />` in dashboard `layout.tsx` | build green (T21); code inspection (T18, static) |
| R10 — Three CommandGroups in order + separators | T2 | "Ir a" / sep / "Acciones rápidas" / sep / "Cuenta" | code inspection (T10, static) |
| R11 — CommandInput filters all groups | T2 | single `CommandInput` over `CommandList` | code inspection (T10, static) |
| R12 — CommandEmpty "Sin resultados" | T2 | `<CommandEmpty>Sin resultados</CommandEmpty>` | code inspection (T9, static) |
| R13 — "Ir a" from filterNavForRole, flattened | T2 | `flattenNav(resolvedRole)` over `filterNavForRole(masterNav,…)` | per-role trace (T11–T13, static) |
| R14 — USER excludes admin-only routes | T2 | role gating in `masterNav` + filter | per-role trace (user) |
| R15 — ADMIN sees all routes | T2 | all items include `"admin"` | per-role trace (admin) |
| R16 — ACCOUNTANT sees accountant routes | T2 | role gating in `masterNav` + filter | per-role trace (accountant) |
| R17 — "Acciones rápidas" three static entries | T2 | three hardcoded `CommandItem`s + URLs | code inspection (T14, static) |
| R18 — "Cuenta" three entries | T2 | Mi cuenta / Cerrar sesión / Alternar tema | code inspection (T15–T17, static) |
| R19 — Select navigates + closes | T2 | `go(url)` = `router.push(url)` + `setOpen(false)` | code inspection (T14, T15, static) |
| R20 — "Cerrar sesión" → signOut + close | T2 | `signOut({callbackUrl:"/login"})` + `setOpen(false)` | code inspection (T16, static); matches `nav-user.tsx` |
| R21 — "Alternar tema" cycles + close | T2 | `THEME_CYCLE` + `setTheme` + `setOpen(false)` | code inspection (T17, static) |
| R22 — No new npm dependencies | T2 | only cmdk/next-auth/next-themes/next/lucide; `useSyncExternalStore` is built-in React | `package.json`/`lock` unchanged (T19–T21); lint/typecheck/build green |
| R23 — masterNav + filterNavForRole exported | T1 | `export` added to three symbols | typecheck green; isolated diff = export keywords only |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope.** The diff touches exactly the three files named in design.md and the task brief:
  `command-palette.tsx` (new), `app-sidebar.tsx` (export keywords only), `layout.tsx` (mount +
  trigger). `git status --porcelain` for these three confirms nothing else in scope changed; the
  other dirty files in the working tree pre-date this session (pre-session git-status snapshot) and
  belong to prior features.
- **`app-sidebar.tsx` is export-keyword-only.** I reconstructed the pre-session (nav-cleanup) version
  of the file and diffed it against the current file: the only changes are `export` on `NavRole` /
  `masterNav` / `filterNavForRole` plus the corrected `NavRole` comment. No nav array, route, role
  set, or filter logic changed. Adding an `export` *widens* a contract (a pure addition), so no
  version bump / migration is owed.
- **Reversibility.** No route, serialized format, or on-disk state changed. The new component is
  additive; removing it and reverting three small edits fully undoes the feature (`git revert`-able).
  No `progress/history.md` rewrite — this report is a new file.
- **Proof proportional to blast radius.** The palette is presentational and route-preserving (it
  navigates to existing routes via `router.push`). With no unit runner available, the proportionate
  proof is lint + typecheck + build + `reins verify` (all green) plus the per-role static trace and
  the isolated `app-sidebar.tsx` diff. No high-reach or irreversible path ships unproven.

### Readability — intent recoverable by the next cold agent
- **Names match behavior.** `paletteStore`, `useCommandPaletteOpen`, `flattenNav`, `FlatNavEntry`,
  `searchValue`, `resolvedRole`, `THEME_CYCLE`, `go` each read as exactly what they do. The
  `NavRole` comment in `app-sidebar.tsx` was updated because the prior "never exported" wording would
  otherwise lie after this change (Readability's "rename on behavior drift" condition).
- **Non-obvious decisions have a why.** The biggest one — the sibling-mount seam — is documented both
  in a block comment above `paletteStore` and in Key decisions. The `"k"`-only listener comment
  states why `"b"` is left alone (R3). The `searchValue` comment explains the parent-title prefix.
  The `THEME_CYCLE` comment states the cycle order.
- **No dead code / vestigial params.** No commented-out blocks; every import is used; the listener
  cleanup removes its handler.
- **New public contracts evident.** `CommandPalette` / `CommandPaletteTrigger` take no props and
  their roles are obvious from name + the report; `FlatNavEntry`'s fields are self-describing.

### Reliability — right answer for in-contract inputs
- **Finite enum coverage.** `NavRole` has exactly three values; the per-role trace checks all three
  against the requirement's expected "Ir a" sets, including the discriminating cases (Fidelidad/
  Configuración drop for accountant; the four dropped top-level items + single-sub-item Reportes for
  user — R16/R14).
- **Boundary inputs.** `resolvedRole` is total: `user` null/undefined or any unexpected `user.type`
  falls through to `"user"` (least-privileged), never throwing and never over-exposing. `flattenNav`
  handles a group with `items` absent via `item.items ?? []` (empty → zero entries, no crash);
  `filterNavForRole` already drops zero-sub-item groups. `THEME_CYCLE[theme ?? "system"] ?? "light"`
  is total over any `theme` string. cmdk's filter with an empty query shows all items and with a
  non-matching query shows `CommandEmpty` (R12).
- **Determinism.** `masterNav` is a static literal iterated in array order; no wall-clock, locale, or
  randomness — group/item order is stable (R10's "in order"). Re-render is idempotent; the store
  `set` no-ops on an unchanged value.
- **No test weakened/deleted.** None exist to weaken; correctness is asserted statically by typecheck
  (shape conformance) + the per-role trace + the mechanical gates.

### Resilience — fails safe when the world breaks
- **No new external I/O on a hot path.** The palette does pure local work (array/string flatten,
  store read/write, `router.push`). `signOut()` is next-auth's own call (same usage as
  `nav-user.tsx:35`); it is fired via `void` and the palette closes immediately regardless of its
  promise, so a slow/failed sign-out cannot hang the palette.
- **Listener cleanup.** The keydown effect removes its `window` listener on unmount/dependency change
  (`return () => window.removeEventListener(...)`), so no handler leaks across navigations.
- **No shared on-disk state.** The open boolean is in-memory module state; there is nothing to write
  atomically and nothing to corrupt on a crash. A re-mount starts closed (server snapshot `false`),
  so an interrupted session resumes cleanly with no double-apply.
- **Garbage/partial guards.** `item.items ?? []`, `theme ?? "system"`, and the `resolvedRole`
  fall-through guard the component against missing/partial auth or theme state — none indexes into a
  possibly-undefined shape unguarded.

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

$ npm run build
✓ Compiled successfully in 4.7s
EXIT: 0

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  8.2s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.2s
  ✓ design        12 advisory slop tell(s)  (none in this feature's files)  50ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  1ms
  ✓ traceability  every requirement maps to a task  4ms
Result: PASS
```

`git status` confirms `package.json` / `package-lock.json` UNCHANGED (R22). Feature file count: **3**
(`command-palette.tsx` new, `app-sidebar.tsx` export-keywords-only, `layout.tsx` mount).

## Design pre-flight (UI-touching)

- **Brief inferred / system reused.** The palette composes only existing primitives — `CommandDialog`
  / `CommandInput` / `CommandList` / `CommandEmpty` / `CommandGroup` / `CommandItem` /
  `CommandSeparator` / `CommandShortcut` from `command.tsx`, and the `Button` (`variant="outline"
  size="sm"`). The trigger uses themed tokens (`text-muted-foreground`), real lucide icons, and the
  `hidden sm:inline` responsive pattern already used across the header.
- **Real copy, Spanish.** "Buscar comando…", "Sin resultados", "Ir a", "Acciones rápidas", "Cuenta",
  "Nuevo ingreso", "Nuevo gasto", "Cuadre del día", "Mi cuenta", "Cerrar sesión", "Alternar tema",
  "Buscar…". No placeholder/Lorem.
- **States.** Populated (role-filtered items), empty (`CommandEmpty`), and the searching/filtering
  state are all covered by cmdk + `CommandEmpty`. No loading/error surface applies (purely local
  data).
- **Dark mode.** Every surface uses themed tokens (`bg-popover`, `text-popover-foreground`,
  `text-muted-foreground`, `data-[selected=true]:bg-accent`); no hardcoded light-only colors.
- **A11y / motion.** Dialog is keyboard-operable with managed focus and `aria` labelling from
  `CommandDialog`; items have a `data-[selected=true]` focus/selected state; the trigger is a real
  `<button>` with an accessible icon + text. No new animation introduced (Radix Dialog's existing
  enter/exit is reused). **Slop-tells walk:** none present — no gradient text, no side-stripe, no
  generic palette, no hero, no emoji icons, no default glassmorphism, no off-scale `[…px]` spacing,
  no `hover:scale-*`, no placeholder content (grep over the new file confirms zero matches). The 12
  advisory slop tells from the design scan are pre-existing in other files, not this feature's.

## Manual checks (T4–T18) — deferred to live browser

T4–T18 are live, auth-gated browser checks the implementer cannot exercise in this environment, so
they remain `[~]` (deferred) in `tasks.md` and are handed to the leader / design-reviewer. Each was
verified statically as recorded in the traceability table and the per-role trace above.

## Post-review revision

The functional and security reviews approved. The design review found two issues in
`command-palette.tsx`; both are fixed (diff confined to that one file):

- **FIX 1 [BLOCKING — a11y, accessible name].** `CommandPaletteTrigger`'s visible "Buscar…" label is
  `<span className="hidden sm:inline">`, so below the `sm` breakpoint it is `display:none` (removed
  from the a11y tree) and the button becomes icon-only (`SearchIcon`) with no accessible name — a
  screen reader announces only "button". Added `aria-label="Buscar (⌘K)"` to the `<Button>` so it
  has an accessible name at every breakpoint; the visible desktop text span is unchanged. A comment
  on the attribute records why. (Strengthens R6's "visible header trigger" with a name a11y users
  can hear.)
- **FIX 2 [Advisory — Spanish sr-only dialog metadata].** `CommandDialog` was falling back to its
  English defaults ("Command Palette" / "Search for a command to run…") for the sr-only
  `DialogTitle`/`DialogDescription`. Passed Spanish props — `title="Paleta de comandos"` and
  `description="Busca un comando para ejecutar"`. Confirmed `command.tsx`'s `CommandDialog` accepts
  `title`/`description` props (it does — they default to the English strings). Matches the app's
  Spanish UI voice.

Post-fix gates (all exit 0): `npm run lint` → 0; `npm run typecheck` → 0; `npm run build` →
Compiled successfully in 5.0s, exit 0. Diff still confined to the same 3 feature files;
`package.json` / `package-lock.json` remain unchanged. Live browser re-verification of the screen
reader announcement (T8) remains a deferred auth-gated check.
