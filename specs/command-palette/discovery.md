# Discovery — command-palette

> Written by the **leader** from real exploration. Depends on `nav-cleanup`
> (reuses its single role-gated nav source). Stays `needs_clarification` until the
> human resolves the open questions.

## Request

A global Cmd/Ctrl+K command palette for fast cross-module navigation and quick
actions, role-aware, available on every dashboard page.

## Findings

- **No new dependency needed.** `cmdk@^1.1.1` is already installed and
  `src/components/ui/command.tsx` already exports the full shadcn palette:
  `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`,
  `CommandGroup`, `CommandSeparator`, `CommandItem`, `CommandShortcut`.
- **Cmd/Ctrl+K is free.** The sidebar's keyboard shortcut is `b`
  (`SIDEBAR_KEYBOARD_SHORTCUT = "b"`, `sidebar.tsx:33,100`) → Cmd/Ctrl+B toggles
  the sidebar. No existing Cmd+K listener.
- **Mount point:** `src/app/dashboard/layout.tsx` is a server component
  (`async`, `await requireAuth()`) wrapping `SidebarProvider` → `AppSidebar` +
  `SidebarInset` (header with `SidebarTrigger` + `DynamicBreadcrumb`, then
  `DashboardTopbar`, then `main`). A client `<CommandPalette/>` can mount in the
  layout (global) and/or a visible trigger button can sit in the header.
- **Nav source (the dependency):** `nav-cleanup` consolidates the three nav
  arrays into one role-gated `masterNav` + a `filterNavForRole` helper in
  `app-sidebar.tsx`. The palette should reuse that exact source so its entries
  stay in sync and respect role visibility. Today `data` is a private const —
  `nav-cleanup` (or this feature) must EXPORT the nav source / a shared nav
  module so the palette can import it.
- **Quick actions** already exist in `app-sidebar.tsx` (359–381): "Nuevo ingreso"
  (`/dashboard/transactions/incomes?new=1`), "Nuevo gasto"
  (`…/expenses?new=1`), "Cuadre del día". These are the natural palette actions.
- Navigation uses `next/navigation` `useRouter().push` / `Link`.

## Affected areas

- New `src/components/dashboard/command-palette.tsx` (client) — the palette + the
  Cmd/Ctrl+K listener.
- `src/app/dashboard/layout.tsx` (or `dashboard-topbar.tsx`) — mount the palette;
  optional visible trigger in the header.
- `app-sidebar.tsx` / a shared nav module — export the role-gated nav source
  (coordinated with `nav-cleanup`).

## Approaches considered

- **Reuse the nav source (leaning toward):** build entries from `nav-cleanup`'s
  `masterNav` + `filterNavForRole(role)` so the palette mirrors the sidebar
  exactly (same items, same role gating). One source of truth.
- **Hardcode a separate route list:** faster but drifts from the sidebar — exactly
  the duplication `nav-cleanup` just removed. Rejected.

## Open questions ← a human must answer these

1. **Entry scope:** navigation (all role-visible routes/sub-routes) + the existing
   quick actions only (static, no data) — or ALSO live record search (jump to a
   specific client / invoice / bank account by name, which needs data fetching)?
   Recommendation: nav + quick actions for this feature; record search is a larger
   follow-up.
2. **Visible trigger:** add a visible "Buscar… ⌘K" button in the dashboard header
   (discoverable) in addition to the keyboard shortcut, or keyboard-only?
   Recommendation: visible trigger in the header.
3. **Extra command groups:** include account/session actions as commands —
   "Mi cuenta", "Cerrar sesión", and a theme toggle (if one exists) — or keep the
   palette to navigation + the three quick actions only? Recommendation: include
   "Mi cuenta" + "Cerrar sesión" (wire to the existing nav-user logout); add the
   theme toggle only if a theme switcher already exists.

## Assumptions

- Shortcut: Cmd/Ctrl+K toggles the palette; Esc closes; selecting an item routes
  and closes. Cmd/Ctrl+B (sidebar) is untouched.
- Role gating reuses `filterNavForRole` so a USER never sees an admin-only route
  in the palette (parity with the sidebar).
- Grouped results: "Ir a" (navigation) and "Acciones rápidas" (+ "Cuenta" per
  Q3). `CommandEmpty` shows "Sin resultados".
- Palette mounts once globally in the dashboard layout; no per-page wiring.
- No data-layer changes (pending Q1 — record search would add reads).

## Resolution ← filled in after the human answers

- **Q1 → Navigation + quick actions only.** Static entries (role-visible routes +
  the 3 quick actions). No live record search this feature (follow-up).
- **Q2 → Visible "Buscar… ⌘K" trigger in the dashboard header**, plus the
  Cmd/Ctrl+K shortcut.
- **Q3 → Include account/session commands:** "Mi cuenta" (→ `/dashboard/account`),
  "Cerrar sesión" (→ `signOut({ callbackUrl: "/login" })`), and "Alternar tema"
  (theme toggle). All three exist:
  - logout: `signOut` from `next-auth/react` (pattern in `nav-user.tsx:35`).
  - theme: `next-themes` is installed; `src/components/ui/theme-toggle.tsx` uses
    `setTheme` — reuse `useTheme()` for the command.

### Palette structure

- Mount one client `<CommandPalette/>` globally (dashboard layout). Listen for
  Cmd/Ctrl+K to toggle; Esc closes; selecting routes (or runs the action) and
  closes. Do not disturb Cmd/Ctrl+B (sidebar).
- A visible header trigger ("Buscar… ⌘K") opens the same palette — place it in
  the header (`layout.tsx`) near the `SidebarTrigger`/breadcrumb, or in
  `dashboard-topbar.tsx`.
- Groups via `CommandGroup`:
  1. **"Ir a"** — every role-visible nav route/sub-route, derived from
     `nav-cleanup`'s `masterNav` + `filterNavForRole(role)` (reuse, do not
     hardcode). Flatten groups → leaf routes with their labels/icons.
  2. **"Acciones rápidas"** — Nuevo ingreso (`…/incomes?new=1`), Nuevo gasto
     (`…/expenses?new=1`), Cuadre del día (`…/reports/cuadre-del-dia`).
  3. **"Cuenta"** — Mi cuenta, Cerrar sesión, Alternar tema.
- `CommandEmpty` → "Sin resultados". `CommandShortcut` may show ⌘K on the trigger.

### Integration with nav-cleanup

`nav-cleanup` must EXPORT its role-gated nav source (`masterNav` +
`filterNavForRole`) — or move it to a shared nav module — so the palette imports
it. If that export isn't already in place when this feature is implemented, add it
here (it's the single source of truth for both sidebar and palette).

- **Decision:** New client `<CommandPalette/>` mounted globally + a visible header
  trigger; Cmd/Ctrl+K; role-aware entries reused from `nav-cleanup`'s nav source;
  three groups (Ir a / Acciones rápidas / Cuenta) including logout + theme toggle.
  No new dependency, no data-layer changes.
