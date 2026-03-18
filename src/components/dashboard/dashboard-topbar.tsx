"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Panel financiero",
    subtitle: "Balance, flujo y prioridades del negocio en un mismo lugar.",
  },
  "/dashboard/invoices": {
    title: "Facturacion",
    subtitle: "Controla ventas, emision y seguimiento comercial.",
  },
  "/dashboard/transactions/incomes": {
    title: "Ingresos",
    subtitle: "Registra entradas y valida el pulso diario de caja.",
  },
  "/dashboard/transactions/expenses": {
    title: "Gastos",
    subtitle: "Supervisa egresos, cuentas y disciplina operativa.",
  },
  "/dashboard/receivables": {
    title: "Cuentas por cobrar",
    subtitle: "Protege liquidez y acelera la cobranza.",
  },
  "/dashboard/payables": {
    title: "Cuentas por pagar",
    subtitle: "Prioriza compromisos y evita presion de caja.",
  },
  "/dashboard/bank-accounts": {
    title: "Cuentas financieras",
    subtitle: "Consolida balance disponible y movimientos bancarios.",
  },
};

function resolvePageMeta(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];

  const matched = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname.startsWith(key));

  return (
    matched?.[1] ?? {
      title: "Workspace",
      subtitle: "Gestiona operaciones, reportes y configuracion.",
    }
  );
}

export function DashboardTopbar() {
  const pathname = usePathname();

  if (pathname !== "/dashboard") {
    return null;
  }

  const meta = resolvePageMeta(pathname);

  return (
    <div className="dashboard-panel sticky top-0 z-30 overflow-hidden border-b border-border/70 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Innvox workspace
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <h1 className="text-pretty text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
              {meta.title}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
