"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import { db } from "@/lib/firebase";
import { useIncomes } from "@/hooks/use-incomes";
import { Income } from "@/types/income.types";
import { NewIncomeDialog } from "./components/new-income-dialog";
import { useBranches } from "@/hooks/use-branches";
import { useIncomeTypes } from "@/hooks/use-income-types";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    id: "ID",
    branchId: "Sucursal",
    incomeTypeId: "Tipo",
    amount: "Monto",
    date: "Fecha",
    description: "Descripción",
    createdAt: "Fecha de creación",
  };
  return map[id] || id;
};

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

export const getColumns = (
  queryClient: QueryClient,
  branchNameById: Record<string, string>,
  incomeTypeNameById: Record<string, string>,
  canDelete: boolean
): ColumnDef<Income>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">{row.original.id}</div>
    ),
  },
  {
    accessorKey: "branchId",
    header: "Sucursal",
    cell: ({ row }) => (
      <div className="capitalize">
        {branchNameById[row.original.branchId] ?? row.original.branchId}
      </div>
    ),
  },
  {
    accessorKey: "incomeTypeId",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="capitalize">
        {incomeTypeNameById[row.original.incomeTypeId] ??
          row.original.incomeTypeId}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Monto</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {currencyFormatter.format(Number(row.original.amount || 0))}
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: () => <div className="text-right">Fecha</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {format(row.original.date.toDate(), "d 'de' MMMM yyyy", {
          locale: es,
        })}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="line-clamp-2">{row.original.description}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteDoc(doc(db, "incomes", row.row.original.id));
                  toast.success("Ingreso eliminado");
                  queryClient.invalidateQueries({ queryKey: ["incomes"] });
                } catch {
                  toast.error("Error al eliminar el ingreso");
                }
              }}
            >
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function IncomesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: incomes, isLoading } = useIncomes(user?.id || "");
  const { data: branches } = useBranches(user?.id || "", user?.branchIds);
  const { data: incomeTypes } = useIncomeTypes(user?.id || "");
  const queryClient = useQueryClient();

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = React.useState<string>(today);
  const [endDate, setEndDate] = React.useState<string>(today);
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [openDialog, setOpenDialog] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpenDialog(true);
      router.replace(pathname);
    }
  }, [pathname, router, searchParams]);

  const normalizeDateKey = React.useCallback((value: Income["date"]) => {
    if (!value) return null;
    const date =
      value instanceof Date
        ? value
        : typeof value === "object" &&
          typeof (value as { toDate?: () => Date }).toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as unknown as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const filteredIncomes = React.useMemo(() => {
    return incomes.filter((income) => {
      const dateKey = normalizeDateKey(income.date);
      if (!dateKey) return false;
      if (startDate && dateKey < startDate) return false;
      if (endDate && dateKey > endDate) return false;
      if (branchFilter !== "ALL" && income.branchId !== branchFilter)
        return false;
      if (typeFilter !== "ALL" && income.incomeTypeId !== typeFilter)
        return false;
      return true;
    });
  }, [branchFilter, endDate, incomes, normalizeDateKey, startDate, typeFilter]);

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches]
  );

  const incomeTypeNameById = React.useMemo(
    () =>
      incomeTypes.reduce<Record<string, string>>((acc, type) => {
        acc[type.id] = type.name;
        return acc;
      }, {}),
    [incomeTypes]
  );

  const columns = React.useMemo(
    () =>
      getColumns(
        queryClient,
        branchNameById,
        incomeTypeNameById,
        user?.type === "ADMIN"
      ),
    [queryClient, branchNameById, incomeTypeNameById, user?.type]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: filteredIncomes,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <h3 className="text-2xl font-semibold">Ingresos</h3>
      <span className="text-muted-foreground text-sm">
        Registra y gestiona los ingresos por sucursal
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar por descripción..."
          value={
            (table.getColumn("description")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("description")?.setFilterValue(event.target.value)
          }
          className="w-full"
        />

        <div className="grid grid-cols-2 gap-2 ">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                Columnas <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {getColumnLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <NewIncomeDialog openOnMount={openDialog} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Desde</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Hasta</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Sucursal
          </label>
          <Select
            value={branchFilter}
            onValueChange={(val) => setBranchFilter(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas" />
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
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Tipo de ingreso
          </label>
          <Select
            value={typeFilter}
            onValueChange={(val) => setTypeFilter(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {incomeTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24">
                  <div className="flex justify-center items-center h-full">
                    <SpinnerLabel label="Cargando..." />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No se encontraron ingresos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
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
      </div>
    </div>
  );
}
