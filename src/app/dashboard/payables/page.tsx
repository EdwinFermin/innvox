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
import { usePayables } from "@/hooks/use-payables";
import { Payable } from "@/types/payable.types";
import { NewPayableDialog } from "./components/new-payable-dialog";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    name: "Nombre",
    amount: "Monto",
    dueDate: "Vencimiento",
    status: "Estado",
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
  canDelete: boolean
): ColumnDef<Payable>[] => [
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
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
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
    accessorKey: "dueDate",
    header: () => <div className="text-right">Vencimiento</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {format(row.original.dueDate.toDate(), "d 'de' MMMM yyyy", {
          locale: es,
        })}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <div className="capitalize">{row.original.status}</div>,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => <div className="line-clamp-2">{row.original.description}</div>,
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
                  await deleteDoc(doc(db, "payables", row.row.original.id));
                  toast.success("Cuenta por pagar eliminada");
                  queryClient.invalidateQueries({ queryKey: ["payables"] });
                } catch {
                  toast.error("Error al eliminar la cuenta");
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

export default function PayablesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: payables, isLoading } = usePayables(user?.id || "");
  const queryClient = useQueryClient();

  const columns = React.useMemo(
    () => getColumns(queryClient, user?.type === "ADMIN"),
    [queryClient, user?.type]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: payables,
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
      <h3 className="text-2xl font-semibold">Cuentas por pagar</h3>
      <span className="text-muted-foreground text-sm">
        Gestiona las cuentas por pagar
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar por nombre..."
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

          <NewPayableDialog />
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
                  No se encontraron cuentas por pagar.
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
