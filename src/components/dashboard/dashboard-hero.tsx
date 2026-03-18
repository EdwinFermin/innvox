"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightLeft, Landmark, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useAuthStore } from "@/store/auth";
import { getDateOnlyMonthKey, getTodayDateKey } from "@/utils/dates";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

function isPendingStatus(status: string | null | undefined) {
  return (status ?? "").toLowerCase() === "pendiente";
}

export function DashboardHero() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const allowedBranchIds = user?.type === "USER" ? user.branch_ids : undefined;
  const { data: bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts(userId, {
    allowedBranchIds,
  });
  const { data: incomes, isLoading: incomesLoading } = useIncomes(userId);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(userId);
  const { data: receivables, isLoading: receivablesLoading } = useReceivables(userId);
  const { data: payables, isLoading: payablesLoading } = usePayables(userId);

  const currentMonthKey = getTodayDateKey().slice(0, 7);

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
    const receivablePending = receivables
      .filter((item) => isPendingStatus(item.status))
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const payablePending = payables
      .filter((item) => isPendingStatus(item.status))
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      balance,
      monthIncome,
      monthExpense,
      netFlow: monthIncome - monthExpense,
      receivablePending,
      payablePending,
    };
  }, [bankAccounts, currentMonthKey, expenses, incomes, payables, receivables]);

  const isLoading =
    !userId ||
    bankAccountsLoading ||
    incomesLoading ||
    expensesLoading ||
    receivablesLoading ||
    payablesLoading;

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
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-white/62">Pendiente neto</div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                {currencyFormatter.format(totals.receivablePending - totals.payablePending)}
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid gap-3">
          <div className="rounded-[1.8rem] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/62">Presion operativa</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {currencyFormatter.format(totals.payablePending)}
                </div>
              </div>
              <Badge className="border-white/15 bg-white/12 text-white">Por pagar</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/74">
              Cruza compromisos abiertos contra cobranza pendiente para priorizar acciones.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="rounded-2xl bg-white text-slate-900 hover:bg-white/90">
                <Link href="/dashboard/transactions/incomes?new=1">Registrar ingreso</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-2xl border border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white">
                <Link href="/dashboard/bank-accounts">Ver cuentas</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-white/62">Por cobrar</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                {currencyFormatter.format(totals.receivablePending)}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur-md">
              <div className="text-xs uppercase tracking-[0.22em] text-white/62">Por pagar</div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                {currencyFormatter.format(totals.payablePending)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
