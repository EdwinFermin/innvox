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
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import Image from "next/image";

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
      title: "Reportes",
      icon: BarChart,
      items: [
        {
          title: "Utilidades",
          url: "/dashboard/reports/profit",
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
      ],
    },
    // {
    //   title: "Facturas",
    //   url: "/dashboard/invoices",
    //   icon: FileSpreadsheet,
    //   isActive: true,
    // },
    {
      title: "Clientes",
      url: "/dashboard/clients",
      icon: Users,
      isActive: true,
    },
  ],
  navSecondary: [
    {
      title: "Soporte",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard" className="flex items-center gap-3">
                  <Image src="/icon.svg" alt="Innvox" width={32} height={32} />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-2xl">
                      Innvox
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Acciones rápidas</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/dashboard/transactions/incomes?new=1"
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-2 text-center shadow-sm transition hover:border-primary/50 hover:shadow"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BanknoteArrowUp className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-foreground">
                  Nuevo ingreso
                </span>
              </a>
              <a
                href="/dashboard/transactions/expenses?new=1"
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-2 text-center shadow-sm transition hover:border-primary/50 hover:shadow"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <BanknoteArrowDown className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-foreground">
                  Nuevo gasto
                </span>
              </a>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavMain
          items={user?.type === "ADMIN" ? data.navAdmin : data.navMain}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
