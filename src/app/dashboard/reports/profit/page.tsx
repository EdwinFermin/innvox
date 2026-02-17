"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useReceivables } from "@/hooks/use-receivables";
import { usePayables } from "@/hooks/use-payables";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrushCleaning, ChevronDown, Printer } from "lucide-react";
import { usePrintProfit } from "@/hooks/use-print-profit";

type RowType = "INGRESO" | "GASTO" | "CXC" | "CXP";

type ReportRow = {
  id: string;
  type: RowType;
  branchId?: string;
  name: string;
  amount: number;
  date: Date;
  description: string;
};

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const typeLabel: Record<RowType, string> = {
  INGRESO: "Ingreso",
  GASTO: "Gasto",
  CXC: "Cuenta por cobrar",
  CXP: "Cuenta por pagar",
};

const typeColor: Record<RowType, string> = {
  INGRESO: "bg-emerald-100 text-emerald-800",
  GASTO: "bg-red-100 text-red-800",
  CXC: "bg-blue-100 text-blue-800",
  CXP: "bg-amber-100 text-amber-800",
};

export default function ProfitReportPage() {
  const { user } = useAuthStore();
  const { data: branches } = useBranches(user?.id || "", user?.branchIds);
  const { data: incomes } = useIncomes(user?.id || "");
  const { data: expenses } = useExpenses(user?.id || "");
  const { data: receivables } = useReceivables(user?.id || "");
  const { data: payables } = usePayables(user?.id || "");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [branchId, setBranchId] = React.useState<string>("ALL");

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches],
  );

  const normalizedRows: ReportRow[] = React.useMemo(() => {
    const toDate = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date) return d;
      if (typeof (d as { toDate?: () => Date }).toDate === "function") {
        return (d as { toDate: () => Date }).toDate();
      }
      if (typeof d === "string" || typeof d === "number") {
        const parsed = new Date(d);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    };

    const list: ReportRow[] = [];
    incomes.forEach((i) => {
      const d = toDate(i.date);
      if (!d) return;
      list.push({
        id: `income-${i.id}`,
        type: "INGRESO",
        branchId: i.branchId,
        name: "Ingreso",
        amount: Number(i.amount || 0),
        date: d,
        description: i.description,
      });
    });
    expenses.forEach((e) => {
      const d = toDate(e.date);
      if (!d) return;
      list.push({
        id: `expense-${e.id}`,
        type: "GASTO",
        branchId: e.branchId,
        name: "Gasto",
        amount: Number(e.amount || 0),
        date: d,
        description: e.description,
      });
    });
    receivables.forEach((r) => {
      const d = toDate(r.dueDate);
      if (!d) return;
      list.push({
        id: `receivable-${r.id}`,
        type: "CXC",
        branchId: r.branchId,
        name: r.name,
        amount: Number(r.amount || 0),
        date: d,
        description: r.description,
      });
    });
    payables.forEach((p) => {
      const d = toDate(p.dueDate);
      if (!d) return;
      list.push({
        id: `payable-${p.id}`,
        type: "CXP",
        branchId: p.branchId,
        name: p.name,
        amount: Number(p.amount || 0),
        date: d,
        description: p.description,
      });
    });
    return list;
  }, [incomes, expenses, receivables, payables]);

  const toDateKeyUTC = React.useCallback((d: Date) => {
    const y = d.getUTCFullYear();
    const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${d.getUTCDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const parseInputDate = React.useCallback((value: string) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const filteredRows = React.useMemo(() => {
    return normalizedRows.filter((row) => {
      const key = toDateKeyUTC(row.date);
      if (branchId !== "ALL" && row.branchId !== branchId) return false;
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });
  }, [normalizedRows, startDate, endDate, branchId, toDateKeyUTC]);

  const totals = React.useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    let cxc = 0;
    let cxp = 0;
    filteredRows.forEach((row) => {
      if (row.type === "INGRESO") ingresos += row.amount;
      else if (row.type === "GASTO") gastos += row.amount;
      else if (row.type === "CXC") cxc += row.amount;
      else if (row.type === "CXP") cxp += row.amount;
    });
    return {
      ingresos,
      gastos,
      cxc,
      cxp,
      utilidad: ingresos + cxc - gastos - cxp,
    };
  }, [filteredRows]);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<
      string,
      { ingresos: number; gastos: number; cxc: number; cxp: number }
    >();
    filteredRows.forEach((row) => {
      const key = toDateKeyUTC(row.date);
      if (!map.has(key))
        map.set(key, { ingresos: 0, gastos: 0, cxc: 0, cxp: 0 });
      const entry = map.get(key)!;
      if (row.type === "INGRESO") entry.ingresos += row.amount;
      else if (row.type === "GASTO") entry.gastos += row.amount;
      else if (row.type === "CXC") entry.cxc += row.amount;
      else if (row.type === "CXP") entry.cxp += row.amount;
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({
        key,
        label: format(new Date(`${key}T00:00:00`), "d 'de' MMM yyyy", {
          locale: es,
        }),
        ...val,
        utilidad: val.ingresos + val.cxc - val.gastos - val.cxp,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filteredRows, toDateKeyUTC]);

  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <Badge className={typeColor[type]} variant="outline">
            {typeLabel[type]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => (
        <div>
          {format(row.original.date, "d 'de' MMM yyyy", { locale: es })}
        </div>
      ),
    },
    {
      accessorKey: "branchId",
      header: "Sucursal",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.branchId
            ? (branchNameById[row.original.branchId] ?? row.original.branchId)
            : "Sin sucursal"}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground line-clamp-2">
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => {
        const val = row.original.amount;
        const sign =
          row.original.type === "GASTO" || row.original.type === "CXP" ? -1 : 1;
        return (
          <div className="text-right font-semibold">
            {currency.format(sign * val)}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { print, PrintContainer } = usePrintProfit();

  const dateRangeLabel = React.useMemo(() => {
    const formatLabel = (value: string) => {
      const d = parseInputDate(value);
      return d ? format(d, "d 'de' MMM yyyy", { locale: es }) : value;
    };
    if (startDate && endDate) {
      return `${formatLabel(startDate)} - ${formatLabel(endDate)}`;
    }
    if (startDate) return `Desde ${formatLabel(startDate)}`;
    if (endDate) return `Hasta ${formatLabel(endDate)}`;
    return "Todas las fechas";
  }, [startDate, endDate, parseInputDate]);

  const branchLabel = React.useMemo(() => {
    if (branchId === "ALL") return "Todas las sucursales";
    return branchNameById[branchId] ?? "Sucursal no encontrada";
  }, [branchId, branchNameById]);

  const printPayload = React.useMemo(
    () => ({
      title: "Reporte de utilidades",
      description:
        "Resumen de ingresos, gastos, cuentas por cobrar y cuentas por pagar.",
      dateRangeLabel,
      branchLabel,
      totals,
      daily: groupedByDay,
      transactions: filteredRows.map((row) => ({
        id: row.id,
        type: typeLabel[row.type],
        date: parseInputDate(toDateKeyUTC(row.date)) ?? row.date,
        branch: row.branchId
          ? (branchNameById[row.branchId] ?? row.branchId)
          : "Sin sucursal",
        name: row.name,
        description: row.description,
        amount: row.amount,
      })),
      currency,
    }),
    [
      totals,
      groupedByDay,
      filteredRows,
      branchNameById,
      dateRangeLabel,
      branchLabel,
      parseInputDate,
      toDateKeyUTC,
    ],
  );

  return (
    <div className="w-full space-y-6 profit-print-area">
      <div className="space-y-6 print-hidden">
        <div>
          <h3 className="text-base font-semibold md:text-lg 2xl:text-2xl">
            Reporte de utilidades
          </h3>
          <div className="text-muted-foreground text-sm space-y-1">
            <p>
              Resumen de ingresos, gastos, cuentas por cobrar y cuentas por
              pagar.
            </p>
            <p>
              Rango: {dateRangeLabel} · Sucursal: {branchLabel}
            </p>
          </div>
        </div>
        <div className="flex justify-end print-hidden">
          <Button
            variant="outline"
            onClick={() => print()}
            className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>

        <Card className="print-hidden">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4 md:max-w-fit max-w-full">
            <div className="space-y-1">
              <label className="text-sm font-medium">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-input rounded-md pl-1 h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-input rounded-md pl-1 h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sucursal</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex items-end justify-baseline pb-1">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setBranchId("ALL");
                }}
                className="bg-red-500 text-white hover:bg-red-600 hover:text-white"
              >
                <BrushCleaning className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 text-base font-semibold text-emerald-700 md:text-lg 2xl:text-2xl">
              {currency.format(totals.ingresos)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 text-base font-semibold text-red-700 md:text-lg 2xl:text-2xl">
              {currency.format(totals.gastos)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                CxC
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 text-base font-semibold text-blue-700 md:text-lg 2xl:text-2xl">
              {currency.format(totals.cxc)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                CxP
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 text-base font-semibold text-amber-700 md:text-lg 2xl:text-2xl">
              {currency.format(totals.cxp)}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Utilidad neta
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`min-w-0 text-base font-semibold md:text-lg 2xl:text-2xl ${
                totals.utilidad >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {currency.format(totals.utilidad)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen diario</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">CxC</TableHead>
                  <TableHead className="text-right">CxP</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByDay.length ? (
                  groupedByDay.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right">
                        {currency.format(row.ingresos)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.format(row.gastos)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.format(row.cxc)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.format(row.cxp)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currency.format(row.utilidad)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Sin datos en el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transacciones</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ingresos, gastos, CxC y CxP dentro del rango.
              </p>
            </div>
            <div className="print-hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Columnas <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.columnDef.header as string}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center">
                      Sin transacciones en el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4 print-hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenedor oculto para impresión */}
      <PrintContainer {...printPayload} />
    </div>
  );
}
