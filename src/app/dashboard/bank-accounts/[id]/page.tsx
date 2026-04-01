"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Building2, MoreHorizontal, Printer, Search, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getAccountBranchNames, isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BankAccount } from "@/types/bank-account.types";
import { BankTransaction, BankTransactionType } from "@/types/bank-transaction.types";
import { useBankTransactions } from "@/hooks/use-bank-transactions";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TablePageSize } from "@/components/ui/table-page-size";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { EditBankAccountDialog } from "@/app/dashboard/bank-accounts/components/edit-bank-account-dialog";
import { TransferFundsDialog } from "@/app/dashboard/bank-accounts/components/transfer-funds-dialog";
import { AdjustBalanceDialog } from "@/app/dashboard/bank-accounts/components/adjust-balance-dialog";
import { TransactionDetailDialog } from "@/app/dashboard/bank-accounts/components/transaction-detail-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrintBankAccountDetail } from "@/hooks/use-print-bank-account-detail";
import {
  extractDateOnlyKey,
  getDateInputValue,
  getMonthStartDateKey,
  formatDateOnly,
  getTodayDateKey,
  parseDateOnly,
} from "@/utils/dates";
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
    lbtr_fee: "Comisión LBTR",
    transfer_tax: "Impuesto transferencia",
  };
  return labels[type];
};

const getTransactionTypeBadgeClassName = (
  type: BankTransactionType
): string => {
  switch (type) {
    case "deposit":
    case "transfer_in":
      return "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "withdrawal":
    case "transfer_out":
    case "lbtr_fee":
    case "transfer_tax":
      return "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400";
    case "adjustment":
      return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400";
    default:
      return "border-transparent bg-slate-100 text-slate-800";
  }
};

const canTransferTransaction = (transaction: BankTransaction): boolean =>
  transaction.type === "deposit" && transaction.amount > 0;

const getTransferDescription = (transaction: BankTransaction): string => {
  const parts = [
    `Transferencia basada en transaccion ${transaction.friendly_id}`,
  ];

  if (transaction.related_account_name) {
    const suffix = transaction.related_account_number_last4
      ? ` ****${transaction.related_account_number_last4}`
      : "";
    parts.push(`cuenta destino ${transaction.related_account_name}${suffix}`);
  }

  if (transaction.linked_income_id) {
    parts.push(
      `ingreso ${transaction.linked_income_friendly_id ?? "-"}`,
    );
  }

  if (transaction.linked_expense_id) {
    parts.push(
      `gasto ${transaction.linked_expense_friendly_id ?? "-"}`,
    );
  }

  return parts.join(" - ");
};

const TRANSACTION_TYPES: BankTransactionType[] = [
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
  "adjustment",
  "lbtr_fee",
  "transfer_tax",
];

