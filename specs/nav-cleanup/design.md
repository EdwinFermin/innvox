# Design — nav-cleanup

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/app-sidebar.tsx` | Replace three duplicated nav arrays with one master list; add `filterNavForRole` helper; fix secondary nav; fix icons; normalize all accent labels |

No other file is modified. `nav-main.tsx`, `nav-secondary.tsx`, `can.ts`, `permissions.ts`, and `roles.ts` are read-only inputs to this change.

---

## Approach

1. **Define the master nav item shape** — extend the current item object used by `NavMain` with a `roles` visibility field so each top-level item and each sub-item can declare which roles see it.

2. **Write `masterNav`** — a single `const masterNav` array at module scope (replacing `data.navAdmin`, `data.navMain`, `data.navAccountant`). Every item carries a `roles` set; sub-items carry their own `roles` set. Labels are accent-normalized at definition time.

3. **Write `filterNavForRole`** — a pure function that accepts the master list and a resolved role string (`"admin" | "accountant" | "user"`) and returns an array conforming to `NavMain`'s prop type. Logic:
   - Keep a top-level item when `item.roles.includes(role)`.
   - For group items (those with `items`), filter sub-items by `subItem.roles.includes(role)`.
   - Drop the group entirely if zero sub-items survive (R17).
   - Strip the internal `roles` field from every returned object so the output shape matches `NavMain` exactly.

4. **Resolve the active role** — in `AppSidebar`, derive `resolvedRole` from existing variables:
   ```
   canManageSettings → "admin"
   user?.type === "ACCOUNTANT" → "accountant"
   otherwise → "user"
   ```
   This mirrors the current ternary at line 445 exactly, preserving all role boundaries.

5. **Replace line 445** — pass `filterNavForRole(masterNav, resolvedRole)` to `NavMain`.

6. **Fix secondary nav** — replace `data.navSecondary` with a plain inline array containing only "Mi cuenta" using `CircleUser`. Pass it directly to `NavSecondary` without `.filter()` (removes the runtime filter at line 446 and the `LifeBuoy`/`Send` icons).

7. **Remove unused imports** — delete `LifeBuoy` and `Send` from the lucide import block.

8. **Normalize the quick-actions group label** — change `"Acciones rapidas"` → `"Acciones rápidas"` at line 414, and `"Cuadre del dia"` → `"Cuadre del día"` in the `quickActions` array.

---

## Signatures / data shapes

```ts
// Internal type used only inside app-sidebar.tsx — never exported
type NavRole = "admin" | "accountant" | "user";

// Sub-item shape in masterNav (has roles; stripped before passing to NavMain)
interface MasterSubItem {
  title: string;
  url: string;
  roles: NavRole[];
}

// Top-level item shape in masterNav (has roles; stripped before passing to NavMain)
interface MasterNavItem {
  title: string;
  url?: string;
  icon: LucideIcon | IconType;
  isActive?: boolean;
  roles: NavRole[];
  items?: MasterSubItem[];
}

