# Design — command-palette

> Dependency: `nav-cleanup` must be `done` before this feature is implemented so that
> `masterNav` and `filterNavForRole` are exported and available to import.

---

## Files to touch

| File | Change |
| --- | --- |
| `src/components/dashboard/command-palette.tsx` | **New.** Client component: `CommandDialog` with Cmd/Ctrl+K listener, three `CommandGroup`s, open-state owner, and `CommandPaletteTrigger` sibling export. |
| `src/app/dashboard/layout.tsx` | Mount `<CommandPalette />` inside `SidebarInset` (before `<header>`); add `<CommandPaletteTrigger />` inside the existing header `div`, to the right of `SidebarTrigger` + `Separator`. |
| `src/components/ui/app-sidebar.tsx` | **Only if nav-cleanup has not yet done so:** export `masterNav`, `filterNavForRole`, and `NavRole` so the palette can import them. No other change to this file. |

---

## Approach

### 1. Nav source export (conditional)

`nav-cleanup` defines `masterNav: MasterNavItem[]` and `filterNavForRole(items, role)` inside `app-sidebar.tsx` but, per its `design.md`, keeps them as internal module-scope symbols (no `export` keyword). This feature adds the `export` keyword to both so the palette can import them from `@/components/ui/app-sidebar`. If `nav-cleanup` has already added those exports by the time this feature is implemented, this step is a no-op.

The exported types needed by the palette:

```ts
// already defined by nav-cleanup; add export keyword if missing
export type NavRole = "admin" | "accountant" | "user";

export const masterNav: MasterNavItem[];   // see nav-cleanup/design.md for full shape

export function filterNavForRole(
  items: MasterNavItem[],
  role: NavRole,
): { title: string; url?: string; icon: LucideIcon; isActive?: boolean; items?: { title: string; url: string }[] }[];
```

### 2. Open-state seam

`CommandPalette` owns a single `open` / `setOpen` boolean state. It renders two things:

- The `CommandDialog` (keyed on `open`).
- A named export `CommandPaletteTrigger` — a `<button>` that calls `setOpen(true)` — so the layout can place the trigger in the header without prop-drilling through a server component.

The seam is implemented via a **small React context** (`CommandPaletteContext`) defined at the top of `command-palette.tsx` and provided by `CommandPalette`. `CommandPaletteTrigger` consumes it. Both exports live in the same file; no separate context module is needed.

```ts
// command-palette.tsx (public API)
export function CommandPalette(): JSX.Element   // mounts dialog + registers keydown listener
export function CommandPaletteTrigger(): JSX.Element  // header button; must be inside <CommandPalette>
```

### 3. Keyboard listener

Mirror the pattern from `sidebar.tsx:97-110` exactly:

```ts
React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Guard: do not fire when focus is in a text field (other than the palette's own input)
    const target = event.target as HTMLElement;
    const isTextField =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;
    if (isTextField && !open) return;

    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [open]);
```

Key `"k"` is lowercase; `metaKey || ctrlKey` covers macOS and non-macOS. The listener checks for `"k"`, not `"b"`, so Cmd/Ctrl+B continues to reach the sidebar's own listener unmodified.

### 4. Role resolution

Inside `CommandPalette`, resolve role from `useAuthStore()` (already used by `AppSidebar`):

```ts
const { user } = useAuthStore();
const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
const resolvedRole: NavRole =
  canManageSettings ? "admin"
  : user?.type === "ACCOUNTANT" ? "accountant"
  : "user";
```

This mirrors `AppSidebar`'s derivation exactly (nav-cleanup design.md, "Resolved role derivation").

### 5. Component tree