const getColumns = (
  currency: string,
  onTransferTransaction: (transaction: BankTransaction) => void,
  branchNameById: Record<string, string>,
): ColumnDef<BankTransaction>[] => [
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
        disabled={!row.getCanSelect()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "friendly_id",
    header: "Codigo transaccion",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[180px] truncate font-mono text-xs">
        {row.original.friendly_id}
      </div>
    ),
  },
  {
    id: "movement_id",
    header: "Codigo ingreso/gasto",
    cell: ({ row }) => {
      const movementId =
        row.original.linked_income_friendly_id ??
        row.original.linked_expense_friendly_id ??
        null;

      if (!movementId) {
        return <div className="text-muted-foreground">-</div>;
      }

      return (
        <div className="text-muted-foreground max-w-[180px] truncate font-mono text-xs">
          {movementId}
        </div>
      );
    },
  },
  {
    id: "branch",
    header: "Sucursal",
    cell: ({ row }) => {
      const branchId = row.original.linked_branch_id;
      if (!branchId) return <div className="text-muted-foreground">-</div>;
      const branchName = branchNameById[branchId];
      return (
        <div className="truncate text-sm">
          {branchName || "-"}
        </div>
      );
    },
  },
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
        {formatDateOnly(row.original.date, "d 'de' MMMM yyyy", es) ?? "-"}
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
    cell: ({ row }) => {
      const transaction = row.original;
      const destinationLabel = transaction.related_account_name;
      const destinationSuffix = transaction.related_account_number_last4
        ? ` ****${transaction.related_account_number_last4}`
        : "";
      const description = transaction.description || "-";

      return (
        <div className="max-w-[320px] space-y-1">
          <div className="truncate">{description}</div>
          {destinationLabel ? (
            <div className="text-xs text-muted-foreground">
              {transaction.type === "transfer_out" ? "Cuenta destino" : "Cuenta origen"}: {destinationLabel}{destinationSuffix}
            </div>
          ) : null}
        </div>
      );
    },
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
        type === "withdrawal" || type === "transfer_out" || type === "lbtr_fee" || type === "transfer_tax" || amount < 0;
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
    accessorKey: "balance_after",
    header: () => <div className="text-right">Balance</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">
        {formatCurrency(row.getValue("balance_after"), currency)}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      if (!canTransferTransaction(row.original)) {
        return <div className="text-right text-muted-foreground">-</div>;
      }

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTransferTransaction(row.original)}>
                Mover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export default function BankAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accountId = params.id;
  const { user } = useAuthStore();
  const allowedBranchIds = user?.type === "USER" ? user?.branch_ids : undefined;
  const { data: branches } = useBranches(user?.id || "", allowedBranchIds);
  const { data: users } = useUsers();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);

  // Fetch account details via Supabase browser client
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["bankAccount", accountId],
    queryFn: async (): Promise<BankAccount | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (error || !data) return null;

      // Fetch branch associations from junction table
      const { data: junctions } = await supabase
        .from("bank_account_branches")
        .select("branch_id")
        .eq("bank_account_id", accountId);

      const branch_ids = (junctions ?? []).map((j) => j.branch_id);

      return { ...data, branch_ids } as BankAccount;
    },
    enabled: !!accountId && !!user?.id,
  });

  // Fetch transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useBankTransactions(user?.id || "", accountId, { enabled: !!account });

  const branchNameById = React.useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  const branchNames = React.useMemo(() => {
    if (!account) return "";
    return getAccountBranchNames(account, branchNameById).join(", ");
  }, [account, branchNameById]);

  const userNameById = React.useMemo(
    () =>
      (users ?? []).reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name || item.email || item.friendly_id || item.id;
        return acc;
      }, {}),
    [users],
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [editOpen, setEditOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<BankTransaction | null>(null);
  const [detailTransaction, setDetailTransaction] =
    React.useState<BankTransaction | null>(null);
  const [startDate, setStartDate] = React.useState<string>(getMonthStartDateKey);
  const [endDate, setEndDate] = React.useState<string>(getTodayDateKey);
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [printFromDate, setPrintFromDate] = React.useState(() =>
    getMonthStartDateKey(),
  );

  const handleOpenTransfer = React.useCallback(
    (transaction: BankTransaction | null = null) => {
      setSelectedTransaction(transaction);
      setTransferOpen(true);
    },
    [],
  );

  const handleTransferOpenChange = React.useCallback((open: boolean) => {
    setTransferOpen(open);

    if (!open) {
      setSelectedTransaction(null);
      setRowSelection({});
    }
  }, []);

  const filteredTransactions = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      if (normalizedSearch) {
        const matchesSearch =
          tx.friendly_id.toLowerCase().includes(normalizedSearch) ||
          String(tx.description ?? "").toLowerCase().includes(normalizedSearch) ||
          String(tx.linked_income_friendly_id ?? "").toLowerCase().includes(normalizedSearch) ||
          String(tx.linked_expense_friendly_id ?? "").toLowerCase().includes(normalizedSearch) ||
          String(tx.amount ?? "").includes(normalizedSearch);

        if (!matchesSearch) return false;
      }

      const dateKey = extractDateOnlyKey(tx.date);
      if (!dateKey) return false;
      if (!normalizedSearch) {
        if (startDate && dateKey < startDate) return false;
        if (endDate && dateKey > endDate) return false;
      }

      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (branchFilter !== "ALL" && tx.linked_branch_id !== branchFilter) return false;

      return true;
    });
  }, [transactions, searchTerm, startDate, endDate, typeFilter, branchFilter]);

  const filterSummary = React.useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === "deposit" || tx.type === "transfer_in" || (tx.type === "adjustment" && tx.amount > 0)) {
        totalIn += Math.abs(tx.amount);
      } else {
        totalOut += Math.abs(tx.amount);
      }
    }

    return {
      count: filteredTransactions.length,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }, [filteredTransactions]);

  const columns = React.useMemo(
    () => getColumns(account?.currency || "DOP", handleOpenTransfer, branchNameById),
    [account?.currency, handleOpenTransfer, branchNameById]
  );
  const { print, PrintContainer } = usePrintBankAccountDetail();

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    enableRowSelection: (row) => canTransferTransaction(row.original),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      rowSelection,
    },
  });

  const batchSelection = React.useMemo(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    const count = selectedRows.length;
    const sum = selectedRows.reduce((acc, r) => acc + r.original.amount, 0);
    const description = selectedRows.map((r) => r.original.friendly_id).join(", ");
    return { count, sum: Math.round(sum * 100) / 100, description };
  }, [table, rowSelection]);

  const printableTransactions = React.useMemo(
    () => {
      const fromDate = parseDateOnly(printFromDate);

      return table
        .getSortedRowModel()
        .rows.map((row) => row.original)
        .filter((transaction) => {
          if (!fromDate) return true;

          const transactionDateKey = extractDateOnlyKey(transaction.date);
          return transactionDateKey ? transactionDateKey >= printFromDate : false;
        });
    },
    [printFromDate, table],
  );

  const printableFromDate = React.useMemo(
    () => parseDateOnly(printFromDate),
    [printFromDate],
  );

  const handlePrintConfirm = React.useCallback(async () => {
    setPrintDialogOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await print();
  }, [print]);

  if (!canManageSettings) {
    return (
      <div className="dashboard-grid w-full">
        <DashboardPageHeader
          eyebrow="Tesoreria"
          title="Detalle de cuenta financiera"
          description="No tienes permisos para acceder a esta sección."
        />
        <p className="text-sm text-muted-foreground">
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
      <div className="dashboard-grid w-full">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 w-fit rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <DashboardPageHeader
          eyebrow="Tesoreria"
          title="Cuenta no encontrada"
          description="La cuenta financiera solicitada no existe."
        />
        <p className="text-sm text-muted-foreground">
          La cuenta financiera solicitada no existe.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-2xl border border-border/70 bg-background/80">
          <Link href="/dashboard/bank-accounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {isSafeAccountImageSrc(account.icon_url) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={account.icon_url!}
            alt={account.account_name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-muted-foreground">
            {account.account_type === "bank" ? "BK" : "CJ"}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-pretty text-2xl font-semibold tracking-[-0.03em]">{account.account_name}</h3>
          <p className="text-sm font-medium text-muted-foreground">{account.friendly_id}</p>
          <span className="text-sm text-muted-foreground">
            {account.account_type === "bank"
              ? `${account.bank_name || "Cuenta bancaria"}${account.account_number ? ` - ${account.account_number}` : ""}`
              : "Caja"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.97))] shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:bg-none dark:bg-card dark:shadow-[0_18px_44px_-32px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Balance actual
              </CardTitle>
              <p className="text-sm text-muted-foreground">Disponible para operar y conciliar.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-primary shadow-sm">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-semibold tracking-[-0.04em] ${account.current_balance < 0 ? "text-red-500" : "text-foreground"}`}
            >
              {formatCurrency(account.current_balance, account.currency)}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.97))] shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:bg-none dark:bg-card dark:shadow-[0_18px_44px_-32px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Cobertura
              </CardTitle>
              <p className="text-sm text-muted-foreground">Sucursales asociadas a esta cuenta.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-emerald-600 shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold leading-snug tracking-[-0.02em] text-foreground">{branchNames}</div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.4rem] border-border/70 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.97))] shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:bg-none dark:bg-card dark:shadow-[0_18px_44px_-32px_rgba(0,0,0,0.5)]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Tipo de cuenta
              </CardTitle>
              <p className="text-sm text-muted-foreground">Define el modo de operacion y visibilidad.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/90 px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
              {account.currency}
            </div>
          </CardHeader>
          <CardContent>
            <Badge
              variant={account.account_type === "bank" ? "default" : "secondary"}
              className="rounded-xl px-3 py-1 text-sm font-semibold"
            >
              {account.account_type === "bank" ? "Cuenta bancaria" : "Caja"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-panel flex flex-wrap gap-2 px-4 py-4">
        <Button variant="outline" className="rounded-2xl" onClick={() => setEditOpen(true)}>
          Editar cuenta
        </Button>
        <Button className="rounded-2xl" onClick={() => handleOpenTransfer()}>
          Transferir
        </Button>
        <Button variant="outline" className="rounded-2xl" onClick={() => setAdjustOpen(true)}>
          Ajustar balance
        </Button>
        <Button variant="outline" className="rounded-2xl" onClick={() => setPrintDialogOpen(true)}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir movimientos</DialogTitle>
            <DialogDescription>
              Elige desde que fecha necesitas incluir movimientos en la impresion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="print-from-date" className="text-sm font-medium">
              Movimientos desde
            </label>
            <Input
              id="print-from-date"
              name="print-from-date"
              type="date"
              value={getDateInputValue(printFromDate)}
              onChange={(event) => setPrintFromDate(event.target.value)}
              max={getTodayDateKey()}
            />
            <p className="text-sm text-muted-foreground">
              Se imprimiran {printableTransactions.length} movimiento
              {printableTransactions.length === 1 ? "" : "s"}
              {printableFromDate
                ? ` desde el ${format(printableFromDate, "d 'de' MMMM yyyy", { locale: es })}`
                : ""}
              .
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handlePrintConfirm()}>
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <EditBankAccountDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <TransferFundsDialog
        account={account}
        open={transferOpen}
        onOpenChange={handleTransferOpenChange}
        initialAmount={
          selectedTransaction
            ? selectedTransaction.amount
            : batchSelection.count > 0
              ? batchSelection.sum
              : undefined
        }
        initialDescription={
          selectedTransaction
            ? getTransferDescription(selectedTransaction)
            : batchSelection.count > 0
              ? `Transferencia de ${batchSelection.count} transacciones: ${batchSelection.description}`
              : undefined
        }
        lockAmount={!!selectedTransaction || batchSelection.count > 0}
      />
      <AdjustBalanceDialog
        account={account}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
      <TransactionDetailDialog
        transaction={detailTransaction}
        open={!!detailTransaction}
        onOpenChange={(open) => { if (!open) setDetailTransaction(null); }}
        currency={account.currency}
        branchNameById={branchNameById}
        userNameById={userNameById}
      />
      <PrintContainer
        account={account}
        branchNames={branchNames}
        transactions={printableTransactions}
        generatedAt={new Date()}
        fromDate={printableFromDate}
      />

      <div className="dashboard-grid gap-4">
        <div className="dashboard-panel space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por codigo, descripcion, monto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 rounded-2xl pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Desde</label>
              <input
                type="date"
                value={getDateInputValue(startDate)}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-input bg-background px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Hasta</label>
              <input
                type="date"
                value={getDateInputValue(endDate)}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-input bg-background px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background px-3 text-sm data-[size=default]:h-11">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getTransactionTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Sucursal</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background px-3 text-sm data-[size=default]:h-11">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="dashboard-panel grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transacciones</p>
            <p className="text-lg font-semibold tracking-tight">{filterSummary.count}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Entradas</p>
            <p className="text-lg font-semibold tracking-tight text-green-600">
              +{formatCurrency(filterSummary.totalIn, account.currency)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Salidas</p>
            <p className="text-lg font-semibold tracking-tight text-red-500">
              -{formatCurrency(filterSummary.totalOut, account.currency)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Neto</p>
            <p className={`text-lg font-semibold tracking-tight ${filterSummary.net < 0 ? "text-red-500" : "text-foreground"}`}>
              {formatCurrency(filterSummary.net, account.currency)}
            </p>
          </div>
        </div>
        {batchSelection.count > 0 && (
          <div className="dashboard-panel flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{batchSelection.count}</span>
              {" "}transaccion{batchSelection.count === 1 ? "" : "es"} seleccionada{batchSelection.count === 1 ? "" : "s"}
              {" · "}
              Total:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(batchSelection.sum, account.currency)}
              </span>
            </p>
            <Button className="rounded-2xl" onClick={() => setTransferOpen(true)}>
              Transferir seleccionados
            </Button>
          </div>
        )}
        <div className="dashboard-table-frame pt-2">
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
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, [role="checkbox"], [role="menuitem"]')) return;
                      setDetailTransaction(row.original);
                    }}
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
                    No hay transacciones registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
            <TablePageSize table={table} />
            <div className="text-muted-foreground flex-1 text-sm">
              {table.getFilteredSelectedRowModel().rows.length} de{" "}
              {table.getFilteredRowModel().rows.length} filas seleccionadas.
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
    </div>
  );
}
