"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Building2, Wallet } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { getAccountBranchNames, normalizeBankAccount, isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { db } from "@/lib/firebase";
import { BankAccount } from "@/types/bank-account.types";
import { BankTransaction, BankTransactionType } from "@/types/bank-transaction.types";
import { useBankTransactions } from "@/hooks/use-bank-transactions";
import { useBranches } from "@/hooks/use-branches";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import { EditBankAccountDialog } from "@/app/dashboard/bank-accounts/components/edit-bank-account-dialog";
import { TransferFundsDialog } from "@/app/dashboard/bank-accounts/components/transfer-funds-dialog";
import { AdjustBalanceDialog } from "@/app/dashboard/bank-accounts/components/adjust-balance-dialog";
import Link from "next/link";

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const getTransactionTypeLabel = (type: BankTransactionType): string => {
  const labels: Record<BankTransactionType, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrante",
    transfer_out: "Transferencia saliente",
    adjustment: "Ajuste",
  };
  return labels[type];
};

const getTransactionTypeBadgeClassName = (
  type: BankTransactionType
): string => {
  switch (type) {
    case "deposit":
    case "transfer_in":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "withdrawal":
    case "transfer_out":
      return "border-transparent bg-rose-100 text-rose-800";
    case "adjustment":
      return "border-transparent bg-amber-100 text-amber-800";
    default:
      return "border-transparent bg-slate-100 text-slate-800";
  }
};

const getColumns = (currency: string): ColumnDef<BankTransaction>[] => [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        {format(row.original.date.toDate(), "d 'de' MMMM yyyy", {
          locale: es,
        })}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("type") as BankTransactionType;
      return (
        <Badge
          variant="outline"
          className={getTransactionTypeBadgeClassName(type)}
        >
          {getTransactionTypeLabel(type)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">{row.getValue("description")}</div>
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
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      const type = row.original.type;
      const isNegative =
        type === "withdrawal" || type === "transfer_out" || amount < 0;
      return (
        <div
          className={`text-right font-medium ${isNegative ? "text-red-500" : "text-green-600"}`}
        >
          {isNegative ? "-" : "+"}
          {formatCurrency(Math.abs(amount), currency)}
        </div>
      );
    },
  },
  {
    accessorKey: "balanceAfter",
    header: () => <div className="text-right">Balance</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">
        {formatCurrency(row.getValue("balanceAfter"), currency)}
      </div>
    ),
  },
];

export default function BankAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accountId = params.id;
  const { user } = useAuthStore();
  const allowedBranchIds = user?.type === "USER" ? user?.branchIds : undefined;
  const { data: branches } = useBranches(user?.id || "", allowedBranchIds);
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);

  // Fetch account details
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["bankAccount", accountId],
    queryFn: async (): Promise<BankAccount | null> => {
      const docRef = doc(db, "bankAccounts", accountId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return normalizeBankAccount({ id: docSnap.id, ...docSnap.data() } as BankAccount);
    },
    enabled: !!accountId && !!user?.id,
  });

  // Fetch transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useBankTransactions(user?.id || "", accountId, { enabled: !!account });

  const branchNames = React.useMemo(() => {
    if (!account) return "";
    const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));
    return getAccountBranchNames(account, branchMap).join(", ");
  }, [account, branches]);

  const columns = React.useMemo(
    () => getColumns(account?.currency || "DOP"),
    [account?.currency]
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const table = useReactTable({
    data: transactions,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  if (!canManageSettings) {
    return (
      <div className="w-full">
        <h3 className="text-2xl font-semibold">Detalle de cuenta financiera</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  if (isLoadingAccount) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerLabel label="Cargando cuenta..." />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h3 className="text-2xl font-semibold">Cuenta no encontrada</h3>
        <p className="text-sm text-muted-foreground mt-2">
           La cuenta financiera solicitada no existe.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/bank-accounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {isSafeAccountImageSrc(account.iconUrl) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={account.iconUrl!}
            alt={account.accountName}
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-muted-foreground">
            {account.accountType === "bank" ? "BK" : "CJ"}
          </div>
        )}
        <div>
          <h3 className="text-2xl font-semibold">{account.accountName}</h3>
          <span className="text-muted-foreground text-sm">
             {account.accountType === "bank"
               ? `${account.bankName || "Cuenta bancaria"}${account.accountNumber ? ` - ${account.accountNumber}` : ""}`
: "Caja"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Actual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${account.currentBalance < 0 ? "text-red-500" : ""}`}
            >
              {formatCurrency(account.currentBalance, account.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursal</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold leading-snug">{branchNames}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo de Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={account.accountType === "bank" ? "default" : "secondary"}
              className="text-lg"
            >
              {account.accountType === "bank" ? "Cuenta bancaria" : "Caja"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          Editar cuenta
        </Button>
        <Button onClick={() => setTransferOpen(true)}>
          Transferir
        </Button>
        <Button variant="outline" onClick={() => setAdjustOpen(true)}>
          Ajustar balance
        </Button>
      </div>

      {/* Dialogs */}
      <EditBankAccountDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <TransferFundsDialog
        account={account}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
      <AdjustBalanceDialog
        account={account}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />

      {/* Transactions Table */}
      <div>
        <h4 className="text-lg font-semibold mb-4">Historial de Transacciones</h4>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24">
                    <div className="flex justify-center items-center h-full">
                      <SpinnerLabel label="Cargando transacciones..." />
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactionsError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-destructive"
                  >
                    No se pudieron cargar las transacciones.
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
                    No hay transacciones registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <TablePageSize table={table} />
          <div className="flex-1" />
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
    </div>
  );
}
