"use client";

import * as React from "react";
import {
  Users,
  LifeBuoy,
  Send,
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

const data = {
  navAdmin: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Transacciones",
      icon: HandCoins,
      items: [
        {
          title: "Ingresos",
          url: "/dashboard/transactions/incomes",
        },
        {
          title: "Gastos",
          url: "/dashboard/transactions/expenses",
        },
        {
          title: "Cuentas por cobrar",
          url: "/dashboard/receivables",
        },
        {
          title: "Cuentas por pagar",
          url: "/dashboard/payables",
        },
        {
          title: "Link de pago",
          url: "/dashboard/link-de-pago",
        },
      ],
    },
    {
      title: "Facturación",
      url: "/dashboard/invoices",
      icon: FileSpreadsheet,
      isActive: true,
    },
    {
      title: "Clientes",
      url: "/dashboard/clients",
      icon: Users,
      isActive: true,
    },
    {
      title: "Cuentas financieras",
      url: "/dashboard/bank-accounts",
      icon: Landmark,
      isActive: true,
    },
    {
      title: "Costos operativos",
      url: "/dashboard/costos-operativos",
      icon: CalendarClock,
      isActive: true,
    },
    {
      title: "Fidelidad",
      icon: Gift,
      items: [
        {
          title: "Tarjetas",
          url: "/dashboard/loyalty",
        },
        {
          title: "Scanner",
          url: "/dashboard/loyalty/scanner",
        },
      ],
    },
    {
      title: "Reportes",
      icon: BarChart,
      items: [
        {
          title: "Utilidades",
          url: "/dashboard/reports/profit",
        },
        {
          title: "Cuadre del dia",
          url: "/dashboard/reports/cuadre-del-dia",
        },
        {
          title: "Formulario DGII",
          url: "/dashboard/reports/formulario-dgii",
        },
      ],
    },
    {
      title: "Parametros",
      icon: Settings2,
      items: [
        {
          title: "Tipos de ingresos",
          url: "/dashboard/parameters/income-types",
        },
        {
          title: "Tipos de gastos",
          url: "/dashboard/parameters/expense-types",
        },
      ],
    },
    {
      title: "Configuración",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/dashboard/settings",
        },
        {
          title: "Usuarios",
          url: "/dashboard/users",
        },
        {
          title: "Sucursales",
          url: "/dashboard/branches",
        },
      ],
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Transacciones",
      icon: HandCoins,
      items: [
        {
          title: "Ingresos",
          url: "/dashboard/transactions/incomes",
        },
        {
          title: "Gastos",
          url: "/dashboard/transactions/expenses",
        },
        {
          title: "Cuentas por cobrar",
          url: "/dashboard/receivables",
        },
        {
          title: "Cuentas por pagar",
          url: "/dashboard/payables",
        },
        {
          title: "Link de pago",
          url: "/dashboard/link-de-pago",
        },
      ],
    },
    {
      title: "Facturación",
      url: "/dashboard/invoices",
      icon: FileSpreadsheet,
      isActive: true,
    },
    {
      title: "Clientes",
      url: "/dashboard/clients",
      icon: Users,
      isActive: true,
    },
    {
      title: "Fidelidad",
      icon: Gift,
      items: [
        {
          title: "Tarjetas",
          url: "/dashboard/loyalty",
        },
        {
          title: "Scanner",
          url: "/dashboard/loyalty/scanner",
        },
      ],
    },
    {
      title: "Reportes",
      icon: BarChart,
      items: [
        {
          title: "Cuadre del dia",
          url: "/dashboard/reports/cuadre-del-dia",
        },
      ],
    },
  ],
  navAccountant: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Transacciones",
      icon: HandCoins,
      items: [
        {
          title: "Ingresos",
          url: "/dashboard/transactions/incomes",
        },
        {
          title: "Gastos",
          url: "/dashboard/transactions/expenses",
        },
        {
          title: "Cuentas por cobrar",
          url: "/dashboard/receivables",
        },
        {
          title: "Cuentas por pagar",
          url: "/dashboard/payables",
        },
        {
          title: "Link de pago",
          url: "/dashboard/link-de-pago",
        },
      ],
    },
    {
      title: "Facturación",
      url: "/dashboard/invoices",
      icon: FileSpreadsheet,
      isActive: true,
    },
    {
      title: "Clientes",
      url: "/dashboard/clients",
      icon: Users,
      isActive: true,
    },
    {
      title: "Cuentas financieras",
      url: "/dashboard/bank-accounts",
      icon: Landmark,
      isActive: true,
    },
    {
      title: "Costos operativos",
      url: "/dashboard/costos-operativos",
      icon: CalendarClock,
      isActive: true,
    },
    {
      title: "Reportes",
      icon: BarChart,
      items: [
        {
          title: "Utilidades",
          url: "/dashboard/reports/profit",
        },
        {
          title: "Cuadre del dia",
          url: "/dashboard/reports/cuadre-del-dia",
        },
        {
          title: "Formulario DGII",
          url: "/dashboard/reports/formulario-dgii",
        },
      ],
    },
    {
      title: "Parametros",
      icon: Settings2,
      items: [
        {
          title: "Tipos de ingresos",
          url: "/dashboard/parameters/income-types",
        },
        {
          title: "Tipos de gastos",
          url: "/dashboard/parameters/expense-types",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Mi cuenta",
      url: "/dashboard/account",
      icon: LifeBuoy,
    },
    {
      title: "Configuracion",
      url: "/dashboard/settings",
      icon: Send,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
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
      title: "Cuadre del dia",
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
              className="h-auto rounded-[1.4rem] border border-sidebar-border/70 bg-white/80 px-3 py-3 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.28)]"
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
            Acciones rapidas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-[1.25rem] border border-sidebar-border/70 bg-white/80 p-2 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.28)]">
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
        <NavMain items={canManageSettings ? data.navAdmin : user?.type === "ACCOUNTANT" ? data.navAccountant : data.navMain} />
        <NavSecondary items={canManageSettings ? data.navSecondary : data.navSecondary.filter((item) => item.url !== "/dashboard/settings")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 px-3 py-3">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
