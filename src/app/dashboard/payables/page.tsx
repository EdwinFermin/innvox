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
import { es } from "date-fns/locale";
import { toast } from "sonner";

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
import { usePayables } from "@/hooks/use-payables";
import { Payable } from "@/types/payable.types";
import { NewPayableDialog } from "./components/new-payable-dialog";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import { useUsers } from "@/hooks/use-users";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";
import { deletePayable } from "@/actions/payables";
import { formatDateOnly, parseDateOnly } from "@/utils/dates";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    id: "ID",
    name: "Nombre",
    amount: "Monto",
    due_date: "Vencimiento",
    status: "Estado",
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

export default function PayablesPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const { data: payables, isLoading } = usePayables(user?.id || "");
  const { data: users } = useUsers();
  const queryClient = useQueryClient();

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

    return visiblePayables.filter((payable) => matchesSearch(payable, searchQuery));
  }, [payables, searchQuery, user?.id, visibilityScope]);

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
        actions={<NewPayableDialog />}
      />
      <div
        className={`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        <Input
          aria-label="Buscar cuentas por pagar"
          placeholder="Buscar por ID, nombre, descripcion o monto…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
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
