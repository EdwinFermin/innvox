"use client";

import * as React from "react";
import { Building2, CircleAlert, ClipboardList, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

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
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

const pieChartConfig = {
  receivable: {
    label: "Por cobrar",
    color: "#0ea5e9",
  },
  payable: {
    label: "Por pagar",
    color: "#f97316",
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

  const balanceChartData = [
    {
      key: "receivable",
      label: "Por cobrar",
      value: receivablesPendingTotal,
      fill: "var(--color-receivable)",
    },
    {
      key: "payable",
      label: "Por pagar",
      value: payablesPendingTotal,
      fill: "var(--color-payable)",
    },
  ].filter((item) => item.value > 0);

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
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-slate-50 via-background to-cyan-50/60 shadow-sm dark:from-slate-950 dark:to-slate-950">
        <CardHeader>
          <CardTitle>Pulso operativo por sucursal</CardTitle>
          <CardDescription>
            Compara ingresos y gastos acumulados para detectar sucursales con mejor traccion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branchPerformance.length > 0 ? (
            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
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
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
              Aun no hay suficiente actividad para comparar sucursales.
            </div>
          )}
        </CardContent>
        <CardFooter className="grid grid-cols-1 gap-3 border-t border-border/50 bg-white/60 sm:grid-cols-2 lg:grid-cols-4 dark:bg-background/30">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-orange-50 via-background to-sky-50/70 shadow-sm dark:from-slate-950 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Balance pendiente</CardTitle>
            <CardDescription>
              Mide la presion entre lo que queda por cobrar y las obligaciones abiertas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceChartData.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="mx-auto h-[220px] max-w-[260px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => currencyFormatter.format(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={balanceChartData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={4}
                  >
                    {balanceChartData.map((item, index) => (
                      <Cell
                        key={item.key}
                        fill={index === 0 ? "var(--color-receivable)" : "var(--color-payable)"}
                      />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
                Sin cuentas pendientes por el momento.
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

        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-amber-50 via-background to-background shadow-sm dark:from-slate-950 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Alertas operativas</CardTitle>
            <CardDescription>
              Prioridades para cobros y pagos que requieren seguimiento inmediato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/70 p-3 dark:bg-background/40"
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
        </Card>
      </div>
    </div>
  );
}