```
<CommandPalette>                        ← owns open state; provides CommandPaletteContext
  <CommandDialog open={open} onOpenChange={setOpen}>
    <CommandInput placeholder="Buscar comando…" />
    <CommandList>
      <CommandEmpty>Sin resultados</CommandEmpty>

      <CommandGroup heading="Ir a">
        {/* one CommandItem per leaf route from filterNavForRole(masterNav, resolvedRole) */}
        {/* flat: group items with sub-items are expanded; leaf items are emitted directly */}
        <CommandItem key={route.url} onSelect={() => { router.push(route.url); setOpen(false); }}>
          <route.icon />
          {route.title}
        </CommandItem>
        …
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="Acciones rápidas">
        <CommandItem onSelect={() => { router.push("/dashboard/transactions/incomes?new=1"); setOpen(false); }}>
          <BanknoteArrowUp /> Nuevo ingreso
        </CommandItem>
        <CommandItem onSelect={() => { router.push("/dashboard/transactions/expenses?new=1"); setOpen(false); }}>
          <BanknoteArrowDown /> Nuevo gasto
        </CommandItem>
        <CommandItem onSelect={() => { router.push("/dashboard/reports/cuadre-del-dia"); setOpen(false); }}>
          <CalendarDays /> Cuadre del día
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="Cuenta">
        <CommandItem onSelect={() => { router.push("/dashboard/account"); setOpen(false); }}>
          <CircleUser /> Mi cuenta
        </CommandItem>
        <CommandItem onSelect={() => { void signOut({ callbackUrl: "/login" }); setOpen(false); }}>
          <LogOut /> Cerrar sesión
        </CommandItem>
        <CommandItem onSelect={() => { setTheme(nextTheme); setOpen(false); }}>
          <Sun /> Alternar tema
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</CommandPalette>
```

**Flattening "Ir a" entries:** `filterNavForRole` returns items that may have nested `items` arrays (group nodes) or a direct `url` (leaf nodes). The palette iterates the result:
- If the item has `url` (leaf node), emit one `CommandItem`.
- If the item has `items` (group node), iterate `items` and emit one `CommandItem` per sub-item; the sub-item's `value` prop for cmdk search includes the parent's title to allow searching by parent name (e.g., typing "Reportes" surfaces "Cuadre del día").

**Theme cycling for "Alternar tema":** use `useTheme()` to read `theme` and `setTheme`. Cycle order: `"light"` → `"dark"` → `"system"` → `"light"`. The icon shown in the `CommandItem` reflects the current theme.

### 6. Global mount in layout.tsx

`layout.tsx` is a server component. Client components may be children of a server layout. Mount pattern:

```tsx
// layout.tsx (server component — no changes to its async/await structure)
import { CommandPalette, CommandPaletteTrigger } from "@/components/dashboard/command-palette";

// Inside SidebarInset, before <header>:
<CommandPalette />

// Inside the header div, after <SidebarTrigger> + <Separator>:
<CommandPaletteTrigger />
<div className="min-w-0 flex-1">
  <DynamicBreadcrumb />
</div>
```

`CommandPalette` wraps both the invisible dialog and provides the context consumed by `CommandPaletteTrigger`. Both are client components; the server layout simply imports and renders them.

### 7. Header trigger appearance

`CommandPaletteTrigger` renders a `<Button variant="outline" size="sm">` (using the existing `Button` component):

```tsx
<Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
  <SearchIcon className="size-4" />
  <span className="hidden sm:inline">Buscar…</span>
  <CommandShortcut>⌘K</CommandShortcut>
</Button>
```

The shortcut badge is hidden below `sm` breakpoint; the icon remains visible. This keeps the header clean on mobile.

---

## Signatures / data shapes

```ts
// src/components/dashboard/command-palette.tsx

"use client";

// Context (module-private; not exported)
interface CommandPaletteContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Public exports
export function CommandPalette(): JSX.Element;
export function CommandPaletteTrigger(): JSX.Element;

// Flat nav entry shape used internally for "Ir a" rendering
interface FlatNavEntry {
  title: string;         // displayed label
  url: string;           // route to push
  icon: LucideIcon;      // icon from masterNav item
  searchValue: string;   // "parent title sub-item title" for cmdk value prop
}
```

```ts
// Additional exports added to src/components/ui/app-sidebar.tsx (if not already present)
export type NavRole = "admin" | "accountant" | "user";
export const masterNav: MasterNavItem[];
export function filterNavForRole(items: MasterNavItem[], role: NavRole): NavMain_ItemShape[];
```

---

## Rejected alternative

**Global state via Zustand store or a separate context module** — rejected because the palette is a self-contained UI concern with a single consumer (the trigger) and a single mount point. A Zustand store would add indirection and require importing the store in both the palette and the trigger across different component trees. A small React context defined and consumed within the same file achieves the same result with zero infrastructure overhead and keeps the seam explicit in one place.
