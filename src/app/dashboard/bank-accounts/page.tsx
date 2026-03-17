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

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { BankAccount } from "@/types/bank-account.types";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useBranches } from "@/hooks/use-branches";
import { getAccountBranchNames, isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { NewBankAccountDialog } from "./components/new-bank-account-dialog";
import { GenerateAccountsQrDialog } from "./components/generate-accounts-qr-dialog";
import { deleteBankAccount, toggleBankAccountActive } from "@/actions/bank-accounts";
import { toast } from "sonner";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import Link from "next/link";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    account_name: "Nombre",
    account_type: "Tipo",
    bank_name: "Banco",
    account_number: "No. Cuenta",
    branchNames: "Sucursales",
    current_balance: "Balance",
    currency: "Moneda",
  };
  return map[id] || id;
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

type BankAccountWithBranches = BankAccount & { branchNames: string[] };

const getColumns = (
  invalidate: () => void,
  canDelete: boolean
): ColumnDef<BankAccountWithBranches>[] => [
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
    accessorKey: "account_name",
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
    cell: ({ row }) => {
      const iconUrl = row.original.icon_url;

      return (
        <Link
          href={`/dashboard/bank-accounts/${row.original.id}`}
          className="flex items-center gap-3 hover:underline min-w-[180px]"
        >
          {isSafeAccountImageSrc(iconUrl) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={iconUrl!}
              alt={row.original.account_name}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
              {row.original.account_type === "bank" ? "BK" : "CJ"}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{row.getValue("account_name")}</div>
            <div className="text-xs text-muted-foreground truncate">
              {row.original.friendly_id} - {row.original.account_type === "bank"
                ? row.original.bank_name || "Cuenta bancaria"
                : "Caja"}
            </div>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "account_number",
    header: "No. Cuenta",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.original.account_number || "-"}
      </div>
    ),
  },
  {
    accessorKey: "account_type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("account_type") as string;
      return (
        <Badge variant={type === "bank" ? "default" : "secondary"}>
          {type === "bank" ? "Cuenta bancaria" : "Caja"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "bank_name",
    header: "Banco",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.getValue("bank_name") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "branchNames",
    header: "Sucursales",
    cell: ({ row }) => {
      const names = row.original.branchNames;
      return <div>{names.join(", ")}</div>;
    },
  },
  {
    accessorKey: "current_balance",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Balance
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const balance = row.getValue("current_balance") as number;
      const currency = row.original.currency;
      return (
        <div
          className={`text-right font-medium ${balance < 0 ? "text-red-500" : ""}`}
        >
          {formatCurrency(balance, currency)}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/bank-accounts/${row.original.id}`}>
              Ver detalle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              try {
                await toggleBankAccountActive(
                  row.original.id,
                  !row.original.is_active,
                );
                toast.success(
                  row.original.is_active
                    ? "Cuenta desactivada"
                    : "Cuenta activada"
                );
                invalidate();
              } catch {
                toast.error("Error al actualizar la cuenta");
              }
            }}
          >
            {row.original.is_active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          {canDelete && (
            <ConfirmDialog
              title="Eliminar cuenta"
              description="Esta accion eliminara la cuenta y sus datos relacionados de forma permanente."
              confirmLabel="Eliminar"
              onConfirm={async () => {
                try {
                  await deleteBankAccount(row.original.id);
                  toast.success("Cuenta eliminada");
                  invalidate();
                } catch (error) {
                  toast.error("Error al eliminar la cuenta");
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

export default function BankAccountsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: bankAccounts, isLoading } = useBankAccounts(user?.id || "", {
    allowedBranchIds: user?.type === "USER" ? user?.branch_ids : undefined,
    activeOnly: false,
  });
  const { data: branches } = useBranches(user?.id || "");
  const queryClient = useQueryClient();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
  const canDelete = can(user?.type, PERMISSIONS.dataDelete);

  const invalidate = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
    [queryClient],
  );

  // Join bank accounts with branch names
  const accountsWithBranches: BankAccountWithBranches[] = React.useMemo(() => {
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
    return bankAccounts.map((account) => ({
      ...account,
      branchNames: getAccountBranchNames(account, branchMap),
    }));
  }, [bankAccounts, branches]);

  const columns = React.useMemo(
    () => getColumns(invalidate, canDelete),
    [invalidate, canDelete]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: accountsWithBranches,
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

  if (!canManageSettings) {
    return (
      <div className="w-full">
        <h3 className="text-2xl font-semibold">Cuentas financieras</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-2xl font-semibold">Cuentas financieras</h3>
      <span className="text-muted-foreground text-sm">
        Gestiona cuentas bancarias y cajas con cobertura por sucursal
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar por nombre..."
          value={
            (table.getColumn("account_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("account_name")?.setFilterValue(event.target.value)
          }
          className="w-full"
        />

        <div className="grid grid-cols-3 gap-2">
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

          <GenerateAccountsQrDialog branches={branches} />
          <NewBankAccountDialog />
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
                  className={!row.original.is_active ? "opacity-50" : ""}
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
                  No se encontraron cuentas financieras.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <TablePageSize table={table} />
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
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
