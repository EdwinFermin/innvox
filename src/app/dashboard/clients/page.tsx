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
import { ArrowUpDown, Inbox, MoreHorizontal, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useClients } from "@/hooks/use-clients";
import { useAuthStore } from "@/store/auth";
import { TableStateBody } from "@/components/ui/table-state-body";
import { useIsMobile } from "@/hooks/use-mobile";
import { Client } from "@/types/client.types";
import { NewClientDialog } from "./components/new-client-dialog";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { deleteClient } from "@/actions/clients";
import { toast } from "sonner";
import { can } from "@/lib/auth/can";
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";

const columnLabels: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  po_box: "ID de Casillero",
  created_at: "Fecha de creación",
};

const getCreatedAtTime = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
};

const getColumns = (
  queryClient: QueryClient,
  canDelete: boolean
): ColumnDef<Client>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">{row.original.id}</div>
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
    accessorKey: "po_box",
    header: () => <div className="text-right">ID de Casillero</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.getValue("po_box")}</div>
    ),
  },
  {
    id: "created_at",
    accessorFn: (row) => getCreatedAtTime(row.created_at),
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha de Creacion
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {format(new Date(row.original.created_at), "d 'de' MMMM yyyy hh:mm a", {
          locale: es,
        })}
      </div>
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
            <ConfirmDialog
              title="Eliminar cliente"
              description="Esta accion eliminara el cliente de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteClient(row.row.original.id);
                  toast.success("Cliente eliminado");
                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                } catch (error) {
                  toast.error("Error al eliminar el cliente");
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

export default function ClientsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: clients, isLoading, isError, error, refetch } = useClients(
    user?.id || "",
  );
  const queryClient = useQueryClient();

  const columns = React.useMemo(
    () => getColumns(queryClient, can(user?.type, PERMISSIONS.dataDelete)),
    [queryClient, user?.type]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const clientSummary = React.useMemo(() => {
    const withPoBox = clients.filter((client) => Boolean(client.po_box)).length;

    return {
      total: clients.length,
      withPoBox,
    };
  }, [clients]);

  const table = useReactTable({
    data: clients,
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
        eyebrow="Relacion comercial"
        title="Clientes"
        description="Centraliza la cartera de clientes, identifica registros incompletos y mantén una bandeja más clara para ventas y facturación."
        stats={[
          { label: "Clientes", value: String(clientSummary.total) },
          { label: "Con casillero", value: String(clientSummary.withPoBox), tone: "positive" },
          { label: "Sin casillero", value: String(clientSummary.total - clientSummary.withPoBox), tone: "warning" },
        ]}
        actions={can(user?.type, PERMISSIONS.clientsCreate) ? <NewClientDialog /> : undefined}
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onSearchChange={(event) =>
          table.getColumn("name")?.setFilterValue(event.target.value)
        }
        searchPlaceholder="Buscar clientes…"
        searchAriaLabel="Buscar clientes"
      />
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
                clients.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin clientes"
                    description="Registra el primero para verlo aquí."
                    action={
                      can(user?.type, PERMISSIONS.clientsCreate) ? (
                        <NewClientDialog />
                      ) : undefined
                    }
                  />
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    description="Ajusta o limpia el filtro."
                    action={
                      <Button
                        onClick={() =>
                          table.getColumn("name")?.setFilterValue("")
                        }
                      >
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
        />
      </div>
      )}
    </div>
  );
}
