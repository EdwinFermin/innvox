"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useDailyCloseReport, type DailyCloseMovementRow } from "@/hooks/use-daily-close-report";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { useBranches } from "@/hooks/use-branches";
import { usePrintDailyClose } from "@/hooks/use-print-daily-close";
import { useAuthStore } from "@/store/auth";
import type { Currency } from "@/types/bank-account.types";
import { formatDateOnly, getTodayDateKey } from "@/utils/dates";

function formatMoney(currency: Currency, amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function movementTypeLabel(row: DailyCloseMovementRow) {
  if (row.kind === "expense") return "Gasto";
  return row.method === "cash" ? "Ingreso efectivo" : "Ingreso transferencia";
}

function movementPillClass(row: DailyCloseMovementRow) {
  if (row.kind === "expense") return "border-red-200 bg-red-50 text-red-700";
  return row.method === "cash"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function accountLabel(row: DailyCloseMovementRow) {
  if (row.bankAccountName) return row.bankAccountName;
  if (row.kind === "income" && row.method === "cash") return "Efectivo";
  if (row.kind === "expense" && row.paymentMethod === "cash") return "Efectivo";
  return "Sin cuenta";
}

export default function DailyCloseReportPage() {
  const { user } = useAuthStore();
  const allowedBranchIds = user?.type === "USER" ? user.branch_ids : undefined;

  const { data: branches, isLoading: isBranchesLoading } = useBranches(
    user?.id || "",
    allowedBranchIds,
  );
  const { data: incomes, isLoading: isIncomesLoading } = useIncomes(user?.id || "");
  const { data: expenses, isLoading: isExpensesLoading } = useExpenses(user?.id || "");

  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedBranchId, setSelectedBranchId] = React.useState("");

  React.useEffect(() => {
    setSelectedDate((currentDate) => currentDate || getTodayDateKey());
  }, []);

  React.useEffect(() => {
    if (!branches.length) {
      setSelectedBranchId("");
      return;
    }

    if (!selectedBranchId || !branches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const { data: accounts } = useBankAccounts(user?.id || "", {
    branchId: selectedBranchId || undefined,
    allowedBranchIds,
    activeOnly: false,
  });

  const report = useDailyCloseReport({
    incomes,
    expenses,
    accounts,
    selectedDate,
    selectedBranchId,
  });

  const branchLabel = React.useMemo(() => {
    return (
      branches.find((branch) => branch.id === selectedBranchId)?.name ||
      "Sin sucursal"
    );
  }, [branches, selectedBranchId]);

  const dateLabel = React.useMemo(() => {
    if (!selectedDate) return "Sin fecha";

    return formatDateOnly(selectedDate, "d 'de' MMM yyyy", es) ?? "Sin fecha";
  }, [selectedDate]);

  const { print, PrintContainer } = usePrintDailyClose();
  const printPayload = React.useMemo(
    () => ({
      title: "Cuadre del día",
      description:
        "Consolidado del dinero recibido por transferencia, recibido en efectivo y gastado durante el día seleccionado.",
      dateLabel,
      branchLabel,
      currency: report.currency,
      summary: report.summary,
      cashIncomeRows: report.cashIncomeRows,
      transferIncomeRows: report.transferIncomeRows,
      expenseRows: report.expenseRows,
      movementRows: report.movementRows,
    }),
    [branchLabel, dateLabel, report],
  );

  const isLoading = isBranchesLoading || isIncomesLoading || isExpensesLoading;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-base font-semibold md:text-lg 2xl:text-2xl">
          Cuadre del día
        </h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Consolidado por sucursal del dinero recibido por transferencia, del
            dinero recibido en efectivo y de todos los gastos del día.
          </p>
          <p>
            Fecha: {dateLabel} · Sucursal: {branchLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={() => print()} disabled={!selectedBranchId}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            El reporte solo muestra los movimientos del día y la sucursal seleccionados.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-9 w-full rounded-md border border-input px-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Sucursal</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setSelectedDate(getTodayDateKey())}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isLoading && !branches.length ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            No hay sucursales disponibles para generar el cuadre del día.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Ingresos por transferencia
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base font-semibold text-emerald-700 md:text-lg 2xl:text-2xl">
            {formatMoney(report.currency, report.summary.transferIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Ingresos en efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base font-semibold text-amber-700 md:text-lg 2xl:text-2xl">
            {formatMoney(report.currency, report.summary.cashIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Gastos del día
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base font-semibold text-red-700 md:text-lg 2xl:text-2xl">
            {formatMoney(report.currency, report.summary.expenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Neto del día
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-base font-semibold md:text-lg 2xl:text-2xl ${
              report.summary.net >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatMoney(report.currency, report.summary.net)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Divisiones</CardTitle>
          <CardDescription>
            Resumen separado por transferencias, efectivo y gastos del día.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-medium text-emerald-700">Transferencias</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-800">
              {formatMoney(report.currency, report.summary.transferIncome)}
            </div>
            <div className="mt-1 text-sm text-emerald-700">
              {report.transferIncomeRows.length} movimiento(s)
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-medium text-amber-700">Efectivo</div>
            <div className="mt-2 text-2xl font-semibold text-amber-800">
              {formatMoney(report.currency, report.summary.cashIncome)}
            </div>
            <div className="mt-1 text-sm text-amber-700">
              {report.cashIncomeRows.length} movimiento(s)
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-medium text-red-700">Gastos</div>
            <div className="mt-2 text-2xl font-semibold text-red-800">
              {formatMoney(report.currency, report.summary.expenses)}
            </div>
            <div className="mt-1 text-sm text-red-700">
              {report.expenseRows.length} movimiento(s)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos del día</CardTitle>
          <CardDescription>
            Solo incluye ingresos y gastos de la sucursal y la fecha seleccionadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta / origen</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.movementRows.length ? (
                report.movementRows.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(movement.date, "hh:mm a", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${movementPillClass(
                          movement,
                        )}`}
                      >
                        {movementTypeLabel(movement)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.description}
                    </TableCell>
                    <TableCell>{accountLabel(movement)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        movement.kind === "expense" ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {formatMoney(report.currency, movement.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {isLoading
                      ? "Cargando movimientos..."
                      : "Sin movimientos en la fecha seleccionada."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrintContainer {...printPayload} />
    </div>
  );
}
