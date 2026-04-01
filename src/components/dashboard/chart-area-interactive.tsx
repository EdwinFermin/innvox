"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { DashboardChartSkeleton } from "@/components/dashboard/dashboard-loading";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInvoices } from "@/hooks/use-invoices";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useAuthStore } from "@/store/auth";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  extractDateOnlyKey,
  getTodayDateKey,
  getTimestampDateKey,
  parseDateOnly,
} from "@/utils/dates";

export const description = "An interactive area chart";

const chartConfig = {
  growth: {
    label: "Crecimiento neto",
    color: "#0f766e",
  },
  income: {
    label: "Ingresos acumulados",
    color: "#0ea5e9",
  },
  expense: {
    label: "Gastos acumulados",
    color: "#f97316",
  },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? "";
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(userId);
  const { data: incomes, isLoading: incomesLoading } = useIncomes(userId);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(userId);
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const dailyRollups = React.useMemo(() => {
    const incomeTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();

    invoices?.forEach((invoice) => {
      const key = getTimestampDateKey(invoice.created_at);
      if (!key) return;
      incomeTotals.set(
        key,
        (incomeTotals.get(key) ?? 0) + Number(invoice.amount ?? 0)
      );
    });

    incomes?.forEach((income) => {
      const key = extractDateOnlyKey(income.date);
      if (!key) return;
      incomeTotals.set(
        key,
        (incomeTotals.get(key) ?? 0) + Number(income.amount ?? 0)
      );
    });

    expenses?.forEach((expense) => {
      const key = extractDateOnlyKey(expense.date);
      if (!key) return;
      expenseTotals.set(
        key,
        (expenseTotals.get(key) ?? 0) + Number(expense.amount ?? 0)
      );
    });

    const allDates = Array.from(
      new Set([...incomeTotals.keys(), ...expenseTotals.keys()])
    ).sort();

    return allDates.map((date) => ({
      date,
      income: incomeTotals.get(date) ?? 0,
      expense: expenseTotals.get(date) ?? 0,
      net: (incomeTotals.get(date) ?? 0) - (expenseTotals.get(date) ?? 0),
    }));
  }, [expenses, incomes, invoices]);

  const referenceDate = React.useMemo(() => parseDateOnly(getTodayDateKey()), []);

  const filteredData = React.useMemo(() => {
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    if (!referenceDate) return [];

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return dailyRollups.filter((item) => {
      const pointDate = parseDateOnly(item.date);
      if (!pointDate) return false;
      return pointDate >= startDate && pointDate <= referenceDate;
    });
  }, [dailyRollups, referenceDate, timeRange]);

  const growthData = React.useMemo(() => {
    return filteredData.reduce<
      Array<
        (typeof filteredData)[number] & {
          growth: number;
        }
      >
    >((acc, item) => {
      const prev = acc.at(-1);
      const incomeRunning = (prev?.income ?? 0) + item.income;
      const expenseRunning = (prev?.expense ?? 0) + item.expense;
      const netRunning = (prev?.growth ?? 0) + item.net;

      acc.push({
        ...item,
        income: incomeRunning,
        expense: expenseRunning,
        growth: netRunning,
      });
      return acc;
    }, []);
  }, [filteredData]);

  const periodSummary = React.useMemo(() => {
    const incomeTotal = filteredData.reduce((acc, item) => acc + item.income, 0);
    const expenseTotal = filteredData.reduce((acc, item) => acc + item.expense, 0);
    const netTotal = incomeTotal - expenseTotal;

    const strongestDay = filteredData.reduce<(typeof filteredData)[number] | null>(
      (best, item) => {
        if (!best || item.net > best.net) {
          return item;
        }
        return best;
      },
      null,
    );

    return {
      incomeTotal,
      expenseTotal,
      netTotal,
      strongestDay,
    };
  }, [filteredData]);

  if (!userId || invoicesLoading || incomesLoading || expensesLoading) {
    return <DashboardChartSkeleton />;
  }

  return (
    <Card className="@container/card overflow-hidden rounded-[1.9rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.94))] shadow-[0_20px_52px_-34px_rgba(15,23,42,0.26)] dark:bg-none dark:bg-card dark:shadow-[0_20px_52px_-34px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-4 border-b border-border/60 pb-5">
        <CardTitle className="text-xl tracking-[-0.03em]">Flujo de caja</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Ingresos acumulados menos gastos en el periodo seleccionado
          </span>
          <span className="@[540px]/card:hidden">Flujo neto</span>
        </CardDescription>
        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-emerald-200/70 bg-white/82 p-3 backdrop-blur dark:border-emerald-900/40 dark:bg-background/60">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              Ingresos
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {currencyFormatter.format(periodSummary.incomeTotal)}
            </div>
          </div>
          <div className="rounded-[1.2rem] border border-orange-200/70 bg-white/82 p-3 backdrop-blur dark:border-orange-900/40 dark:bg-background/60">
            <div className="text-xs uppercase tracking-[0.18em] text-orange-700 dark:text-orange-400">
              Gastos
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {currencyFormatter.format(periodSummary.expenseTotal)}
            </div>
          </div>
          <div className="rounded-[1.2rem] border border-sky-200/70 bg-white/82 p-3 backdrop-blur dark:border-sky-900/40 dark:bg-background/60">
            <div className="text-xs uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400">
              Neto acumulado
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {currencyFormatter.format(periodSummary.netTotal)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Mejor dia: {currencyFormatter.format(periodSummary.strongestDay?.net ?? 0)}
            </div>
          </div>
        </div>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:rounded-full *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Ultimos 3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 días</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Selecciona un periodo"
            >
              <SelectValue placeholder="Ultimos 3 meses" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="90d" className="rounded-xl">
                Ultimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-xl">
                Ultimos 30 dias
              </SelectItem>
              <SelectItem value="7d" className="rounded-xl">
                Ultimos 7 dias
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={growthData}>
            <defs>
              <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-growth)"
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-growth)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = parseDateOnly(value);
                return date?.toLocaleDateString("es-DO", {
                  month: "short",
                  day: "numeric",
                }) ?? value;
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = parseDateOnly(value);
                    return date?.toLocaleDateString("es-DO", {
                      month: "short",
                      day: "numeric",
                    }) ?? value;
                  }}
                  indicator="dot"
                  formatter={(value) =>
                    currencyFormatter.format(Number(value))
                  }
                />
              }
            />
            <Area
              dataKey="growth"
              type="natural"
              fill="url(#fillGrowth)"
              stroke="var(--color-growth)"
            />
            <Area
              dataKey="income"
              type="natural"
              fill="none"
              stroke="var(--color-income)"
              strokeWidth={2}
            />
            <Area
              dataKey="expense"
              type="natural"
              fill="none"
              stroke="var(--color-expense)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