// Pure helper — no side effects, no external reads
function filterNavForRole(
  items: MasterNavItem[],
  role: NavRole,
): NavMain_ItemShape[]  // = { title, url?, icon, isActive?, items?: { title, url }[] }
```

**masterNav excerpt (illustrative — implementer must include all items)**

```ts
const masterNav: MasterNavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
    roles: ["admin", "accountant", "user"],
  },
  {
    title: "Transacciones",
    icon: HandCoins,
    roles: ["admin", "accountant", "user"],
    items: [
      { title: "Ingresos",             url: "/dashboard/transactions/incomes",  roles: ["admin", "accountant", "user"] },
      { title: "Gastos",               url: "/dashboard/transactions/expenses", roles: ["admin", "accountant", "user"] },
      { title: "Cuentas por cobrar",   url: "/dashboard/receivables",           roles: ["admin", "accountant", "user"] },
      { title: "Cuentas por pagar",    url: "/dashboard/payables",              roles: ["admin", "accountant", "user"] },
      { title: "Link de pago",         url: "/dashboard/link-de-pago",          roles: ["admin", "accountant", "user"] },
      { title: "Sincronizar Envíos RD",url: "/dashboard/sync-cuadres",          roles: ["admin", "accountant", "user"] },
    ],
  },
  { title: "Facturación",        url: "/dashboard/invoices",          icon: FileSpreadsheet, isActive: true, roles: ["admin", "accountant", "user"] },
  { title: "Clientes",           url: "/dashboard/clients",           icon: Users,           isActive: true, roles: ["admin", "accountant", "user"] },
  { title: "Cuentas financieras",url: "/dashboard/bank-accounts",     icon: Landmark,        isActive: true, roles: ["admin", "accountant"] },
  { title: "Costos operativos",  url: "/dashboard/costos-operativos", icon: CalendarClock,   isActive: true, roles: ["admin", "accountant"] },
  {
    title: "Fidelidad",
    icon: Gift,
    roles: ["admin", "user"],
    items: [
      { title: "Tarjetas", url: "/dashboard/loyalty",         roles: ["admin", "user"] },
      { title: "Scanner",  url: "/dashboard/loyalty/scanner", roles: ["admin", "user"] },
    ],
  },
  {
    title: "Reportes",
    icon: BarChart,
    roles: ["admin", "accountant", "user"],
    items: [
      { title: "Utilidades",       url: "/dashboard/reports/profit",           roles: ["admin", "accountant"] },
      { title: "Cuadre del día",   url: "/dashboard/reports/cuadre-del-dia",   roles: ["admin", "accountant", "user"] },
      { title: "Formulario DGII",  url: "/dashboard/reports/formulario-dgii",  roles: ["admin", "accountant"] },
    ],
  },
  {
    title: "Parámetros",
    icon: Settings2,
    roles: ["admin", "accountant"],
    items: [
      { title: "Tipos de ingresos", url: "/dashboard/parameters/income-types",  roles: ["admin", "accountant"] },
      { title: "Tipos de gastos",   url: "/dashboard/parameters/expense-types", roles: ["admin", "accountant"] },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    roles: ["admin"],
    items: [
      { title: "General",    url: "/dashboard/settings",  roles: ["admin"] },
      { title: "Usuarios",   url: "/dashboard/users",     roles: ["admin"] },
      { title: "Sucursales", url: "/dashboard/branches",  roles: ["admin"] },
    ],
  },
];
```

**filterNavForRole implementation sketch**

```ts
function filterNavForRole(items: MasterNavItem[], role: NavRole) {
  return items
    .filter((item) => item.roles.includes(role))
    .map(({ roles: _roles, items: subItems, ...rest }) => {
      if (!subItems) return rest;
      const filteredSubs = subItems
        .filter((s) => s.roles.includes(role))
        .map(({ roles: _r, ...s }) => s);
      if (filteredSubs.length === 0) return null;   // drop empty groups (R17)
      return { ...rest, items: filteredSubs };
    })
    .filter(Boolean);
}
```

**Resolved role derivation (in AppSidebar component body)**

```ts
const resolvedRole: NavRole =
  canManageSettings ? "admin"
  : user?.type === "ACCOUNTANT" ? "accountant"
  : "user";
```

**Secondary nav (inline, replaces data.navSecondary)**

```ts
const navSecondary = [
  { title: "Mi cuenta", url: "/dashboard/account", icon: CircleUser },
];
// passed directly: <NavSecondary items={navSecondary} className="mt-auto" />
```

**Lucide import block after change**

```ts
import {
  Users,
  CircleUser,      // replaces LifeBuoy for "Mi cuenta"
  Settings2,
  LayoutDashboard,
  FileSpreadsheet,
  BarChart,
  HandCoins,
  Settings,
  BanknoteArrowUp,
  BanknoteArrowDown,
  Landmark,
  CalendarDays,
  CalendarClock,
  Gift,
} from "lucide-react";
// LifeBuoy and Send are removed
```

---

## How existing renderers consume the output unchanged

`NavMain` (nav-main.tsx lines 26–38) expects items typed as `{ title, url?, icon, isActive?, items?: { title, url }[] }[]`. `filterNavForRole` strips the internal `roles` field before returning, producing exactly that shape — no change to the renderer is needed.

`NavSecondary` (nav-secondary.tsx lines 12–21) expects items typed as `{ title, url, icon }[]`. The new inline `navSecondary` array satisfies that shape — no change to the renderer is needed.

---

## Rejected alternative

**Option A — targeted fixes, keep three separate arrays** — rejected because the triple duplication is the documented root cause of label and route drift between roles. Keeping the three arrays means any future label change must be applied in three places, recreating the same risk. Option B eliminates the duplication and makes the visibility matrix the single authoritative source, at the cost of a slightly larger but self-contained diff confined to one file.
