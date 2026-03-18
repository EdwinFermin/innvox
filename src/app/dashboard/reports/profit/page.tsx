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
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
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
import { TablePageSize } from "@/components/ui/table-page-size";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { useReceivables } from "@/hooks/use-receivables";
import { usePayables } from "@/hooks/use-payables";
import {
  extractDateOnlyKey,
  getDateInputValue,
  formatDateOnly,
  parseDateOnly,
} from "@/utils/dates";
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
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
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
    const list: ReportRow[] = [];
    incomes.forEach((i) => {
      const d = parseDateOnly(i.date);
      if (!d) return;
      list.push({
        id: `income-${i.id}`,
        type: "INGRESO",
        branchId: i.branch_id,
        name: "Ingreso",
        amount: Number(i.amount || 0),
        date: d,
        description: i.description ?? "",
      });
    });
    expenses.forEach((e) => {
      const d = parseDateOnly(e.date);
      if (!d) return;
      list.push({
        id: `expense-${e.id}`,
        type: "GASTO",
        branchId: e.branch_id,
        name: "Gasto",
        amount: Number(e.amount || 0),
        date: d,
        description: e.description ?? "",
      });
    });
    receivables.forEach((r) => {
      const d = parseDateOnly(r.due_date);
      if (!d) return;
      list.push({
        id: `receivable-${r.id}`,
        type: "CXC",
        branchId: r.branch_id ?? undefined,
        name: r.name,
        amount: Number(r.amount || 0),
        date: d,
        description: r.description ?? "",
      });
    });
    payables.forEach((p) => {
      const d = parseDateOnly(p.due_date);
      if (!d) return;
      list.push({
        id: `payable-${p.id}`,
        type: "CXP",
        branchId: p.branch_id ?? undefined,
        name: p.name,
        amount: Number(p.amount || 0),
        date: d,
        description: p.description ?? "",
      });
    });
    return list;
  }, [incomes, expenses, receivables, payables]);

  const filteredRows = React.useMemo(() => {
    return normalizedRows.filter((row) => {
      const key = extractDateOnlyKey(row.date);
      if (!key) return false;
      if (branchId !== "ALL" && row.branchId !== branchId) return false;
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });
  }, [normalizedRows, startDate, endDate, branchId]);

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
      const key = extractDateOnlyKey(row.date);
      if (!key) return;
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
        label: formatDateOnly(key, "d 'de' MMM yyyy", es) ?? key,
        ...val,
        utilidad: val.ingresos + val.cxc - val.gastos - val.cxp,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filteredRows]);

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
      return formatDateOnly(value, "d 'de' MMM yyyy", es) ?? value;
    };
    if (startDate && endDate) {
      return `${formatLabel(startDate)} - ${formatLabel(endDate)}`;
    }
    if (startDate) return `Desde ${formatLabel(startDate)}`;
    if (endDate) return `Hasta ${formatLabel(endDate)}`;
    return "Todas las fechas";
  }, [startDate, endDate]);

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
        date: row.date,
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
    ],
  );

  return (
    <div className="w-full space-y-6 profit-print-area">
      <div className="space-y-6 print-hidden">
        <DashboardPageHeader
          eyebrow="Reportes"
          title="Reporte de utilidades"
          description="Resumen de ingresos, gastos, cuentas por cobrar y cuentas por pagar."
          stats={[
            { label: "Ingresos", value: currency.format(totals.ingresos), tone: "positive" },
            { label: "Gastos", value: currency.format(totals.gastos), tone: "warning" },
            { label: "CxC", value: currency.format(totals.cxc) },
            { label: "Utilidad", value: currency.format(totals.utilidad), tone: totals.utilidad >= 0 ? "positive" : "warning" },
          ]}
          actions={
            <Button variant="outline" className="rounded-2xl" onClick={() => print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          }
        />

        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] print-hidden">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Filtros del reporte</div>
                <div className="mt-1 text-sm text-muted-foreground">Rango: {dateRangeLabel} · Sucursal: {branchLabel}</div>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-2xl sm:w-auto"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setBranchId("ALL");
                }}
              >
                <BrushCleaning className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <input
                  type="date"
                  value={getDateInputValue(startDate)}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <input
                  type="date"
                  value={getDateInputValue(endDate)}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sucursal</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background data-[size=default]:h-11">
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
              <div className="rounded-[1rem] border border-border/60 bg-slate-50/80 p-4 text-sm leading-6 text-muted-foreground">
                El filtro aplica tanto al resumen diario como al detalle tabular.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)]">
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
                      <TableCell className="text-right">{currency.format(row.ingresos)}</TableCell>
                      <TableCell className="text-right">{currency.format(row.gastos)}</TableCell>
                      <TableCell className="text-right">{currency.format(row.cxc)}</TableCell>
                      <TableCell className="text-right">{currency.format(row.cxp)}</TableCell>
                      <TableCell className="text-right font-semibold">{currency.format(row.utilidad)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Sin datos en el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transacciones</CardTitle>
              <p className="text-sm text-muted-foreground">Ingresos, gastos, CxC y CxP dentro del rango.</p>
            </div>
            <div className="print-hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-2xl">
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
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      Sin transacciones en el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4 print-hidden">
              <TablePageSize table={table} />
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
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
