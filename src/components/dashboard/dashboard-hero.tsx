"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightLeft, FileText, Landmark, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { mapError } from "@/lib/error-messages";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { useInvoices } from "@/hooks/use-invoices";
import { useAuthStore } from "@/store/auth";
import { getDateOnlyMonthKey, getTimestampMonthKey, getTodayDateKey } from "@/utils/dates";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

// Discriminated trend result driving the hero trend badges.
// previous > 0 → signed % to 1 decimal; previous === 0 && actual > 0 → "Nuevo";
// both 0 → no badge.
type TrendResult =
  | { kind: "percent"; value: number }
  | { kind: "new" }
  | { kind: "none" };

function computeTrend(actual: number, previous: number): TrendResult {
  if (previous > 0) {
    return {
      kind: "percent",
      value: Number((((actual - previous) / previous) * 100).toFixed(1)),
    };
  }
  if (actual > 0) {
    return { kind: "new" };
  }
  return { kind: "none" };
}

function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.kind === "none") {
    return null;
  }

  return (
    <Badge className="border-white/15 bg-white/12 text-white">
      {trend.kind === "new" ? "Nuevo" : `${trend.value > 0 ? "+" : ""}${trend.value}%`}
    </Badge>
  );
}

export function DashboardHero() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const allowedBranchIds = user?.type === "USER" ? user.branch_ids : undefined;
  const {
    data: bankAccounts,
    isLoading: bankAccountsLoading,
    isError: bankAccountsError,
    error: bankAccountsErrorValue,
    refetch: refetchBankAccounts,
  } = useBankAccounts(userId, { allowedBranchIds });
  const {
    data: incomes,
    isLoading: incomesLoading,
    isError: incomesError,
    error: incomesErrorValue,
    refetch: refetchIncomes,
  } = useIncomes(userId);
  const {
    data: expenses,
    isLoading: expensesLoading,
    isError: expensesError,
    error: expensesErrorValue,
    refetch: refetchExpenses,
  } = useExpenses(userId);
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
    error: invoicesErrorValue,
    refetch: refetchInvoices,
  } = useInvoices(userId);

  const currentMonthKey = getTodayDateKey().slice(0, 7);
  const [currentYear, currentMonth] = currentMonthKey.split("-").map(Number);
  const previousMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${`${previousMonthDate.getMonth() + 1}`.padStart(2, "0")}`;

  const totals = React.useMemo(() => {
    const balance = bankAccounts.reduce((acc, account) => acc + Number(account.current_balance || 0), 0);
    const monthIncome = incomes.reduce((acc, income) => {
      return getDateOnlyMonthKey(income.date) === currentMonthKey
        ? acc + Number(income.amount || 0)
        : acc;
    }, 0);
    const monthExpense = expenses.reduce((acc, expense) => {
      return getDateOnlyMonthKey(expense.date) === currentMonthKey
        ? acc + Number(expense.amount || 0)
        : acc;
    }, 0);
    const prevIncome = incomes.reduce((acc, income) => {
      return getDateOnlyMonthKey(income.date) === previousMonthKey
        ? acc + Number(income.amount || 0)
        : acc;
    }, 0);
    const prevExpense = expenses.reduce((acc, expense) => {
      return getDateOnlyMonthKey(expense.date) === previousMonthKey
        ? acc + Number(expense.amount || 0)
        : acc;
    }, 0);
    const facturacionMes = invoices.reduce((acc, invoice) => {
      return getTimestampMonthKey(invoice.created_at) === currentMonthKey
        ? acc + Number(invoice.amount || 0)
        : acc;
    }, 0);
    const facturacionPrev = invoices.reduce((acc, invoice) => {
      return getTimestampMonthKey(invoice.created_at) === previousMonthKey
        ? acc + Number(invoice.amount || 0)
        : acc;
    }, 0);

    return {
      balance,
      monthIncome,
      monthExpense,
      netFlow: monthIncome - monthExpense,
      facturacionMes,
      facturacionPrev,
      prevNetFlow: prevIncome - prevExpense,
    };
  }, [bankAccounts, currentMonthKey, previousMonthKey, expenses, incomes, invoices]);

  const isError =
    bankAccountsError ||
    incomesError ||
    expensesError ||
    invoicesError;
  // First truthy error in the spec's listed hook order.
  const firstError =
    bankAccountsErrorValue ??
    incomesErrorValue ??
    expensesErrorValue ??
    invoicesErrorValue;
  const retryAll = () => {
    refetchBankAccounts();
    refetchIncomes();
    refetchExpenses();
    refetchInvoices();
  };

  const isLoading =
    !userId ||
    bankAccountsLoading ||
    incomesLoading ||
    expensesLoading ||
    invoicesLoading;

  // Error wins over loading: React Query marks isError only after all retries,
  // so by then isLoading is already false (R13/R14).
  if (isError) {
    return (
      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(17,121,117,0.18),transparent_42%),linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,118,110,0.96))] text-white shadow-[0_30px_80px_-34px_rgba(15,118,110,0.65)]">
        <CardContent className="px-6 py-7 sm:px-7">
          <ErrorState
            title="Algo salió mal"
            description={mapError(firstError)}
            onRetry={retryAll}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(17,121,117,0.18),transparent_42%),linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,118,110,0.96))] text-white shadow-[0_30px_80px_-34px_rgba(15,118,110,0.65)]">
        <CardContent className="grid gap-6 px-6 py-7 sm:px-7 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded-full bg-white/20" />
            <div className="h-12 w-60 animate-pulse rounded-full bg-white/20" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/10" />
              ))}
            </div>
          </div>
          <div className="h-40 animate-pulse rounded-[2rem] bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  const facturacionTrend = computeTrend(totals.facturacionMes, totals.facturacionPrev);
  const netFlowTrend = computeTrend(totals.netFlow, totals.prevNetFlow);

  return (
    <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_28%),linear-gradient(135deg,#083344,#0f766e_48%,#115e59)] text-white shadow-[0_32px_90px_-34px_rgba(8,51,68,0.72)]">
      <CardContent className="relative grid gap-6 px-6 py-7 sm:px-7 lg:grid-cols-[1.3fr_0.95fr] lg:items-end lg:gap-8">
        <div className="absolute inset-y-0 right-0 hidden w-[36%] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent)] lg:block" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/15 bg-white/10 px-3 py-1 text-white backdrop-blur-sm">
              Panorama general
            </Badge>
            <span className="text-sm text-white/72">Actualizado con datos en vivo</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-white/64">Balance total disponible</p>
            <div className="text-[clamp(2.2rem,1.6rem+2vw,4rem)] font-semibold tracking-[-0.05em] text-white">
              {currencyFormatter.format(totals.balance)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/78">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                <Landmark className="size-4" aria-hidden="true" />
                {bankAccounts.length} cuentas activas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                <ArrowRightLeft className="size-4" aria-hidden="true" />
                Flujo neto del mes {currencyFormatter.format(totals.netFlow)}
                <TrendBadge trend={netFlowTrend} />
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.22em] text-white/62">Facturación del mes</div>
                <TrendBadge trend={facturacionTrend} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.03em]">
                <FileText className="size-4 text-sky-300" aria-hidden="true" />
                {currencyFormatter.format(totals.facturacionMes)}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-white/62">Ingresos</div>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.03em]">
                <TrendingUp className="size-4 text-emerald-300" aria-hidden="true" />
                {currencyFormatter.format(totals.monthIncome)}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-white/62">Gastos</div>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.03em]">
                <TrendingDown className="size-4 text-rose-300" aria-hidden="true" />
                {currencyFormatter.format(totals.monthExpense)}
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid gap-3">
          <div className="rounded-[1.8rem] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <div className="text-xs uppercase tracking-[0.22em] text-white/62">Acciones rápidas</div>
            <p className="mt-3 text-sm leading-6 text-white/74">
              Registra movimientos y revisa tus cuentas sin salir del panorama general.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="rounded-2xl bg-white text-slate-900 hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                <Link href="/dashboard/transactions/incomes?new=1">Registrar ingreso</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-2xl border border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white">
                <Link href="/dashboard/bank-accounts">Ver cuentas</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
