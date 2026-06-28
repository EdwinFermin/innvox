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
import {
  ArrowUpDown,
  Building2,
  Inbox,
  MoreHorizontal,
  SearchX,
  Tags,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  ActiveFilterChip,
  DateRangeFilter,
  FilterField,
  SelectFilter,
} from "@/components/filters";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { TableStateBody } from "@/components/ui/table-state-body";
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
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useUsers } from "@/hooks/use-users";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deleteIncome } from "@/actions/incomes";
import {
  extractDateOnlyKey,
  getTodayDateKey,
  parseDateOnly,
} from "@/utils/dates";

const columnLabels: Record<string, string> = {
  friendly_id: "Codigo",
  branch_id: "Sucursal",
  income_type_id: "Tipo",
  bank_account_id: "Cuenta",
  amount: "Monto",
  date: "Fecha",
  description: "Descripción",
  created_by: "Creado por",
  created_at: "Fecha de creación",
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
  canChangeAccount: boolean,
  canDelete: boolean,
  toLocalMidnight: (value: Income["date"]) => Date | null,
  onDelete: (incomeId: string) => Promise<void>,
): ColumnDef<Income>[] => [
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
    accessorKey: "income_type_id",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="capitalize">
        {incomeTypeNameById[row.original.income_type_id] ??
          row.original.income_type_id}
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
            <NewIncomeDialog
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
              title="Eliminar ingreso"
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

export default function IncomesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const [startDate, setStartDate] = React.useState<string>(getTodayDateKey);
  const [endDate, setEndDate] = React.useState<string>(getTodayDateKey);
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [openDialog, setOpenDialog] = React.useState(false);

  const { data: incomes, isLoading, isError, error, refetch } = useIncomes(
    user?.id || "",
    { startDate, endDate },
  );
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const { data: incomeTypes } = useIncomeTypes(user?.id || "");
  const { data: bankAccounts } = useBankAccounts(user?.id || "", { activeOnly: false });
  const { data: users } = useUsers();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user?.type === "ADMIN" || user?.type === "USER") {
      setVisibilityScope("all");
      return;
    }

    setVisibilityScope("mine");
  }, [user?.type]);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpenDialog(true);
      router.replace(pathname);
    }
  }, [pathname, router, searchParams]);

  const normalizeDateKey = React.useCallback((value: Income["date"]) => {
    return extractDateOnlyKey(value);
  }, []);

  const toLocalMidnight = React.useCallback((value: Income["date"]) => {
    return parseDateOnly(value);
  }, []);

  const filteredIncomes = React.useMemo(() => {
    const allowedBranches =
      user?.type === "USER" && user?.branch_ids && user.branch_ids.length > 0
        ? new Set(user.branch_ids)
        : null;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return incomes.filter((income) => {
      if (
        visibilityScope === "mine" &&
        income.created_by !== user?.id &&
        !income.external_source
      ) {
        return false;
      }
      if (allowedBranches && !allowedBranches.has(income.branch_id))
        return false;

      if (normalizedSearch) {
        const matchesSearch =
          income.friendly_id.toLowerCase().includes(normalizedSearch) ||
          String(income.description ?? "").toLowerCase().includes(normalizedSearch) ||
          String(income.amount ?? "").toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }
      }

      const dateKey = normalizeDateKey(income.date);
      if (!dateKey) return false;
      if (startDate && dateKey < startDate) return false;
      if (endDate && dateKey > endDate) return false;
      if (branchFilter !== "ALL" && income.branch_id !== branchFilter)
        return false;
      if (typeFilter !== "ALL" && income.income_type_id !== typeFilter)
        return false;
      return true;
    });
  }, [
    branchFilter,
    endDate,
    incomes,
    normalizeDateKey,
    searchTerm,
    startDate,
    typeFilter,
    visibilityScope,
    user?.id,
    user?.type,
    user?.branch_ids,
  ]);

  const incomeSummary = React.useMemo(() => {
    const total = filteredIncomes.reduce((acc, income) => acc + Number(income.amount || 0), 0);
    const branchesCovered = new Set(filteredIncomes.map((income) => income.branch_id)).size;

    return { total, branchesCovered };
  }, [filteredIncomes]);

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches],
  );

  const branchFilterOptions = React.useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: `${branch.name} (${branch.code})`,
      })),
    [branches],
  );

  const typeFilterOptions = React.useMemo(
    () => incomeTypes.map((type) => ({ value: type.id, label: type.name })),
    [incomeTypes],
  );

  const resetFilters = React.useCallback(() => {
    const today = getTodayDateKey();
    setStartDate(today);
    setEndDate(today);
    setBranchFilter("ALL");
    setTypeFilter("ALL");
  }, []);

  const activeFilterChips = React.useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    const today = getTodayDateKey();

    if (startDate !== today) {
      chips.push({
        key: "startDate",
        label: `Desde: ${startDate}`,
        onRemove: () => setStartDate(today),
      });
    }

    if (endDate !== today) {
      chips.push({
        key: "endDate",
        label: `Hasta: ${endDate}`,
        onRemove: () => setEndDate(today),
      });
    }

    if (branchFilter !== "ALL") {
      chips.push({
        key: "branch",
        label: `Sucursal: ${branchNameById[branchFilter] ?? branchFilter}`,
        onRemove: () => setBranchFilter("ALL"),
      });
    }

    if (typeFilter !== "ALL") {
      const typeName =
        incomeTypes.find((type) => type.id === typeFilter)?.name ?? typeFilter;
      chips.push({
        key: "type",
        label: `Tipo: ${typeName}`,
        onRemove: () => setTypeFilter("ALL"),
      });
    }

    return chips;
  }, [branchFilter, branchNameById, endDate, incomeTypes, startDate, typeFilter]);

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
        acc[item.id] = item.name || item.email || item.friendly_id || item.id;
        return acc;
      }, {}),
    [users],
  );

  const handleDeleteIncome = React.useCallback(
    async (incomeId: string) => {
      try {
        await deleteIncome(incomeId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["incomes"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
          queryClient.invalidateQueries({ queryKey: ["bankAccount"] }),
          queryClient.invalidateQueries({ queryKey: ["bankTransactions"] }),
        ]);

        toast.success("Ingreso eliminado");
      } catch (error) {
        console.error("Error al eliminar el ingreso", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al eliminar el ingreso",
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
        incomeTypeNameById,
        accountById,
        userNameById,
        user?.type === "ADMIN",
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Caja"
        title="Ingresos"
        description="Monitorea entradas por sucursal, filtra por periodo y manten una lectura mas limpia del ritmo comercial y operativo."
        stats={[
          { label: "Registros", value: String(filteredIncomes.length) },
          { label: "Sucursales", value: String(incomeSummary.branchesCovered), tone: "positive" },
          { label: "Total", value: currencyFormatter.format(incomeSummary.total) },
        ]}
        actions={<NewIncomeDialog openOnMount={openDialog} />}
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={searchTerm}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        searchPlaceholder="Buscar por ID, descripcion o monto…"
        searchAriaLabel="Buscar ingresos"
        filters={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <FilterField label="Sucursal" icon={Building2}>
              <SelectFilter
                value={branchFilter === "ALL" ? "all" : branchFilter}
                onValueChange={(value) => setBranchFilter(value === "all" ? "ALL" : value)}
                options={branchFilterOptions}
                allLabel="Todas"
                ariaLabel="Filtrar por sucursal"
              />
            </FilterField>
            <FilterField label="Tipo de ingreso" icon={Tags}>
              <SelectFilter
                value={typeFilter === "ALL" ? "all" : typeFilter}
                onValueChange={(value) => setTypeFilter(value === "all" ? "ALL" : value)}
                options={typeFilterOptions}
                allLabel="Todos"
                ariaLabel="Filtrar por tipo de ingreso"
              />
            </FilterField>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {activeFilterChips.length > 0 ? (
          <>
            {activeFilterChips.map((chip) => (
              <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 rounded-full px-4 text-muted-foreground"
            >
              Limpiar todo
            </Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Sin filtros activos. Mostrando los ingresos del día.
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState
          title="Algo salió mal"
          description={mapError(error)}
          onRetry={refetch}
        />
      ) : (
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
            <TableStateBody
              isLoading={isLoading}
              isEmpty={table.getRowModel().rows?.length === 0}
              colSpan={table.getVisibleLeafColumns().length}
              loadingRows={table.getState().pagination.pageSize}
              empty={
                incomes.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin ingresos"
                    description="Registra el primero para verlo aquí."
                    action={<NewIncomeDialog />}
                  />
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    description="Ajusta o limpia el filtro."
                    action={
                      <Button onClick={() => setSearchTerm("")}>
                        Limpiar búsqueda
                      </Button>
                    }
                  />
                )
              }
            >
              {table.getRowModel().rows.map((row) => (
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
              ))}
            </TableStateBody>
          </TableBody>
        </Table>
        <TablePagination
          table={table}
          totalFiltered={table.getFilteredRowModel().rows.length}
          visibilityControl={
            <ListVisibilityControl
              role={user?.type}
              value={visibilityScope}
              onChange={setVisibilityScope}
            />
          }
        />
      </div>
      )}
    </div>
  );
}
