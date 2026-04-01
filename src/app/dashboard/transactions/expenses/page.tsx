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
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deleteExpense } from "@/actions/expenses";
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
          <div className="min-w-0">
            <span className="truncate block">{account.account_name}</span>
            {account.account_number && (
              <span className="truncate block text-xs text-muted-foreground">
                ****{account.account_number.replace(/\s+/g, "").slice(-4)}
              </span>
            )}
          </div>
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
                className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm text-destructive outline-none hover:bg-destructive/10"
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

  const expenseSummary = React.useMemo(() => {
    const total = filteredExpenses.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
    const branchesCovered = new Set(filteredExpenses.map((expense) => expense.branch_id)).size;

    return { total, branchesCovered };
  }, [filteredExpenses]);

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Control"
        title="Gastos"
        description="Supervisa egresos por sucursal, filtra por periodo y manten disciplina operativa con una lectura mas clara del gasto real."
        stats={[
          { label: "Registros", value: String(filteredExpenses.length) },
          { label: "Sucursales", value: String(expenseSummary.branchesCovered), tone: "warning" },
          { label: "Total", value: currencyFormatter.format(expenseSummary.total) },
        ]}
        actions={<NewExpenseDialog openOnMount={openDialog} />}
      />
      <div
        className={`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        <Input
          aria-label="Buscar gastos"
          placeholder="Buscar por ID, descripcion o monto…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-11 rounded-2xl border-border/70 bg-background/80"
        />

        <div className="w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 w-full rounded-2xl border-border/70 bg-background/80">
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
        </div>
      </div>
      <div className="dashboard-panel grid gap-3 p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Desde</label>
          <input
            type="date"
            value={getDateInputValue(startDate)}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 w-full rounded-2xl border border-input bg-background px-3"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Hasta</label>
          <input
            type="date"
            value={getDateInputValue(endDate)}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 w-full rounded-2xl border border-input bg-background px-3"
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
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background px-3 text-sm data-[size=default]:h-11">
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
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background px-3 text-sm data-[size=default]:h-11">
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
      <div className="dashboard-table-frame">
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
        <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
          <ListVisibilityControl
            role={user?.type}
            value={visibilityScope}
            onChange={setVisibilityScope}
          />
          <TablePageSize table={table} />
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredRowModel().rows.length} filas
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
