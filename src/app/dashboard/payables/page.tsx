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
import { usePayables } from "@/hooks/use-payables";
import { Payable } from "@/types/payable.types";
import { NewPayableDialog } from "./components/new-payable-dialog";
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
import { deletePayable } from "@/actions/payables";
import { formatDateOnly, parseDateOnly } from "@/utils/dates";

const columnLabels: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  amount: "Monto",
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

const matchesSearch = (payable: Payable, search: string) => {
  const normalizedSearch = search.toLowerCase().trim();
  if (!normalizedSearch) return true;

  return [payable.id, payable.name, payable.description, payable.amount]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(normalizedSearch));
};

const getColumns = (
  queryClient: QueryClient,
  userNameById: Record<string, string>,
  canDelete: boolean
): ColumnDef<Payable>[] => [
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
          {canDelete && (
            <ConfirmDialog
              title="Eliminar cuenta por pagar"
              description="Esta accion eliminara el registro de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deletePayable(row.row.original.id);
                  toast.success("Cuenta por pagar eliminada");
                  queryClient.invalidateQueries({ queryKey: ["payables"] });
                } catch (error) {
                  toast.error(mapError(error));
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

export default function PayablesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  // Single dialog state shared between the header trigger and the empty-state
  // action so only one NewPayableDialog instance lives in the tree (R10).
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: payables, isLoading, isError, error, refetch } = usePayables(user?.id || "");
  const { data: users } = useUsers();
  const queryClient = useQueryClient();

  // Settle-once flag: flips true the first time data finishes loading and never
  // resets, so the content-settle entrance (motion-polish R2) plays exactly once
  // per mount and not on filter/sort/refetch re-renders.
  const [isLoaded, setIsLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!isLoading) setIsLoaded(true);
  }, [isLoading]);
  const settleClass = isLoaded
    ? "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
    : "";

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

  const filteredPayables = React.useMemo(() => {
    const visiblePayables =
      visibilityScope !== "mine"
        ? payables
        : payables.filter((payable) => payable.created_by === user?.id);

    return visiblePayables.filter((payable) => {
      if (!matchesSearch(payable, searchQuery)) return false;
      if (
        statusFilter !== "all" &&
        (payable.status ?? "").toLowerCase() !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [payables, searchQuery, statusFilter, user?.id, visibilityScope]);

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

  const payablesSummary = React.useMemo(() => {
    const total = filteredPayables.reduce((acc, payable) => acc + Number(payable.amount || 0), 0);
    const pending = filteredPayables.filter((payable) => (payable.status ?? "").toLowerCase() === "pendiente").length;

    return { total, pending };
  }, [filteredPayables]);

  const columns = React.useMemo(
    () =>
      getColumns(
        queryClient,
        userNameById,
        can(user?.type, PERMISSIONS.dataDelete),
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
    data: filteredPayables,
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
        eyebrow="Flujo de caja"
        title="Cuentas por pagar"
        description="Organiza compromisos, prioriza vencimientos y protege la salida de caja con una vista mas clara del backlog operativo."
        stats={[
          { label: "Registros", value: String(filteredPayables.length) },
          { label: "Pendientes", value: String(payablesSummary.pending), tone: "warning" },
          {
            label: "Monto abierto",
            value: new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(payablesSummary.total),
            tone: "neutral",
          },
        ]}
        actions={<NewPayableDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={searchQuery}
        onSearchChange={(event) => setSearchQuery(event.target.value)}
        searchPlaceholder="Buscar por ID, nombre, descripcion o monto…"
        searchAriaLabel="Buscar cuentas por pagar"
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
            Sin filtros activos. Mostrando todas las cuentas por pagar.
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
      <div className={`dashboard-table-frame ${settleClass}`}>
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
                payables.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin cuentas por pagar"
                    description="Registra la primera para verla aquí."
                    action={
                      <Button onClick={() => setDialogOpen(true)}>
                        Nueva cuenta por pagar
                      </Button>
                    }
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
    </div>
  );
}
