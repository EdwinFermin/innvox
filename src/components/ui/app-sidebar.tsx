import * as React from "react";
import {
  Users,
  LifeBuoy,
  Send,
  Settings2,
  LayoutDashboard,
  ScrollText,
  FileSpreadsheet,
  BarChart,
  HandCoins,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { useAuthStore } from "@/store/auth";

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
      title: "Facturas",
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
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ScrollText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-2xl">
                    Innvox
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
