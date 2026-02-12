"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useReceivables } from "@/hooks/use-receivables";
import { usePayables } from "@/hooks/use-payables";

export function SectionCards() {
  const { user } = useAuthStore();
  const { data: incomes } = useIncomes(user?.id || "");
  const { data: expenses } = useExpenses(user?.id || "");
  const { data: receivables } = useReceivables(user?.id || "");
  const { data: payables } = usePayables(user?.id || "");

  const now = new Date();
  const prev = new Date(now);
  prev.setMonth(prev.getMonth() - 1);

  const isSameMonth = (date: Date, ref: Date) =>
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth();

  const sumForMonth = <T,>(
    items: T[] | undefined,
    ref: Date,
    getDate: (item: T) => Date | null,
    getAmount: (item: T) => number,
  ) =>
    (items ?? []).reduce((acc, item) => {
      const d = getDate(item);
      if (!d) return acc;
      return isSameMonth(d, ref) ? acc + getAmount(item) : acc;
    }, 0);

  const safeDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate: unknown }).toDate === "function"
    ) {
      return (value as { toDate: () => Date }).toDate();
    }
    return null;
  };

  const ingresosMes = sumForMonth(
    incomes,
    now,
    (i) => safeDate(i.date),
    (i) => Number(i.amount || 0),
  );
  const gastosMes = sumForMonth(
    expenses,
    now,
    (e) => safeDate(e.date),
    (e) => Number(e.amount || 0),
  );
  const utilidadMes = ingresosMes - gastosMes;

  const ingresosPrev = sumForMonth(
    incomes,
    prev,
    (i) => safeDate(i.date),
    (i) => Number(i.amount || 0),
  );
  const gastosPrev = sumForMonth(
    expenses,
    prev,
    (e) => safeDate(e.date),
    (e) => Number(e.amount || 0),
  );
  const utilidadPrev = ingresosPrev - gastosPrev;

  const cuentasPorCobrar =
    (receivables ?? []).reduce((acc, r) => acc + Number(r.amount || 0), 0) -
    (payables ?? []).reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const variacion = (actual: number, anterior: number) =>
    anterior === 0
      ? 0
      : Number((((actual - anterior) / anterior) * 100).toFixed(1));

  const resumen = {
    ingresosMes,
    gastosMes,
    utilidadMes,
    cuentasPorCobrar,
    variacionIngresos: variacion(ingresosMes, ingresosPrev),
    variacionGastos: variacion(gastosMes, gastosPrev),
    variacionUtilidad: variacion(utilidadMes, utilidadPrev),
    variacionCxc: 0,
  };

  const formato = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 2,
  });

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Ingresos del mes</CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {formato.format(resumen.ingresosMes)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {resumen.variacionIngresos > 0 ? "+" : ""}
              {resumen.variacionIngresos}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Tendencia mensual <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Ingresos registrados en todas las sucursales este mes.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Gastos del mes</CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {formato.format(resumen.gastosMes)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              {resumen.variacionGastos}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Variación de gastos vs. periodo anterior
            <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Considera revisar gastos operativos y variables.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Utilidad neta</CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {formato.format(resumen.utilidadMes)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {resumen.variacionUtilidad > 0 ? "+" : ""}
              {resumen.variacionUtilidad}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Resultado después de ingresos y gastos
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Indicador clave de salud financiera del mes.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cuentas por cobrar</CardDescription>
          <CardTitle className="min-w-0 text-base font-semibold tabular-nums md:text-lg 2xl:text-xl 2xl:@[300px]/card:text-2xl">
            {formato.format(resumen.cuentasPorCobrar)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {resumen.variacionCxc > 0 ? "+" : ""}
              {resumen.variacionCxc}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total pendiente de cobro <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Vigila vencimientos para mejorar flujo de caja.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
