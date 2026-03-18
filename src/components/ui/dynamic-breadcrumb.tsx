"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function translateSegment(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    account: "Cuenta",
    invoices: "Facturas",
    settings: "Configuración",
    clients: "Clientes",
    users: "Usuarios",
    profile: "Perfil",
    transactions: "Transacciones",
    incomes: "Ingresos",
    expenses: "Gastos",
    reports: "Reportes",
    profit: "Utilidades",
    "cuadre-del-dia": "Cuadre del dia",
    receivables: "CxC",
    payables: "CxP",
    "link-de-pago": "Link de pago",
    "bank-accounts": "Cuentas financieras",
    branches: "Sucursales",
    parameters: "Parametros",
    "Income-types": "Tipos de ingresos",
    "Expense-types": "Tipos de gastos",
  };

  return (
    map[segment.toLowerCase()] ||
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const paths = segments.map((segment, index) => ({
    name: translateSegment(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  const collapsedPaths =
    paths.length > 3 ? [paths[0], { name: "...", href: "" }, ...paths.slice(-2)] : paths;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {collapsedPaths.map((p, i) => (
          <BreadcrumbItem key={i}>
            {p.name === "..." ? (
              <BreadcrumbEllipsis />
            ) : i === collapsedPaths.length - 1 ? (
              <BreadcrumbPage className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-[18rem]">
                {p.name}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link className="max-w-[7rem] truncate sm:max-w-[10rem]" href={p.href}>
                  {p.name}
                </Link>
              </BreadcrumbLink>
            )}
            {i < collapsedPaths.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
