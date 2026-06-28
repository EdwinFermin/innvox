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
import { ArrowUpDown, Inbox, MoreHorizontal, SearchX, Wallet } from "lucide-react";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ActiveFilterChip, FilterField, SelectFilter } from "@/components/filters";
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
import { useReceivables } from "@/hooks/use-receivables";
import { Receivable } from "@/types/receivable.types";
import { NewReceivableDialog } from "./components/new-receivable-dialog";
import { ReceivablePaymentDialog } from "./components/receivable-payment-dialog";
import { can } from "@/lib/auth/can";
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { useUsers } from "@/hooks/use-users";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deleteReceivable } from "@/actions/receivables";
import { formatDateOnly, parseDateOnly } from "@/utils/dates";

const columnLabels: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  amount: "Monto",
  outstanding: "Pendiente",
  due_date: "Vencimiento",
  status: "Estado",
  description: "Descripción",
  created_by: "Creado por",
  created_at: "Fecha de creación",
};

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

// Status values confirmed present in migrations/dialogs (R38); "vencido" is
// intentionally excluded as it appears nowhere in the codebase.
const statusFilterOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "parcial", label: "Parcial" },
];

const statusFilterLabelByValue: Record<string, string> = Object.fromEntries(
  statusFilterOptions.map((option) => [option.value, option.label]),
);

const getDateTime = (value: unknown): number => {
  return parseDateOnly(value as string | Date | null | undefined)?.getTime() ?? 0;
};

const matchesSearch = (receivable: Receivable, search: string) => {
  const normalizedSearch = search.toLowerCase().trim();
  if (!normalizedSearch) return true;

  return [receivable.id, receivable.name, receivable.description, receivable.amount]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(normalizedSearch));
};

const getColumns = (
  queryClient: QueryClient,
  userNameById: Record<string, string>,
  canDelete: boolean,
  onPay: (receivable: Receivable) => void
): ColumnDef<Receivable>[] => [
  {
    accessorKey: "friendly_id",
    header: "Codigo",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">{row.original.friendly_id}</div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nombre
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
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
    id: "outstanding",
    accessorFn: (row) => Number(row.amount || 0) - Number(row.paid_amount || 0),
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Pendiente
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {currencyFormatter.format(
          Number(row.original.amount || 0) - Number(row.original.paid_amount || 0),
        )}
      </div>
    ),
  },
  {
    id: "due_date",
    accessorFn: (row) => getDateTime(row.due_date),
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Vencimiento
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatDateOnly(row.original.due_date, "d 'de' MMMM yyyy", es) ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Estado
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="capitalize">{row.original.status}</div>,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => <div className="line-clamp-2">{row.original.description}</div>,
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
          <button
            type="button"
            disabled={(row.row.original.status ?? "").toLowerCase() === "pagado"}
            onClick={() => onPay(row.row.original)}
            className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Registrar cobro
          </button>
          {canDelete && (
            <ConfirmDialog
              title="Eliminar cuenta por cobrar"
              description="Esta accion eliminara el registro de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteReceivable(row.row.original.id);
                  toast.success("Cuenta por cobrar eliminada");
                  queryClient.invalidateQueries({ queryKey: ["receivables"] });
                } catch (error) {
                  toast.error("Error al eliminar la cuenta");
                  throw error;
                }
              }}
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

export default function ReceivablesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const { data: receivables, isLoading, isError, error, refetch } =
    useReceivables(user?.id || "");
  const { data: users } = useUsers();
  const queryClient = useQueryClient();
  const [payTarget, setPayTarget] = React.useState<Receivable | null>(null);

  React.useEffect(() => {
    if (user?.type === "ADMIN") {
      setVisibilityScope("all");
      return;
    }

    setVisibilityScope("mine");
  }, [user?.type]);

  const userNameById = React.useMemo(
    () =>
      users.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name || item.email || item.friendly_id || item.id;
        return acc;
      }, {}),
    [users],
  );

  const filteredReceivables = React.useMemo(() => {
    const visibleReceivables =
      visibilityScope !== "mine"
        ? receivables
        : receivables.filter((receivable) => receivable.created_by === user?.id);

    return visibleReceivables.filter((receivable) => {
      if (!matchesSearch(receivable, searchQuery)) return false;
      if (
        statusFilter !== "all" &&
        (receivable.status ?? "").toLowerCase() !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [receivables, searchQuery, statusFilter, user?.id, visibilityScope]);

  const resetFilters = React.useCallback(() => {
    setStatusFilter("all");
  }, []);

  const activeFilterChips = React.useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (statusFilter !== "all") {
      chips.push({
        key: "status",
        label: `Estado: ${statusFilterLabelByValue[statusFilter] ?? statusFilter}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    return chips;
  }, [statusFilter]);

  const receivablesSummary = React.useMemo(() => {
    const total = filteredReceivables.reduce(
      (acc, receivable) =>
        acc + (Number(receivable.amount || 0) - Number(receivable.paid_amount || 0)),
      0,
    );
    const pending = filteredReceivables.filter((receivable) => (receivable.status ?? "").toLowerCase() !== "pagado").length;

    return { total, pending };
  }, [filteredReceivables]);

  const columns = React.useMemo(
    () =>
      getColumns(
        queryClient,
        userNameById,
        can(user?.type, PERMISSIONS.dataDelete),
        setPayTarget,
      ),
    [queryClient, userNameById, user?.type]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const table = useReactTable({
    data: filteredReceivables,
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
        eyebrow="Liquidez"
        title="Cuentas por cobrar"
        description="Visualiza cartera pendiente, prioriza vencimientos y da seguimiento a clientes con una lectura mas clara del flujo esperado."
        stats={[
          { label: "Registros", value: String(filteredReceivables.length) },
          { label: "Pendientes", value: String(receivablesSummary.pending), tone: "warning" },
          {
            label: "Monto abierto",
            value: new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(receivablesSummary.total),
          },
        ]}
        actions={<NewReceivableDialog />}
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={searchQuery}
        onSearchChange={(event) => setSearchQuery(event.target.value)}
        searchPlaceholder="Buscar por ID, nombre, descripcion o monto…"
        searchAriaLabel="Buscar cuentas por cobrar"
        filters={
          <FilterField label="Estado" icon={Wallet}>
            <SelectFilter
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusFilterOptions}
              allLabel="Todas"
              ariaLabel="Filtrar por estado"
            />
          </FilterField>
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
            Sin filtros activos. Mostrando todas las cuentas por cobrar.
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
                            header.getContext()
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
                receivables.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin cuentas por cobrar"
                    description="Registra la primera para verla aquí."
                    action={<NewReceivableDialog />}
                  />
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    description="Ajusta o limpia el filtro."
                    action={
                      <Button onClick={() => setSearchQuery("")}>
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
                        cell.getContext()
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

      <ReceivablePaymentDialog
        receivable={payTarget}
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      />
    </div>
  );
}
