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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import { TableStateBody } from "@/components/ui/table-state-body";
import { Branch } from "@/types/branch.types";
import { useBranches } from "@/hooks/use-branches";
import { NewBranchDialog } from "./components/new-branch-dialog";
import { BranchSyncSettingsDialog } from "./components/branch-sync-settings-dialog";
import { deleteBranch } from "@/actions/branches";
import { toast } from "sonner";
import { can } from "@/lib/auth/can";
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";

const columnLabels: Record<string, string> = {
  name: "Nombre",
  code: "Código",
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
): ColumnDef<Branch>[] => [
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
    accessorKey: "code",
    header: () => <div className="text-right">Código</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.getValue("code")}</div>
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
    cell: (row) => <BranchActionsCell branch={row.row.original} canDelete={canDelete} queryClient={queryClient} />,
  },
];

function BranchActionsCell({
  branch,
  canDelete,
  queryClient,
}: {
  branch: Branch;
  canDelete: boolean;
  queryClient: QueryClient;
}) {
  const [syncOpen, setSyncOpen] = React.useState(false);
  return (
    <>
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
            className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted"
            onClick={() => setSyncOpen(true)}
          >
            Configurar sincronización
          </button>
          {canDelete && (
            <ConfirmDialog
              title="Eliminar sucursal"
              description="Esta accion eliminara la sucursal de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteBranch(branch.id);
                  toast.success("Sucursal eliminada");
                  queryClient.invalidateQueries({ queryKey: ["branches"] });
                } catch (error) {
                  toast.error("Error al eliminar la sucursal");
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
      <BranchSyncSettingsDialog
        branch={branch}
        open={syncOpen}
        onOpenChange={setSyncOpen}
      />
    </>
  );
}

export default function BranchesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: branches, isLoading, isError, error, refetch } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const queryClient = useQueryClient();
  const canManageBranches = can(user?.type, PERMISSIONS.branchesManage);

  const columns = React.useMemo(
    () => getColumns(queryClient, canManageBranches),
    [queryClient, canManageBranches]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const branchesSummary = React.useMemo(() => {
    const withCode = branches.filter((branch) => Boolean(branch.code)).length;

    return {
      total: branches.length,
      withCode,
    };
  }, [branches]);

  const table = useReactTable({
    data: branches,
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

  if (!canManageBranches) {
    return (
      <div className="dashboard-grid w-full">
        <DashboardPageHeader
          eyebrow="Estructura"
          title="Sucursales"
          description="No tienes permisos para acceder a esta sección."
        />
        <p className="text-sm text-muted-foreground">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Estructura"
        title="Sucursales"
        description="Organiza la red operativa, valida códigos y mantén una lectura más clara de la estructura disponible para el negocio."
        stats={[
          { label: "Sucursales", value: String(branchesSummary.total) },
          { label: "Con código", value: String(branchesSummary.withCode), tone: "positive" },
          { label: "Sin código", value: String(branchesSummary.total - branchesSummary.withCode), tone: "warning" },
        ]}
        actions={<NewBranchDialog />}
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onSearchChange={(event) =>
          table.getColumn("name")?.setFilterValue(event.target.value)
        }
        searchPlaceholder="Buscar sucursales…"
        searchAriaLabel="Buscar sucursales"
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
                branches.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin sucursales"
                    description="Registra la primera para verla aquí."
                    action={<NewBranchDialog />}
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
          rowCountNode={
            <div className="text-muted-foreground flex-1 text-sm">
              {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} filas seleccionadas.
            </div>
          }
        />
      </div>
      )}
    </div>
  );
}
