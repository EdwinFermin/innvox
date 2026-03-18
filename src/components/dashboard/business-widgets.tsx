"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CircleAlert,
  ClipboardList,
  UsersRound,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { DashboardWidgetsSkeleton } from "@/components/dashboard/dashboard-loading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useBranches } from "@/hooks/use-branches";
import { useClients } from "@/hooks/use-clients";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useAuthStore } from "@/store/auth";
import { getTodayDateKey, getTimestampMonthKey, parseDateOnly } from "@/utils/dates";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

const barChartConfig = {
  income: {
    label: "Ingresos",
    color: "#0f766e",
  },
  expense: {
    label: "Gastos",
    color: "#fb923c",
  },
} satisfies ChartConfig;

function isPendingStatus(status: string | null | undefined) {
  return (status ?? "").toLowerCase() === "pendiente";
}

function getDaysUntil(dateValue: string) {
  const date = parseDateOnly(dateValue);

  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export function BusinessWidgets() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const allowedBranchIds = user?.type === "USER" ? user.branch_ids : undefined;

  const { data: branches, isLoading: branchesLoading } = useBranches(
    userId,
    allowedBranchIds,
  );
  const { data: clients, isLoading: clientsLoading } = useClients(userId);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(userId);
  const { data: incomes, isLoading: incomesLoading } = useIncomes(userId);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(userId);
  const { data: receivables, isLoading: receivablesLoading } = useReceivables(userId);
  const { data: payables, isLoading: payablesLoading } = usePayables(userId);

  const currentMonthKey = getTodayDateKey().slice(0, 7);

  const branchPerformance = React.useMemo(() => {
    const map = new Map<string, { branch: string; income: number; expense: number; net: number }>();

    branches.forEach((branch) => {
      map.set(branch.id, {
        branch: branch.code,
        income: 0,
        expense: 0,
        net: 0,
      });
    });

    incomes.forEach((income) => {
      if (!income.branch_id) return;
      const current = map.get(income.branch_id);
      if (!current) return;
      current.income += Number(income.amount || 0);
      current.net += Number(income.amount || 0);
    });

    expenses.forEach((expense) => {
      if (!expense.branch_id) return;
      const current = map.get(expense.branch_id);
      if (!current) return;
      current.expense += Number(expense.amount || 0);
      current.net -= Number(expense.amount || 0);
    });

    return Array.from(map.values())
      .filter((item) => item.income > 0 || item.expense > 0)
      .sort((a, b) => b.net - a.net)
      .slice(0, 6);
  }, [branches, expenses, incomes]);

  const receivablesPending = React.useMemo(
    () => receivables.filter((item) => isPendingStatus(item.status)),
    [receivables],
  );
  const payablesPending = React.useMemo(
    () => payables.filter((item) => isPendingStatus(item.status)),
    [payables],
  );

  const receivablesPendingTotal = receivablesPending.reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0,
  );
  const payablesPendingTotal = payablesPending.reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0,
  );

  const monthInvoices = invoices.filter(
    (invoice) => getTimestampMonthKey(invoice.created_at) === currentMonthKey,
  );
  const monthInvoicedTotal = monthInvoices.reduce(
    (acc, invoice) => acc + Number(invoice.amount || 0),
    0,
  );
  const averageTicket = monthInvoices.length === 0 ? 0 : monthInvoicedTotal / monthInvoices.length;

  const alerts = React.useMemo(() => {
    const items = [
      ...receivablesPending.map((item) => ({
        id: `receivable-${item.id}`,
        type: "Cobro",
        name: item.name,
        amount: Number(item.amount || 0),
        dueDate: item.due_date,
        daysUntil: getDaysUntil(item.due_date),
      })),
      ...payablesPending.map((item) => ({
        id: `payable-${item.id}`,
        type: "Pago",
        name: item.name,
        amount: Number(item.amount || 0),
        dueDate: item.due_date,
        daysUntil: getDaysUntil(item.due_date),
      })),
    ];

    return items
      .filter((item) => item.daysUntil <= 10)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [payablesPending, receivablesPending]);

  const recentActivity = React.useMemo(() => {
    const items = [
      ...invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: invoice.client_name || invoice.description || invoice.id,
        type: "Factura",
        amount: Number(invoice.amount || 0),
        date: invoice.created_at,
        tone: "positive" as const,
      })),
      ...incomes.map((income) => ({
        id: `income-${income.id}`,
        title: income.description || income.friendly_id,
        type: "Ingreso",
        amount: Number(income.amount || 0),
        date: income.created_at || income.date,
        tone: "positive" as const,
      })),
      ...expenses.map((expense) => ({
        id: `expense-${expense.id}`,
        title: expense.description || expense.friendly_id,
        type: "Gasto",
        amount: Number(expense.amount || 0),
        date: expense.created_at || expense.date,
        tone: "negative" as const,
      })),
    ];

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [expenses, incomes, invoices]);

  const isLoading =
    !userId ||
    branchesLoading ||
    clientsLoading ||
    invoicesLoading ||
    incomesLoading ||
    expensesLoading ||
    receivablesLoading ||
    payablesLoading;

  if (isLoading) {
    return <DashboardWidgetsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden rounded-[1.9rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.96))] shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:from-slate-950 dark:to-slate-950">
          <CardHeader>
            <CardTitle className="text-xl tracking-[-0.03em]">Actividad reciente</CardTitle>
            <CardDescription>
              Ultimos eventos que impactan ventas, cobros y egresos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-border/60 bg-white/72 p-3 backdrop-blur-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        item.tone === "positive"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {item.tone === "positive" ? (
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownLeft className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{item.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.type} · {new Intl.DateTimeFormat("es-DO", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(item.date))}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`shrink-0 text-right text-sm font-semibold ${
                      item.tone === "positive" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {item.tone === "positive" ? "+" : "-"}
                    {currencyFormatter.format(item.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
                Aun no hay actividad reciente para mostrar.
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-border/50 text-sm">
            <span className="text-muted-foreground">Ticket promedio</span>
            <span className="font-semibold text-foreground">{currencyFormatter.format(averageTicket)}</span>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden rounded-[1.9rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.96))] shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:from-slate-950 dark:to-slate-950">
          <CardHeader>
            <CardTitle className="text-xl tracking-[-0.03em]">Pendientes y alertas</CardTitle>
            <CardDescription>
              Balancea cartera abierta y compromisos que requieren seguimiento inmediato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-sky-200/70 bg-sky-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-800/80">Por cobrar</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-sky-950">
                  {currencyFormatter.format(receivablesPendingTotal)}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-orange-200/70 bg-orange-50/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-orange-800/80">Por pagar</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-orange-950">
                  {currencyFormatter.format(payablesPendingTotal)}
                </div>
              </div>
            </div>
            {alerts.length > 0 ? (
              alerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-border/60 bg-white/72 p-3 dark:bg-background/40"
                >
                  <div>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.type} - vence {item.daysUntil <= 0 ? "hoy" : `en ${item.daysUntil} dias`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      {currencyFormatter.format(item.amount)}
                    </div>
                    <Badge variant="outline">
                      {item.type}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                No hay vencimientos criticos en los proximos 10 dias.
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-border/50 text-sm">
            <span className="text-muted-foreground">Cobertura abierta</span>
            <span className="font-semibold text-foreground">
              {payablesPendingTotal === 0
                ? "100%"
                : `${((receivablesPendingTotal / payablesPendingTotal) * 100).toFixed(0)}%`}
            </span>
          </CardFooter>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[1.9rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.95))] shadow-[0_20px_52px_-34px_rgba(15,23,42,0.26)] dark:from-slate-950 dark:to-slate-950">
        <CardHeader>
          <CardTitle className="text-xl tracking-[-0.03em]">Pulso operativo por sucursal</CardTitle>
          <CardDescription>
            Compara ingresos y gastos acumulados para detectar sucursales con mejor traccion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branchPerformance.length > 0 ? (
            <ChartContainer config={barChartConfig} className="h-[260px] w-full">
              <BarChart data={branchPerformance} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} hide />
                <YAxis
                  type="category"
                  dataKey="branch"
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) => currencyFormatter.format(Number(value))}
                    />
                  }
                />
                <Bar dataKey="income" name="income" radius={[0, 8, 8, 0]} fill="var(--color-income)" />
                <Bar dataKey="expense" name="expense" radius={[0, 8, 8, 0]} fill="var(--color-expense)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
              Aun no hay suficiente actividad para comparar sucursales.
            </div>
          )}
        </CardContent>
        <CardFooter className="grid grid-cols-1 gap-3 border-t border-border/50 bg-white/70 sm:grid-cols-2 xl:grid-cols-4 dark:bg-background/30">
          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Building2 className="size-4" />
              Sucursales
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{branches.length}</div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <UsersRound className="size-4" />
              Clientes
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{clients.length}</div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ClipboardList className="size-4" />
              Facturas del mes
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{monthInvoices.length}</div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CircleAlert className="size-4" />
              Ticket promedio
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">
              {currencyFormatter.format(averageTicket)}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
