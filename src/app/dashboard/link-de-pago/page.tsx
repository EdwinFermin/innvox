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

import { ListVisibilityControl, type VisibilityScope } from "@/components/ui/list-visibility-control";
import { Badge } from "@/components/ui/badge";
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
import { SpinnerLabel } from "@/components/ui/spinner-label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePageSize } from "@/components/ui/table-page-size";
import { useBranches } from "@/hooks/use-branches";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUsers } from "@/hooks/use-users";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store/auth";
import { LinkPayment } from "@/types/link-payment.types";
import { useLinkPayments } from "@/hooks/use-link-payments";
import { deleteLinkPayment } from "@/actions/link-payments";

import { GenerateBranchQrDialog } from "./components/generate-branch-qr-dialog";
import { NewLinkPaymentDialog } from "./components/new-link-payment-dialog";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    id: "ID",
    branch_id: "Sucursal",
    amount: "Monto",
    payment_url: "URL interna",
    status: "Estado",
    created_by: "Creado por",
    created_at: "Fecha de creacion",
    completed_at: "Fecha de pago",
  };
  return map[id] || id;
};

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const getDateTime = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
};

function StatusBadge({ status }: { status: LinkPayment["status"] }) {
  const isCompleted = status === "completed";

  return (
    <Badge
      className={
        isCompleted
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
      }
      variant="outline"
    >
      {isCompleted ? "Completado" : "Pendiente"}
    </Badge>
  );
}

const getColumns = (
  queryClient: ReturnType<typeof useQueryClient>,
  userNameById: Record<string, string>,
  branchNameById: Record<string, string>,
  canDelete: boolean,
): ColumnDef<LinkPayment>[] => [
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
    accessorKey: "branch_id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Sucursal
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>{branchNameById[row.original.branch_id] ?? row.original.branch_id}</div>
    ),
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
    accessorKey: "payment_url",
    header: "URL interna",
    cell: ({ row }) => (
      <a
        href={row.original.payment_url}
        target="_blank"
        rel="noreferrer"
        className="line-clamp-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        {row.original.payment_url}
      </a>
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
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
    id: "created_at",
    accessorFn: (row) => getDateTime(row.created_at),
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha de creacion
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {format(new Date(row.original.created_at), "d 'de' MMM yyyy hh:mm a", {
          locale: es,
        })}
      </div>
    ),
  },
  {
    id: "completed_at",
    accessorFn: (row) => getDateTime(row.completed_at),
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha de pago
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      if (!row.original.completed_at) {
        return <div className="text-right text-muted-foreground">-</div>;
      }

      return (
        <div className="text-right font-medium">
          {format(new Date(row.original.completed_at), "d 'de' MMM yyyy hh:mm a", {
            locale: es,
          })}
        </div>
      );
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
              title="Eliminar link de pago"
              description="Esta accion eliminara el link de pago de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteLinkPayment(row.row.original.id);
                  toast.success("Link de pago eliminado");
                  queryClient.invalidateQueries({ queryKey: ["linkPayments"] });
                } catch (error) {
                  toast.error("Error al eliminar el link de pago");
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

export default function LinkDePagoPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: linkPayments, isLoading } = useLinkPayments(user?.id || "");
  const { data: users } = useUsers();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const [visibilityScope, setVisibilityScope] = React.useState<VisibilityScope>("all");

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
        acc[item.id] = item.name || item.email || item.id;
        return acc;
      }, {}),
    [users],
  );

  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [branches],
  );

  const filteredLinkPayments = React.useMemo(() => {
    const byVisibility =
      visibilityScope === "mine"
        ? linkPayments.filter((item) => item.created_by === user?.id)
        : linkPayments;

    return [...byVisibility].sort(
      (a, b) => getDateTime(b.created_at) - getDateTime(a.created_at),
    );
  }, [linkPayments, user?.id, visibilityScope]);

  const columns = React.useMemo(
    () =>
      getColumns(
        queryClient,
        userNameById,
        branchNameById,
        can(user?.type, PERMISSIONS.dataDelete),
      ),
    [branchNameById, queryClient, userNameById, user?.type],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: filteredLinkPayments,
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
      <h3 className="text-2xl font-semibold">Link de pago</h3>
      <span className="text-muted-foreground text-sm">
        Crea pagos pendientes por sucursal y comparte su QR.
      </span>
      <div className={`grid w-full py-4 mt-2 gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        <Input
          placeholder="Buscar por sucursal..."
          value={(table.getColumn("branch_id")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("branch_id")?.setFilterValue(event.target.value)
          }
          className="w-full"
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {getColumnLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <GenerateBranchQrDialog branches={branches} />
          <NewLinkPaymentDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron links de pago.
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
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
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
