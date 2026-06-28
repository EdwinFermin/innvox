"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  BanknoteArrowUp,
  BanknoteArrowDown,
  CalendarDays,
  CircleUser,
  LogOut,
  SunMoon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
import { type IconType } from "react-icons/lib";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  masterNav,
  filterNavForRole,
  type NavRole,
} from "@/components/ui/app-sidebar";
import { useAuthStore } from "@/store/auth";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";

// ---------------------------------------------------------------------------
// Shared open-state seam.
//
// In layout.tsx, <CommandPalette /> (the dialog) and <CommandPaletteTrigger />
// (the header button) are mounted as SIBLINGS, not parent/child. A React context
// provided by CommandPalette would therefore never reach the trigger. To give
// both siblings ONE source of truth without prop-drilling through the server
// layout (and without a new dependency — R22), the open boolean lives in a tiny
// module-scoped external store that both components subscribe to via
// useSyncExternalStore. Writing through `paletteStore.set` from either side is
// reflected in the other on the next React tick.
// ---------------------------------------------------------------------------

const paletteStore = (() => {
  let open = false;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return open;
    },
    set(next: boolean | ((prev: boolean) => boolean)) {
      const value = typeof next === "function" ? next(open) : next;
      if (value === open) return;
      open = value;
      listeners.forEach((listener) => listener());
    },
  };
})();

// Server snapshot is always closed — the palette only opens via client input.
function useCommandPaletteOpen() {
  const open = React.useSyncExternalStore(
    paletteStore.subscribe,
    paletteStore.getSnapshot,
    () => false,
  );
  return [open, paletteStore.set] as const;
}

// Flat nav entry used to render the "Ir a" group. Group nodes in masterNav are
// expanded into one entry per sub-item; `searchValue` prepends the parent title
// so typing a parent name (e.g. "Reportes") surfaces its children in cmdk.
interface FlatNavEntry {
  title: string;
  url: string;
  icon: LucideIcon | IconType;
  searchValue: string;
}

function flattenNav(role: NavRole): FlatNavEntry[] {
  const entries: FlatNavEntry[] = [];
  for (const item of filterNavForRole(masterNav, role)) {
    if (item.url) {
      // Leaf node: one entry.
      entries.push({
        title: item.title,
        url: item.url,
        icon: item.icon,
        searchValue: item.title,
      });
      continue;
    }
    // Group node: one entry per sub-item, parent title kept for searchability.
    for (const sub of item.items ?? []) {
      entries.push({
        title: sub.title,
        url: sub.url,
        icon: item.icon,
        searchValue: `${item.title} ${sub.title}`,
      });
    }
  }
  return entries;
}

// Cycle order for "Alternar tema": light → dark → system → light.
const THEME_CYCLE: Record<string, string> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function CommandPalette() {
  const [open, setOpen] = useCommandPaletteOpen();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Mirror AppSidebar's role derivation exactly so the palette's "Ir a" group
  // shows the same role-gated routes the sidebar does.
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
  const resolvedRole: NavRole = canManageSettings
    ? "admin"
    : user?.type === "ACCOUNTANT"
      ? "accountant"
      : "user";

  const navEntries = React.useMemo(
    () => flattenNav(resolvedRole),
    [resolvedRole],
  );

  // Cmd/Ctrl+K toggles the palette. Mirrors the sidebar's keydown pattern
  // (sidebar.tsx) but listens for "k" only — "b" is left untouched so the
  // sidebar's own Cmd/Ctrl+B shortcut keeps working (R3). When the palette is
  // closed, keystrokes originating in a text field are ignored (R4); Escape is
  // handled by CommandDialog's built-in behavior (R5).
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [open, setOpen]);

  const go = (url: string) => {
    router.push(url);
    setOpen(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Paleta de comandos"
      description="Busca un comando para ejecutar"
    >
      <CommandInput placeholder="Buscar comando…" />
      <CommandList>
        <CommandEmpty>Sin resultados</CommandEmpty>

        <CommandGroup heading="Ir a">
          {navEntries.map((entry) => (
            <CommandItem
              key={entry.url}
              value={entry.searchValue}
              onSelect={() => go(entry.url)}
            >
              <entry.icon />
              {entry.title}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones rápidas">
          <CommandItem
            onSelect={() => go("/dashboard/transactions/incomes?new=1")}
          >
            <BanknoteArrowUp />
            Nuevo ingreso
          </CommandItem>
          <CommandItem
            onSelect={() => go("/dashboard/transactions/expenses?new=1")}
          >
            <BanknoteArrowDown />
            Nuevo gasto
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard/reports/cuadre-del-dia")}>
            <CalendarDays />
            Cuadre del día
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Cuenta">
          <CommandItem onSelect={() => go("/dashboard/account")}>
            <CircleUser />
            Mi cuenta
          </CommandItem>
          <CommandItem
            onSelect={() => {
              void signOut({ callbackUrl: "/login" });
              setOpen(false);
            }}
          >
            <LogOut />
            Cerrar sesión
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(THEME_CYCLE[theme ?? "system"] ?? "light");
              setOpen(false);
            }}
          >
            <SunMoon />
            Alternar tema
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  const [, setOpen] = useCommandPaletteOpen();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground"
      // Below `sm` the visible "Buscar…" label is display:none, so the button
      // is icon-only; the aria-label guarantees an accessible name at every
      // breakpoint (screen readers would otherwise announce just "button").
      aria-label="Buscar (⌘K)"
      onClick={() => setOpen((prev) => !prev)}
    >
      <SearchIcon className="size-4" />
      <span className="hidden sm:inline">Buscar…</span>
      <CommandShortcut>⌘K</CommandShortcut>
    </Button>
  );
}
