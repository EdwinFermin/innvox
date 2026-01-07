"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

export const description = "An interactive area chart";

const chartConfig = {
  growth: {
    label: "Crecimiento neto",
    color: "var(--primary)",
  },
  income: {
    label: "Ingresos acumulados",
    color: "var(--chart-income, #0ea5e9)",
  },
  expense: {
    label: "Gastos acumulados",
    color: "var(--chart-expense, #ef4444)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const { data: invoices } = useInvoices();
  const { data: incomes } = useIncomes(userId);
  const { data: expenses } = useExpenses(userId);
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const dailyRollups = React.useMemo(() => {
    const incomeTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();

    const normalizeDate = (value: unknown) => {
      if (!value) return null;
      const date =
        typeof (value as { toDate?: () => Date }).toDate === "function"
          ? (value as { toDate: () => Date }).toDate()
          : new Date(value as string | number | Date);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 10);
    };

    invoices?.forEach((invoice) => {
      const key = normalizeDate(invoice.createdAt);
      if (!key) return;
      incomeTotals.set(
        key,
        (incomeTotals.get(key) ?? 0) + Number(invoice.amount ?? 0)
      );
    });

    incomes?.forEach((income) => {
      const key = normalizeDate(income.date ?? income.createdAt);
      if (!key) return;
      incomeTotals.set(
        key,
        (incomeTotals.get(key) ?? 0) + Number(income.amount ?? 0)
      );
    });

    expenses?.forEach((expense) => {
      const key = normalizeDate(expense.date ?? expense.createdAt);
      if (!key) return;
      expenseTotals.set(
        key,
        (expenseTotals.get(key) ?? 0) + Number(expense.amount ?? 0)
      );
    });

    const allDates = Array.from(
      new Set([...incomeTotals.keys(), ...expenseTotals.keys()])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return allDates.map((date) => ({
      date,
      income: incomeTotals.get(date) ?? 0,
      expense: expenseTotals.get(date) ?? 0,
      net: (incomeTotals.get(date) ?? 0) - (expenseTotals.get(date) ?? 0),
    }));
  }, [expenses, incomes, invoices]);

  const referenceDate = React.useMemo(() => {
    if (!dailyRollups.length) return new Date();
    return new Date(dailyRollups[dailyRollups.length - 1].date);
  }, [dailyRollups]);

  const filteredData = React.useMemo(() => {
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return dailyRollups.filter((item) => new Date(item.date) >= startDate);
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

  return (
    <Card className="@container/card mt-6">
      <CardHeader>
        <CardTitle>Crecimiento del negocio</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Ingresos acumulados menos gastos en el periodo seleccionado
          </span>
          <span className="@[540px]/card:hidden">Crecimiento neto</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Ultimos 3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 días</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
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
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                  formatter={(value) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    }).format(Number(value))
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
