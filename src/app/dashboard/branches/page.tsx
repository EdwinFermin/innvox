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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

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
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { Branch } from "@/types/branch.types";
import { useBranches } from "@/hooks/use-branches";
import { NewBranchDialog } from "./components/new-branch-dialog";
import { deleteBranch } from "@/actions/branches";
import { toast } from "sonner";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    name: "Nombre",
    code: "Código",
    created_at: "Fecha de creación",
  };
  return map[id] || id;
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
              title="Eliminar sucursal"
              description="Esta accion eliminara la sucursal de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteBranch(row.row.original.id);
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

export default function BranchesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: branches, isLoading } = useBranches(
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
      <div className="w-full">
        <h3 className="text-2xl font-semibold">Sucursales</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-2xl font-semibold">Sucursales</h3>
      <span className="text-muted-foreground text-sm">
        Gestiona la información de las sucursales
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
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

          <NewBranchDialog />
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
                  No se encontraron sucursales.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
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
