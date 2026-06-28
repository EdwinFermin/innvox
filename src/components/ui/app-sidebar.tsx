"use client";

import * as React from "react";
import {
  Users,
  CircleUser,
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
  type LucideIcon,
} from "lucide-react";
import { type IconType } from "react-icons/lib";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { useAuthStore } from "@/store/auth";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import Link from "next/link";
import Image from "next/image";
import { SidebarSeparator } from "@/components/ui/sidebar";

// Role identifier. Maps the runtime auth checks (canManageSettings / user?.type)
// onto the visibility sets declared in masterNav. Exported so the command palette
// consumes the same role-gated nav source as the sidebar (R23).
export type NavRole = "admin" | "accountant" | "user";

// Sub-item shape inside masterNav. The `roles` field is internal and is stripped
// by filterNavForRole before the item reaches NavMain.
interface MasterSubItem {
  title: string;
  url: string;
  roles: NavRole[];
}

// Top-level item shape inside masterNav. `roles` is stripped before NavMain.
interface MasterNavItem {
  title: string;
  url?: string;
  icon: LucideIcon | IconType;
  isActive?: boolean;
  roles: NavRole[];
  items?: MasterSubItem[];
}

// Single source of truth for the sidebar nav. Each top-level item and each
// sub-item declares the roles that may see it, replacing the previously
// duplicated navAdmin / navMain / navAccountant arrays.
export const masterNav: MasterNavItem[] = [
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
      { title: "Ingresos", url: "/dashboard/transactions/incomes", roles: ["admin", "accountant", "user"] },
      { title: "Gastos", url: "/dashboard/transactions/expenses", roles: ["admin", "accountant", "user"] },
      { title: "Cuentas por cobrar", url: "/dashboard/receivables", roles: ["admin", "accountant", "user"] },
      { title: "Cuentas por pagar", url: "/dashboard/payables", roles: ["admin", "accountant", "user"] },
      { title: "Link de pago", url: "/dashboard/link-de-pago", roles: ["admin", "accountant", "user"] },
      { title: "Sincronizar Envíos RD", url: "/dashboard/sync-cuadres", roles: ["admin", "accountant", "user"] },
    ],
  },
  {
    title: "Facturación",
    url: "/dashboard/invoices",
    icon: FileSpreadsheet,
    isActive: true,
    roles: ["admin", "accountant", "user"],
  },
  {
    title: "Clientes",
    url: "/dashboard/clients",
    icon: Users,
    isActive: true,
    roles: ["admin", "accountant", "user"],
  },
  {
    title: "Cuentas financieras",
    url: "/dashboard/bank-accounts",
    icon: Landmark,
    isActive: true,
    roles: ["admin", "accountant"],
  },
  {
    title: "Costos operativos",
    url: "/dashboard/costos-operativos",
    icon: CalendarClock,
    isActive: true,
    roles: ["admin", "accountant"],
  },
  {
    title: "Fidelidad",
    icon: Gift,
    roles: ["admin", "user"],
    items: [
      { title: "Tarjetas", url: "/dashboard/loyalty", roles: ["admin", "user"] },
      { title: "Scanner", url: "/dashboard/loyalty/scanner", roles: ["admin", "user"] },
    ],
  },
  {
    title: "Reportes",
    icon: BarChart,
    roles: ["admin", "accountant", "user"],
    items: [
      { title: "Utilidades", url: "/dashboard/reports/profit", roles: ["admin", "accountant"] },
      { title: "Cuadre del día", url: "/dashboard/reports/cuadre-del-dia", roles: ["admin", "accountant", "user"] },
      { title: "Formulario DGII", url: "/dashboard/reports/formulario-dgii", roles: ["admin", "accountant"] },
    ],
  },
  {
    title: "Parámetros",
    icon: Settings2,
    roles: ["admin", "accountant"],
    items: [
      { title: "Tipos de ingresos", url: "/dashboard/parameters/income-types", roles: ["admin", "accountant"] },
      { title: "Tipos de gastos", url: "/dashboard/parameters/expense-types", roles: ["admin", "accountant"] },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    roles: ["admin"],
    items: [
      { title: "General", url: "/dashboard/settings", roles: ["admin"] },
      { title: "Usuarios", url: "/dashboard/users", roles: ["admin"] },
      { title: "Sucursales", url: "/dashboard/branches", roles: ["admin"] },
    ],
  },
];

// Shape NavMain expects — the masterNav shape with the internal `roles` field removed.
interface NavItem {
  title: string;
  url?: string;
  icon: LucideIcon | IconType;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

// Pure: filters masterNav for a single role and returns items in NavMain's prop
// shape. Keeps items whose roles include the role, filters sub-items the same way,
// drops groups left with zero sub-items (R17), and strips the internal `roles` field.
export function filterNavForRole(items: MasterNavItem[], role: NavRole): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (!item.roles.includes(role)) continue;
    // Explicitly rebuild each item so the internal `roles` field never leaks
    // into NavMain's prop shape (R28).
    const base: NavItem = {
      title: item.title,
      url: item.url,
      icon: item.icon,
      isActive: item.isActive,
    };
    if (!item.items) {
      result.push(base);
      continue;
    }
    const filteredSubs = item.items
      .filter((sub) => sub.roles.includes(role))
      .map((sub) => ({ title: sub.title, url: sub.url }));
    if (filteredSubs.length === 0) continue; // drop empty groups (R17)
    result.push({ ...base, items: filteredSubs });
  }
  return result;
}

// Secondary nav: single "Mi cuenta" entry. Settings now lives solely in the main
// nav's Configuración group (admin only), so no runtime filter is needed here.
const navSecondary = [
  { title: "Mi cuenta", url: "/dashboard/account", icon: CircleUser },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
  const resolvedRole: NavRole = canManageSettings
    ? "admin"
    : user?.type === "ACCOUNTANT"
      ? "accountant"
      : "user";
  const quickActions = [
    {
      title: "Nuevo ingreso",
      description: "Registrar entrada de efectivo",
      url: "/dashboard/transactions/incomes?new=1",
      icon: BanknoteArrowUp,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      title: "Nuevo gasto",
      description: "Registrar salida operativa",
      url: "/dashboard/transactions/expenses?new=1",
      icon: BanknoteArrowDown,
      iconClassName: "bg-destructive/10 text-destructive",
    },
    {
      title: "Cuadre del día",
      description: "Revisar cierre diario",
      url: "/dashboard/reports/cuadre-del-dia",
      icon: CalendarDays,
      iconClassName: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <Sidebar variant="inset" className="border-none" {...props}>
      <SidebarHeader className="gap-3 px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-auto rounded-[1.4rem] border border-sidebar-border/70 bg-sidebar/80 px-3 py-3 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.28)]"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Image src="/icon.svg" alt="Innvox" width={28} height={28} />
                </span>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/45">
                    Finance OS
                  </span>
                  <span className="truncate font-semibold text-2xl tracking-[-0.04em]">
                      Innvox
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent className="px-1 pb-3">
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/45">
            Acciones rápidas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-[1.25rem] border border-sidebar-border/70 bg-sidebar/80 p-2 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
              <SidebarMenuSub className="m-0 space-y-1 border-l-0 p-0">
                {quickActions.map((action) => (
                  <SidebarMenuSubItem key={action.title}>
                    <SidebarMenuSubButton
                      asChild
                      className="h-auto rounded-[1rem] border border-transparent px-3 py-3 transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
                    >
                      <Link href={action.url} className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${action.iconClassName}`}>
                          <action.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {action.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        </span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavMain items={filterNavForRole(masterNav, resolvedRole)} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 px-3 py-3">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
