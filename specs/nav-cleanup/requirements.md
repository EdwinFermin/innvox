# Requirements — nav-cleanup

> EARS notation. Every requirement is numbered and objectively verifiable.
> All role conditions resolve as: admin = `canManageSettings` true (i.e. `can(user?.type, PERMISSIONS.settingsManage)`); accountant = `user?.type === "ACCOUNTANT"` (and not admin); user = all other authenticated users.

---

## Single-source master nav

### R1

WHEN the sidebar is rendered for any authenticated user, the system SHALL derive the displayed nav items from a single master nav definition rather than from three separate duplicated arrays (`navAdmin`, `navMain`, `navAccountant`).

### R2

WHEN the sidebar is rendered, the system SHALL resolve the active role exactly as today — admin = `canManageSettings` is true; accountant = `user?.type === "ACCOUNTANT"` (and not admin); user = every other authenticated user — and pass that resolved role to a pure `filterNavForRole` helper that returns the filtered item list.

---

## Per-role visibility — admin

### R3

WHEN the active role is admin, the system SHALL render all of the following top-level nav items (in order): Dashboard, Transacciones, Facturación, Clientes, Cuentas financieras, Costos operativos, Fidelidad, Reportes, Parámetros, Configuración.

### R4

WHEN the active role is admin and the Transacciones group is rendered, the system SHALL include all six sub-items: Ingresos, Gastos, Cuentas por cobrar, Cuentas por pagar, Link de pago, Sincronizar Envíos RD.

### R5

WHEN the active role is admin and the Fidelidad group is rendered, the system SHALL include both sub-items: Tarjetas and Scanner.

### R6

WHEN the active role is admin and the Reportes group is rendered, the system SHALL include all three sub-items: Utilidades, Cuadre del día, Formulario DGII.

### R7

WHEN the active role is admin and the Parámetros group is rendered, the system SHALL include both sub-items: Tipos de ingresos and Tipos de gastos.

### R8

WHEN the active role is admin and the Configuración group is rendered, the system SHALL include all three sub-items: General (`/dashboard/settings`), Usuarios (`/dashboard/users`), Sucursales (`/dashboard/branches`).

---

## Per-role visibility — accountant

### R9

WHEN the active role is accountant, the system SHALL render exactly the following top-level nav items (in order): Dashboard, Transacciones, Facturación, Clientes, Cuentas financieras, Costos operativos, Reportes, Parámetros. The items Fidelidad and Configuración SHALL NOT appear.

### R10

WHEN the active role is accountant and the Transacciones group is rendered, the system SHALL include all six sub-items (identical to R4).

### R11

WHEN the active role is accountant and the Reportes group is rendered, the system SHALL include all three sub-items: Utilidades, Cuadre del día, Formulario DGII.

### R12

WHEN the active role is accountant and the Parámetros group is rendered, the system SHALL include both sub-items: Tipos de ingresos and Tipos de gastos.

---

## Per-role visibility — user

### R13

WHEN the active role is user, the system SHALL render exactly the following top-level nav items (in order): Dashboard, Transacciones, Facturación, Clientes, Fidelidad, Reportes. The items Cuentas financieras, Costos operativos, Parámetros, and Configuración SHALL NOT appear.

### R14

WHEN the active role is user and the Transacciones group is rendered, the system SHALL include all six sub-items (identical to R4).

### R15

WHEN the active role is user and the Fidelidad group is rendered, the system SHALL include both sub-items: Tarjetas and Scanner.

### R16

WHEN the active role is user and the Reportes group is rendered, the system SHALL include exactly one sub-item: Cuadre del día. The sub-items Utilidades and Formulario DGII SHALL NOT appear.

---

## Sub-item gating and group visibility

### R17

WHEN a group-type nav item (one with sub-items) is filtered for the active role and zero sub-items remain visible, the system SHALL omit the entire group from the rendered nav (the group heading and its container SHALL NOT be rendered).

---

## Single Settings path

### R18

WHEN the active role is admin, the system SHALL expose Configuración exclusively through the main nav group (General/Usuarios/Sucursales sub-items). The secondary nav SHALL contain only "Mi cuenta" and SHALL NOT contain a separate "Configuracion" or "Configuración" link.

### R19

WHEN the active role is accountant or user, the system SHALL NOT render any Settings entry in either the main nav or the secondary nav.

### R20

WHEN the secondary nav is rendered for any role, the system SHALL pass the items array directly to `NavSecondary` without filtering (the runtime `.filter()` call on `navSecondary` that was present at line 446 SHALL be removed).

---

## Icon corrections

### R21

WHEN the secondary nav "Mi cuenta" item is rendered, the system SHALL use the `CircleUser` icon. The `LifeBuoy` icon SHALL NOT be used for this item.

### R22

WHEN the sidebar module is loaded, the `LifeBuoy` and `Send` lucide imports SHALL NOT be present (they are unused after the secondary nav is reduced to "Mi cuenta" with `CircleUser`).

---

## Accent normalization

### R23

WHEN nav labels are rendered, the label for the Parámetros group SHALL be spelled "Parámetros" (with accent). The unaccented spelling "Parametros" SHALL NOT appear in any nav title or group label.

### R24

WHEN nav labels are rendered, the sub-item label for the sync route SHALL be spelled "Sincronizar Envíos RD" (with accent on Envíos). The unaccented spelling "Sincronizar Envios RD" SHALL NOT appear.

### R25

WHEN the quick-actions group label is rendered, it SHALL read "Acciones rápidas" (with accent). The unaccented spelling "Acciones rapidas" SHALL NOT appear.

### R26

WHEN the sub-item label for the daily close report is rendered, it SHALL read "Cuadre del día" (with accent on día). The unaccented spelling "Cuadre del dia" SHALL NOT appear in any nav title or quick-action title.

### R27

WHEN any nav item or group label is rendered, the label SHALL carry correct Spanish accentuation. Any occurrence of "Configuracion" (unaccented) SHALL be corrected to "Configuración".

---

## Renderer contracts

### R28

WHEN the filtered item list is passed to `NavMain`, the shape of each item object SHALL conform to the existing `NavMain` prop type (fields: `title: string`, `url?: string`, `icon: LucideIcon | IconType`, `isActive?: boolean`, `items?: { title: string; url: string }[]`). `NavMain` SHALL NOT be modified.

### R29

WHEN the secondary nav items array is passed to `NavSecondary`, the shape of each item SHALL conform to the existing `NavSecondary` prop type (fields: `title: string`, `url: string`, `icon: LucideIcon`). `NavSecondary` SHALL NOT be modified.
