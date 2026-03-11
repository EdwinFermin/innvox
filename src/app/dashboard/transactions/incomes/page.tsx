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
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { useIncomes } from "@/hooks/use-incomes";
import { Income } from "@/types/income.types";
import { NewIncomeDialog } from "./components/new-income-dialog";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { BankAccount } from "@/types/bank-account.types";
import { useBranches } from "@/hooks/use-branches";
import { useIncomeTypes } from "@/hooks/use-income-types";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import { useUsers } from "@/hooks/use-users";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deleteIncome } from "@/lib/financial-movements";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    id: "ID",
    branchId: "Sucursal",
    incomeTypeId: "Tipo",
    bankAccountId: "Cuenta",
    amount: "Monto",
    date: "Fecha",
    description: "Descripción",
    createdBy: "Creado por",
    createdAt: "Fecha de creación",
  };
  return map[id] || id;
};

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const getColumns = (
  branchNameById: Record<string, string>,
  incomeTypeNameById: Record<string, string>,
  accountById: Record<string, BankAccount>,
  userNameById: Record<string, string>,
  canDelete: boolean,
  toLocalMidnight: (value: Income["date"]) => Date | null,
  onDelete: (incomeId: string) => Promise<void>,
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
    accessorKey: "bankAccountId",
    header: "Cuenta",
    cell: ({ row }) => {
      const account = row.original.bankAccountId
        ? accountById[row.original.bankAccountId]
        : undefined;
      if (!account) return <div className="text-muted-foreground">-</div>;
      return (
        <div className="flex items-center gap-2">
          {isSafeAccountImageSrc(account.iconUrl) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={account.iconUrl!}
              alt=""
              className="h-5 w-5 shrink-0 rounded border object-cover"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted text-[9px] font-semibold text-muted-foreground">
              {account.accountType === "bank" ? "BK" : "CJ"}
            </span>
          )}
          <span className="truncate">{account.accountName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Monto
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {currencyFormatter.format(Number(row.original.amount || 0))}
      </div>
    ),
  },
  {
    id: "date",
    accessorFn: (row) => {
      const date = toLocalMidnight(row.date);
      return date ? date.getTime() : 0;
    },
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const displayDate = toLocalMidnight(row.original.date);
      return (
        <div className="text-right font-medium">
          {displayDate
            ? format(displayDate, "d 'de' MMMM yyyy", { locale: es })
            : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="line-clamp-2">{row.original.description}</div>
    ),
    filterFn: (row, columnId, value) => {
      const search = String(value ?? "")
        .toLowerCase()
        .trim();
      if (!search) return true;
      const description = String(row.getValue(columnId) ?? "").toLowerCase();
      const amount = String(row.original.amount ?? "").toLowerCase();
      return description.includes(search) || amount.includes(search);
    },
  },
  {
    accessorKey: "createdBy",
    header: "Creado por",
    cell: ({ row }) => {
      const userId = row.original.createdBy ?? "";
      if (!userId) return <div>-</div>;
      return <div>{userNameById[userId] ?? userId}</div>;
    },
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
              onClick={() => {
                void onDelete(row.row.original.id);
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
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const { data: incomes, isLoading } = useIncomes(user?.id || "", {
    role: user?.type,
  });
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branchIds : undefined,
  );
  const { data: incomeTypes } = useIncomeTypes(user?.id || "");
  const { data: bankAccounts } = useBankAccounts(user?.id || "", { activeOnly: false });
  const { data: users } = useUsers();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user?.type === "ADMIN") {
      setVisibilityScope("all");
      return;
    }

    setVisibilityScope("mine");
  }, [user?.type]);

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
    const y = date.getUTCFullYear();
    const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const toLocalMidnight = React.useCallback((value: Income["date"]) => {
    if (!value) return null;
    const date =
      value instanceof Date
        ? value
        : typeof value === "object" &&
            typeof (value as { toDate?: () => Date }).toDate === "function"
          ? (value as { toDate: () => Date }).toDate()
          : new Date(value as unknown as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }, []);

  const filteredIncomes = React.useMemo(() => {
    const allowedBranches =
      user?.type === "USER" && user?.branchIds && user.branchIds.length > 0
        ? new Set(user.branchIds)
        : null;
    return incomes.filter((income) => {
      if (visibilityScope === "mine" && income.createdBy !== user?.id) {
        return false;
      }
      if (allowedBranches && !allowedBranches.has(income.branchId))
        return false;
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
    // Ensure that 'user' is not null before accessing 'user.branchIds'
  }, [
    branchFilter,
    endDate,
    incomes,
    normalizeDateKey,
    startDate,
    typeFilter,
    visibilityScope,
    user?.id,
    user?.type,
    user?.branchIds,
  ]);

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches],
  );

  const incomeTypeNameById = React.useMemo(
    () =>
      incomeTypes.reduce<Record<string, string>>((acc, type) => {
        acc[type.id] = type.name;
        return acc;
      }, {}),
    [incomeTypes],
  );

  const accountById = React.useMemo(
    () =>
      bankAccounts.reduce<Record<string, BankAccount>>((acc, a) => {
        acc[a.id] = a;
        return acc;
      }, {}),
    [bankAccounts],
  );

  const userNameById = React.useMemo(
    () =>
      users.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name || item.email || item.id;
        return acc;
      }, {}),
    [users],
  );

  const handleDeleteIncome = React.useCallback(
    async (incomeId: string) => {
      try {
        const result = await deleteIncome(incomeId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["incomes"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccount"] }),
          queryClient.invalidateQueries({ queryKey: ["bankTransactions"] }),
        ]);

        if (result.historyRepaired) {
          toast.success("Ingreso eliminado");
          return;
        }

        toast.success(
          "Ingreso eliminado, pero no se pudo recalcular el historial bancario",
        );
      } catch (error) {
        console.error("Error al eliminar el ingreso", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al eliminar el ingreso",
        );
      }
    },
    [queryClient],
  );

  const columns = React.useMemo(
    () =>
      getColumns(
        branchNameById,
        incomeTypeNameById,
        accountById,
        userNameById,
        can(user?.type, PERMISSIONS.dataDelete),
        toLocalMidnight,
        handleDeleteIncome,
      ),
    [
      branchNameById,
      incomeTypeNameById,
      accountById,
      userNameById,
      user?.type,
      toLocalMidnight,
      handleDeleteIncome,
    ],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
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
          <input
            className="w-full border border-input rounded-md pl-1 h-9"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Hasta</label>
          <input
            className="w-full border border-input rounded-md pl-1 h-9"
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
                            header.getContext(),
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
                        cell.getContext(),
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
        <ListVisibilityControl
          role={user?.type}
          value={visibilityScope}
          onChange={setVisibilityScope}
        />
        <TablePageSize table={table} />
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
