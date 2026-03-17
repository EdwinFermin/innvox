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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { useExpenses } from "@/hooks/use-expenses";
import { Expense } from "@/types/expense.types";
import { NewExpenseDialog } from "./components/new-expense-dialog";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { BankAccount } from "@/types/bank-account.types";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import { useUsers } from "@/hooks/use-users";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deleteExpense } from "@/lib/financial-movements";
import {
  extractDateOnlyKey,
  getDateInputValue,
  getTodayDateKey,
  parseDateOnly,
} from "@/utils/dates";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    friendly_id: "Codigo",
    branch_id: "Sucursal",
    expense_type_id: "Tipo",
    bank_account_id: "Cuenta",
    amount: "Monto",
    date: "Fecha",
    description: "Descripción",
    created_by: "Creado por",
    created_at: "Fecha de creación",
  };
  return map[id] || id;
};

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const getColumns = (
  branchNameById: Record<string, string>,
  expenseTypeNameById: Record<string, string>,
  accountById: Record<string, BankAccount>,
  userNameById: Record<string, string>,
  canChangeAccount: boolean,
  canDelete: boolean,
  toLocalMidnight: (value: Expense["date"]) => Date | null,
  onDelete: (expenseId: string) => Promise<void>,
): ColumnDef<Expense>[] => [
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
    accessorKey: "friendly_id",
    header: "Codigo",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">{row.original.friendly_id}</div>
    ),
  },
  {
    accessorKey: "branch_id",
    header: "Sucursal",
    cell: ({ row }) => (
      <div className="capitalize">
        {branchNameById[row.original.branch_id] ?? row.original.branch_id}
      </div>
    ),
  },
  {
    accessorKey: "expense_type_id",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="capitalize">
        {expenseTypeNameById[row.original.expense_type_id] ??
          row.original.expense_type_id}
      </div>
    ),
  },
  {
    accessorKey: "bank_account_id",
    header: "Cuenta",
    cell: ({ row }) => {
      const account = row.original.bank_account_id
        ? accountById[row.original.bank_account_id]
        : undefined;
      if (!account) return <div className="text-muted-foreground">-</div>;
      return (
        <div className="flex items-center gap-2">
          {isSafeAccountImageSrc(account.icon_url) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={account.icon_url!}
              alt=""
              className="h-5 w-5 shrink-0 rounded border object-cover"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted text-[9px] font-semibold text-muted-foreground">
              {account.account_type === "bank" ? "BK" : "CJ"}
            </span>
          )}
          <span className="truncate">{account.account_name}</span>
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
      const friendlyId = String(row.original.friendly_id ?? "").toLowerCase();
      const description = String(row.getValue(columnId) ?? "").toLowerCase();
      const amount = String(row.original.amount ?? "").toLowerCase();
      return (
        friendlyId.includes(search) ||
        description.includes(search) ||
        amount.includes(search)
      );
    },
  },
  {
    accessorKey: "created_by",
    header: "Creado por",
    cell: ({ row }) => {
      const userId = row.original.created_by ?? "";
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
          {canChangeAccount && (
            <NewExpenseDialog
              mode="edit-account"
              initialData={row.row.original}
              trigger={
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent"
                >
                  Cambiar cuenta
                </button>
              }
            />
          )}
          {canDelete && (
            <ConfirmDialog
              title="Eliminar gasto"
              description="Se revertira el movimiento y se ajustara el balance de la cuenta relacionada."
              confirmLabel="Eliminar"
              onConfirm={() => onDelete(row.row.original.id)}
            >
              <button
                type="button"
                className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm text-red-600 outline-none hover:bg-red-50"
              >
                Eliminar
              </button>
            </ConfirmDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function ExpensesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const { data: expenses, isLoading } = useExpenses(user?.id || "");
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const { data: expenseTypes } = useExpenseTypes(user?.id || "");
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

  const [startDate, setStartDate] = React.useState<string>(getTodayDateKey);
  const [endDate, setEndDate] = React.useState<string>(getTodayDateKey);
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [openDialog, setOpenDialog] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpenDialog(true);
      router.replace(pathname);
    }
  }, [pathname, router, searchParams]);

  const normalizeDateKey = React.useCallback((value: Expense["date"]) => {
    return extractDateOnlyKey(value);
  }, []);

  const toLocalMidnight = React.useCallback((value: Expense["date"]) => {
    return parseDateOnly(value);
  }, []);

  const filteredExpenses = React.useMemo(() => {
    const allowedBranches =
      user?.type === "USER" && user?.branch_ids && user.branch_ids.length > 0
        ? new Set(user.branch_ids)
        : null;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (visibilityScope === "mine" && expense.created_by !== user?.id) {
        return false;
      }
      if (allowedBranches && !allowedBranches.has(expense.branch_id))
        return false;

      if (normalizedSearch) {
        const matchesSearch =
          expense.friendly_id.toLowerCase().includes(normalizedSearch) ||
          String(expense.description ?? "").toLowerCase().includes(normalizedSearch) ||
          String(expense.amount ?? "").toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }
      }

      const dateKey = normalizeDateKey(expense.date);
      if (!dateKey) return false;
      if (!normalizedSearch) {
        if (startDate && dateKey < startDate) return false;
        if (endDate && dateKey > endDate) return false;
      }
      if (branchFilter !== "ALL" && expense.branch_id !== branchFilter)
        return false;
      if (typeFilter !== "ALL" && expense.expense_type_id !== typeFilter)
        return false;
      return true;
    });
  }, [
    branchFilter,
    endDate,
    expenses,
    normalizeDateKey,
    searchTerm,
    startDate,
    typeFilter,
    visibilityScope,
    user?.id,
    user?.type,
    user?.branch_ids,
  ]);

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches],
  );

  const expenseTypeNameById = React.useMemo(
    () =>
      expenseTypes.reduce<Record<string, string>>((acc, type) => {
        acc[type.id] = type.name;
        return acc;
      }, {}),
    [expenseTypes],
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
        acc[item.id] = item.name || item.email || item.friendly_id || item.id;
        return acc;
      }, {}),
    [users],
  );

  const handleDeleteExpense = React.useCallback(
    async (expenseId: string) => {
      try {
        await deleteExpense(expenseId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccount"] }),
          queryClient.invalidateQueries({ queryKey: ["bankTransactions"] }),
        ]);

        toast.success("Gasto eliminado");
      } catch (error) {
        console.error("Error al eliminar el gasto", error);
        toast.error(
          error instanceof Error ? error.message : "Error al eliminar el gasto",
        );
        throw error;
      }
    },
    [queryClient],
  );

  const columns = React.useMemo(
    () =>
      getColumns(
        branchNameById,
        expenseTypeNameById,
        accountById,
        userNameById,
        user?.type === "ADMIN",
        can(user?.type, PERMISSIONS.dataDelete),
        toLocalMidnight,
        handleDeleteExpense,
      ),
    [
      branchNameById,
      expenseTypeNameById,
      accountById,
      userNameById,
      user?.type,
      toLocalMidnight,
      handleDeleteExpense,
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
    data: filteredExpenses,
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
      <h3 className="text-2xl font-semibold">Gastos</h3>
      <span className="text-muted-foreground text-sm">
        Registra y gestiona los gastos por sucursal
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar por ID, descripcion o monto..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
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

          <NewExpenseDialog openOnMount={openDialog} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Desde</label>
          <input
            type="date"
            value={getDateInputValue(startDate)}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-input rounded-md pl-1 h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Hasta</label>
          <input
            type="date"
            value={getDateInputValue(endDate)}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-input rounded-md pl-1 h-9"
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
            Tipo de gasto
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
              {expenseTypes.map((type) => (
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
                  No se encontraron gastos.
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
