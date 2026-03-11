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
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import Link from "next/link";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    accountName: "Nombre",
    accountType: "Tipo",
    bankName: "Banco",
    accountNumber: "No. Cuenta",
    branchNames: "Sucursales",
    currentBalance: "Balance",
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
  queryClient: QueryClient,
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
    accessorKey: "accountName",
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
      const iconUrl = row.original.iconUrl;

      return (
        <Link
          href={`/dashboard/bank-accounts/${row.original.id}`}
          className="flex items-center gap-3 hover:underline min-w-[180px]"
        >
          {isSafeAccountImageSrc(iconUrl) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={iconUrl!}
              alt={row.original.accountName}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
              {row.original.accountType === "bank" ? "BK" : "CJ"}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{row.getValue("accountName")}</div>
            <div className="text-xs text-muted-foreground truncate">
              {row.original.accountType === "bank"
                ? row.original.bankName || "Cuenta bancaria"
                : "Caja"}
            </div>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "accountNumber",
    header: "No. Cuenta",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.original.accountNumber || "-"}
      </div>
    ),
  },
  {
    accessorKey: "accountType",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("accountType") as string;
      return (
        <Badge variant={type === "bank" ? "default" : "secondary"}>
          {type === "bank" ? "Cuenta bancaria" : "Caja"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "bankName",
    header: "Banco",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.getValue("bankName") || "-"}
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
    accessorKey: "currentBalance",
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
      const balance = row.getValue("currentBalance") as number;
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
                await updateDoc(doc(db, "bankAccounts", row.original.id), {
                  isActive: !row.original.isActive,
                });
                toast.success(
                  row.original.isActive
                    ? "Cuenta desactivada"
                    : "Cuenta activada"
                );
                queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
              } catch {
                toast.error("Error al actualizar la cuenta");
              }
            }}
          >
            {row.original.isActive ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteDoc(doc(db, "bankAccounts", row.original.id));
                  toast.success("Cuenta eliminada");
                  queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
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

export default function BankAccountsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { data: bankAccounts, isLoading } = useBankAccounts(user?.id || "", {
    allowedBranchIds: user?.type === "USER" ? user?.branchIds : undefined,
    activeOnly: false,
  });
  const { data: branches } = useBranches(user?.id || "");
  const queryClient = useQueryClient();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
  const canDelete = can(user?.type, PERMISSIONS.dataDelete);

  // Join bank accounts with branch names
  const accountsWithBranches: BankAccountWithBranches[] = React.useMemo(() => {
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
    return bankAccounts.map((account) => ({
      ...account,
      branchNames: getAccountBranchNames(account, branchMap),
    }));
  }, [bankAccounts, branches]);

  const columns = React.useMemo(
    () => getColumns(queryClient, canDelete),
    [queryClient, canDelete]
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
            (table.getColumn("accountName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("accountName")?.setFilterValue(event.target.value)
          }
          className="w-full"
        />

        <div className="grid grid-cols-2 gap-2">
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
                  className={!row.original.isActive ? "opacity-50" : ""}
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
