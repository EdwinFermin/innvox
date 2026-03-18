"use client";

import {
  IconArrowWaveRightUp,
  IconCoins,
  IconFileInvoice,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardKpiCardsSkeleton } from "@/components/dashboard/dashboard-loading";
import { useAuthStore } from "@/store/auth";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { useInvoices } from "@/hooks/use-invoices";
import { useReceivables } from "@/hooks/use-receivables";
import { usePayables } from "@/hooks/use-payables";
import { getDateOnlyMonthKey, getTimestampMonthKey, getTodayDateKey, parseDateOnly } from "@/utils/dates";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

function isPendingStatus(status: string | null | undefined) {
  return (status ?? "").toLowerCase() === "pendiente";
}

function getVariation(actual: number, previous: number) {
  if (previous === 0) {
    return 0;
  }

  return Number((((actual - previous) / previous) * 100).toFixed(1));
}

export function SectionCards() {
  const { user } = useAuthStore();
  const userId = user?.id || "";
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(userId);
  const { data: incomes, isLoading: incomesLoading } = useIncomes(userId);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(userId);
  const { data: receivables, isLoading: receivablesLoading } = useReceivables(userId);
  const { data: payables, isLoading: payablesLoading } = usePayables(userId);

  const currentMonthKey = getTodayDateKey().slice(0, 7);
  const [currentYear, currentMonth] = currentMonthKey.split("-").map(Number);
  const previousMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${`${previousMonthDate.getMonth() + 1}`.padStart(2, "0")}`;

  const sumForMonth = <T,>(
    items: T[] | undefined,
    monthKey: string,
    getMonthKey: (item: T) => string | null,
    getAmount: (item: T) => number,
  ) =>
    (items ?? []).reduce((acc, item) => {
      return getMonthKey(item) === monthKey ? acc + getAmount(item) : acc;
    }, 0);

  const ingresosMes = sumForMonth(
    incomes,
    currentMonthKey,
    (i) => getDateOnlyMonthKey(i.date),
    (i) => Number(i.amount || 0),
  );
  const gastosMes = sumForMonth(
    expenses,
    currentMonthKey,
    (e) => getDateOnlyMonthKey(e.date),
    (e) => Number(e.amount || 0),
  );
  const utilidadMes = ingresosMes - gastosMes;
  const facturacionMes = sumForMonth(
    invoices,
    currentMonthKey,
    (invoice) => getTimestampMonthKey(invoice.created_at),
    (invoice) => Number(invoice.amount || 0),
  );

  const ingresosPrev = sumForMonth(
    incomes,
    previousMonthKey,
    (i) => getDateOnlyMonthKey(i.date),
    (i) => Number(i.amount || 0),
  );
  const gastosPrev = sumForMonth(
    expenses,
    previousMonthKey,
    (e) => getDateOnlyMonthKey(e.date),
    (e) => Number(e.amount || 0),
  );
  const utilidadPrev = ingresosPrev - gastosPrev;
  const facturacionPrev = sumForMonth(
    invoices,
    previousMonthKey,
    (invoice) => getTimestampMonthKey(invoice.created_at),
    (invoice) => Number(invoice.amount || 0),
  );

  const receivablesPending = (receivables ?? []).filter((item) => isPendingStatus(item.status));
  const payablesPending = (payables ?? []).filter((item) => isPendingStatus(item.status));

  const cuentasPorCobrar = receivablesPending.reduce(
    (acc, receivable) => acc + Number(receivable.amount || 0),
    0,
  );
  const pagosComprometidos = payablesPending.reduce(
    (acc, payable) => acc + Number(payable.amount || 0),
    0,
  );

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const cobrosUrgentes = receivablesPending.filter((item) => {
    const dueDate = parseDateOnly(item.due_date);
    return dueDate && dueDate <= nextWeek;
  }).length;
  const pagosUrgentes = payablesPending.filter((item) => {
    const dueDate = parseDateOnly(item.due_date);
    return dueDate && dueDate <= nextWeek;
  }).length;

  const margenOperativo =
    ingresosMes === 0 ? 0 : Number(((utilidadMes / ingresosMes) * 100).toFixed(1));
  const cobertura =
    pagosComprometidos === 0
      ? 100
      : Number(((cuentasPorCobrar / pagosComprometidos) * 100).toFixed(1));

  const isLoading =
    !userId ||
    invoicesLoading ||
    incomesLoading ||
    expensesLoading ||
    receivablesLoading ||
    payablesLoading;

  if (isLoading) {
    return <DashboardKpiCardsSkeleton />;
  }

  const resumen = {
    facturacionMes,
    utilidadMes,
    cuentasPorCobrar,
    pagosComprometidos,
    margenOperativo,
    cobertura,
    variacionFacturacion: getVariation(facturacionMes, facturacionPrev),
    variacionUtilidad: getVariation(utilidadMes, utilidadPrev),
    variacionCxc: getVariation(cuentasPorCobrar, pagosComprometidos || 0),
    variacionPagos: getVariation(gastosMes, gastosPrev),
    cobrosUrgentes,
    pagosUrgentes,
  };

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card overflow-hidden rounded-[1.6rem] border-emerald-200/70 bg-gradient-to-br from-emerald-100/70 via-card to-card shadow-[0_18px_42px_-30px_rgba(5,150,105,0.5)]">
        <CardHeader className="gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800/80">
            Facturacion del mes
          </CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums tracking-[-0.03em] md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {currencyFormatter.format(resumen.facturacionMes)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-emerald-300/70 bg-white/80 text-emerald-700">
              <IconFileInvoice />
              {resumen.variacionFacturacion > 0 ? "+" : ""}
              {resumen.variacionFacturacion}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-t border-emerald-200/70 bg-white/55 text-sm backdrop-blur-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ticket comercial en movimiento <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Compara lo facturado contra el ritmo del mes anterior.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card overflow-hidden rounded-[1.6rem] border-sky-200/70 bg-gradient-to-br from-sky-100/70 via-card to-card shadow-[0_18px_42px_-30px_rgba(14,165,233,0.45)]">
        <CardHeader className="gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-800/80">
            Flujo neto mensual
          </CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums tracking-[-0.03em] md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {currencyFormatter.format(resumen.utilidadMes)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-sky-300/70 bg-white/80 text-sky-700">
              <IconTrendingUp />
              {resumen.variacionUtilidad > 0 ? "+" : ""}
              {resumen.variacionUtilidad}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-t border-sky-200/70 bg-white/55 text-sm backdrop-blur-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Margen operativo {resumen.margenOperativo}% <IconArrowWaveRightUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Balance entre ingresos cobrados y gastos operativos del mes.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card overflow-hidden rounded-[1.6rem] border-amber-200/70 bg-gradient-to-br from-amber-100/70 via-card to-card shadow-[0_18px_42px_-30px_rgba(245,158,11,0.45)]">
        <CardHeader className="gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800/80">
            Cobros pendientes
          </CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums tracking-[-0.03em] md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {currencyFormatter.format(resumen.cuentasPorCobrar)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-amber-300/70 bg-white/80 text-amber-700">
              <IconCoins />
              {resumen.cobrosUrgentes} urgentes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-t border-amber-200/70 bg-white/55 text-sm backdrop-blur-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Cartera por recuperar <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Prioriza los cobros con vencimiento en los proximos 7 dias.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card overflow-hidden rounded-[1.6rem] border-rose-200/70 bg-gradient-to-br from-rose-100/70 via-card to-card shadow-[0_18px_42px_-30px_rgba(244,63,94,0.4)]">
        <CardHeader className="gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-800/80">
            Pagos comprometidos
          </CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums tracking-[-0.03em] md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {currencyFormatter.format(resumen.pagosComprometidos)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="max-w-full border-rose-300/70 bg-white/80 text-rose-700">
              <IconTrendingDown />
              {resumen.pagosUrgentes} venc.
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-t border-rose-200/70 bg-white/55 text-sm backdrop-blur-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Cobertura proyectada {resumen.cobertura}% <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Cruza pagos pendientes contra la cartera pendiente por cobrar.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
