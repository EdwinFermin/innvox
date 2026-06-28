# Requirements — command-palette

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.
> Dependency: this feature must be implemented after `nav-cleanup` so that `masterNav` and `filterNavForRole` are already exported.

---

## Keyboard shortcut

### R1

WHEN a user presses Cmd+K (macOS) or Ctrl+K (non-macOS) anywhere on a dashboard page and the command palette is closed, the system SHALL open the command palette dialog.

### R2

WHEN a user presses Cmd+K (macOS) or Ctrl+K (non-macOS) anywhere on a dashboard page and the command palette is already open, the system SHALL close the command palette dialog.

### R3

WHEN the Cmd/Ctrl+K keyboard event fires, the system SHALL NOT interfere with the Cmd/Ctrl+B sidebar-toggle shortcut (the sidebar shortcut SHALL remain functional after the palette mounts).

### R4

WHEN the keyboard event target is an `<input>`, `<textarea>`, or `[contenteditable]` element other than the palette's own search input, the system SHALL NOT open or toggle the palette.

### R5

WHEN the command palette is open and the user presses Escape, the system SHALL close the palette.

---

## Visible header trigger

### R6

WHILE the user is on any dashboard page, the system SHALL display a visible "Buscar… ⌘K" button in the dashboard header (adjacent to the `SidebarTrigger`).

### R7

WHEN the user clicks the "Buscar… ⌘K" header button, the system SHALL open the command palette dialog if it is closed, and close it if it is open.

### R8

The header trigger and the keyboard shortcut SHALL share a single open-state source so that opening via one method is reflected by the other without duplication of state.

---

## Global mount

### R9

WHEN a user navigates to any page within the `/dashboard` route tree, the system SHALL mount the command palette exactly once (no per-page wiring required).

---

## Palette structure and groups

### R10

WHEN the command palette is open, the system SHALL render three `CommandGroup` sections in order: "Ir a", "Acciones rápidas", and "Cuenta", separated by `CommandSeparator` elements.

### R11

WHEN the command palette is open, the system SHALL render a `CommandInput` at the top that filters all groups simultaneously as the user types.

### R12

WHEN the command palette search input has a value that matches no item across all groups, the system SHALL display the text "Sin resultados" via `CommandEmpty`.

---

## Group: "Ir a" (navigation)

### R13

WHEN the command palette is open, the "Ir a" group SHALL contain every role-visible leaf route derived from `masterNav` via `filterNavForRole(masterNav, resolvedRole)`, flattened so that each sub-item becomes a top-level palette entry with its parent group's label included for searchability.

### R14

WHEN the authenticated user's resolved role is `"user"`, the "Ir a" group SHALL NOT display any route whose `roles` array in `masterNav` does not include `"user"` (e.g., Configuración, Usuarios, Sucursales, Formulario DGII, Utilidades, Cuentas financieras, Costos operativos, Tipos de ingresos, Tipos de gastos).

### R15

WHEN the authenticated user's resolved role is `"admin"`, the "Ir a" group SHALL display all routes present in `masterNav`.

### R16

WHEN the authenticated user's resolved role is `"accountant"`, the "Ir a" group SHALL display exactly the routes whose `roles` array in `masterNav` includes `"accountant"`.

---

## Group: "Acciones rápidas"

### R17

WHEN the command palette is open, the "Acciones rápidas" group SHALL contain exactly three static entries:
- "Nuevo ingreso" — navigates to `/dashboard/transactions/incomes?new=1`
- "Nuevo gasto" — navigates to `/dashboard/transactions/expenses?new=1`
- "Cuadre del día" — navigates to `/dashboard/reports/cuadre-del-dia`

---

## Group: "Cuenta"

### R18

WHEN the command palette is open, the "Cuenta" group SHALL contain exactly three entries:
- "Mi cuenta" — navigates to `/dashboard/account`
- "Cerrar sesión" — calls `signOut({ callbackUrl: "/login" })`
- "Alternar tema" — cycles the application theme using `useTheme().setTheme` (next-themes)

---

## Item selection behavior

### R19

WHEN a user selects a navigation entry (from "Ir a" or a URL-bearing entry in "Acciones rápidas" or "Cuenta"), the system SHALL navigate to the entry's URL via `useRouter().push` and close the palette.

### R20

WHEN a user selects "Cerrar sesión", the system SHALL call `signOut({ callbackUrl: "/login" })` and close the palette.

### R21

WHEN a user selects "Alternar tema", the system SHALL toggle the active theme (cycling: `light` → `dark` → `system` → `light`, or using `setTheme` with the next value) and close the palette.

---

## No new dependencies

### R22

The command palette implementation SHALL use only already-installed packages (`cmdk` via `src/components/ui/command.tsx`, `next-auth/react`, `next-themes`, `next/navigation`, `lucide-react`) and SHALL NOT introduce new `npm` dependencies.

---

## Nav source: single source of truth

### R23

IF the `nav-cleanup` feature has not yet exported `masterNav` and `filterNavForRole` from `app-sidebar.tsx` (or a shared nav module), THEN this feature SHALL add those exports so both the sidebar and the palette consume the same role-gated nav source.
