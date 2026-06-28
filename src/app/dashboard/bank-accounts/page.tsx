"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Building2,
  CircleDollarSign,
  Landmark,
  MoreHorizontal,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { deleteBankAccount, toggleBankAccountActive } from "@/actions/bank-accounts";
import { ActiveFilterChip, FilterField, SelectFilter } from "@/components/filters";
import { BankStatementSyncDialog } from "@/app/dashboard/bank-accounts/components/bank-statement-sync-dialog";
import { GenerateAccountsQrDialog } from "@/app/dashboard/bank-accounts/components/generate-accounts-qr-dialog";
import { NewBankAccountDialog } from "@/app/dashboard/bank-accounts/components/new-bank-account-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableColumnToggle } from "@/components/ui/table-column-toggle";
import { TablePageSize } from "@/components/ui/table-page-size";
import { TableStateBody } from "@/components/ui/table-state-body";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { can } from "@/lib/auth/can";
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAccountBranchNames, isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { cn } from "@/lib/utils";
import { useBranches } from "@/hooks/use-branches";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import type { BankAccount, Currency } from "@/types/bank-account.types";

const columnLabels: Record<string, string> = {
  account_name: "Cuenta",
  branchNames: "Sucursales",
  currency: "Moneda",
  current_balance: "Balance",
  status: "Estado",
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const getAccountTypeLabel = (type: BankAccount["account_type"]) => {
  return type === "bank" ? "Cuenta bancaria" : "Caja";
};

const maskAccountNumber = (value: string | null) => {
  if (!value) return "Sin numero registrado";

  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return compact;

  return `•••• ${compact.slice(-4)}`;
};

type AccountStatusFilter = "all" | "active" | "inactive";
type AccountTypeFilter = "all" | BankAccount["account_type"];
type CurrencyFilter = "all" | Currency;
type BranchFilter = "all" | string;

type BankAccountWithBranches = BankAccount & {
  branchNames: string[];
  searchText: string;
};

function AccountsPageSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountIdentity({ account }: { account: BankAccountWithBranches }) {
  return (
    <Link
      href={`/dashboard/bank-accounts/${account.id}`}
      className="flex min-w-0 items-start gap-3 rounded-xl p-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isSafeAccountImageSrc(account.icon_url) ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={account.icon_url!}
          alt={account.account_name}
          width={44}
          height={44}
          loading="lazy"
          className="h-11 w-11 shrink-0 rounded-xl border border-border/70 object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted text-xs font-semibold text-muted-foreground shadow-sm">
          {account.account_type === "bank" ? "BK" : "CJ"}
        </div>
      )}

      <div className="min-w-0 space-y-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{account.account_name}</div>
          <div className="truncate text-sm text-muted-foreground">
            {account.bank_name || getAccountTypeLabel(account.account_type)} · {account.friendly_id} · {maskAccountNumber(account.account_number)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border/70 bg-background">
            {getAccountTypeLabel(account.account_type)}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "border-transparent",
              account.is_active
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-slate-200 text-slate-700 dark:bg-muted dark:text-muted-foreground",
            )}
          >
            {account.is_active ? "Activa" : "Inactiva"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "border-transparent",
              account.is_public
                ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
            )}
          >
            {account.is_public ? "Publica" : "Interna"}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function BranchCoverage({ account }: { account: BankAccountWithBranches }) {
  const visibleBranches = account.branchNames.slice(0, 2);
  const extraCount = Math.max(account.branchNames.length - visibleBranches.length, 0);

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleBranches.map((branchName) => (
          <Badge key={branchName} variant="secondary" className="max-w-full truncate">
            {branchName}
          </Badge>
        ))}
        {extraCount > 0 ? <Badge variant="outline">+{extraCount}</Badge> : null}
      </div>
      <div className="text-xs text-muted-foreground">
        {account.branchNames.length} sucursal{account.branchNames.length === 1 ? "" : "es"} con cobertura
      </div>
    </div>
  );
}

function BalanceCell({ account }: { account: BankAccountWithBranches }) {
  const balance = Number(account.current_balance || 0);
  const isNegative = balance < 0;

  return (
    <div className="text-right">
      <div
        className={cn(
          "font-semibold tabular-nums",
          isNegative ? "text-rose-600" : "text-foreground",
        )}
      >
        {formatCurrency(balance, account.currency)}
      </div>
      <div className="text-xs text-muted-foreground">
        {isNegative ? "Balance sobregirado" : "Disponible"}
      </div>
    </div>
  );
}

const getColumns = (
  invalidate: () => void,
  canDelete: boolean,
): ColumnDef<BankAccountWithBranches>[] => [
  {
    accessorKey: "account_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Cuenta
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <AccountIdentity account={row.original} />,
  },
  {
    accessorKey: "branchNames",
    header: "Sucursales",
    cell: ({ row }) => <BranchCoverage account={row.original} />,
  },
  {
    accessorKey: "currency",
    header: "Moneda",
    cell: ({ row }) => (
      <Badge variant="outline" className="border-border/70 bg-background">
        {row.original.currency}
      </Badge>
    ),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="space-y-2 text-sm">
        <div className="font-medium text-foreground">
          {row.original.is_active ? "Operativa" : "Desactivada"}
        </div>
        <div className="text-muted-foreground">
          {row.original.is_public ? "Visible en cuentas publicas" : "Solo uso interno"}
        </div>
      </div>
    ),
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
    cell: ({ row }) => <BalanceCell account={row.original} />,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Acciones para ${row.original.account_name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/bank-accounts/${row.original.id}`}>Ver detalle</Link>
            </DropdownMenuItem>
            {row.original.account_type === "bank" ? (
              <BankStatementSyncDialog account={row.original} onSynced={invalidate}>
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  Sincronizar estado
                </DropdownMenuItem>
              </BankStatementSyncDialog>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await toggleBankAccountActive(row.original.id, !row.original.is_active);
                  toast.success(
                    row.original.is_active ? "Cuenta desactivada" : "Cuenta activada",
                  );
                  invalidate();
                } catch {
                  toast.error("No se pudo actualizar la cuenta");
                }
              }}
            >
              {row.original.is_active ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            {canDelete ? (
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
                    toast.error("No se pudo eliminar la cuenta");
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
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

const statusFilterLabel: Record<AccountStatusFilter, string> = {
  all: "Todas",
  active: "Activas",
  inactive: "Inactivas",
};

const typeFilterLabel: Record<AccountTypeFilter, string> = {
  all: "Todos los tipos",
  bank: "Cuenta bancaria",
  petty_cash: "Caja",
};

const currencyFilterLabel: Record<CurrencyFilter, string> = {
  all: "Todas las monedas",
  DOP: "DOP",
  USD: "USD",
};

export default function BankAccountsPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);
  const canDelete = can(user?.type, PERMISSIONS.dataDelete);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AccountStatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<AccountTypeFilter>("all");
  const [currencyFilter, setCurrencyFilter] = React.useState<CurrencyFilter>("all");
  const [branchFilter, setBranchFilter] = React.useState<BranchFilter>("all");

  const {
    data: bankAccounts,
    isLoading,
    isError,
    error,
    refetch,
  } = useBankAccounts(user?.id || "", {
    allowedBranchIds: user?.type === "USER" ? user?.branch_ids : undefined,
    activeOnly: false,
  });
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );

  const invalidate = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }),
    [queryClient],
  );

  const accountsWithBranches: BankAccountWithBranches[] = React.useMemo(() => {
    const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]));

    return bankAccounts.map((account) => {
      const branchNames = getAccountBranchNames(account, branchMap);

      return {
        ...account,
        branchNames,
        searchText: [
          account.account_name,
          account.friendly_id,
          account.bank_name,
          account.account_number,
          account.currency,
          getAccountTypeLabel(account.account_type),
          ...branchNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });
  }, [bankAccounts, branches]);

  const filteredAccounts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return accountsWithBranches.filter((account) => {
      const matchesSearch = query ? account.searchText.includes(query) : true;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? account.is_active
            : !account.is_active;
      const matchesType = typeFilter === "all" ? true : account.account_type === typeFilter;
      const matchesCurrency =
        currencyFilter === "all" ? true : account.currency === currencyFilter;
      const matchesBranch =
        branchFilter === "all" ? true : account.branch_ids.includes(branchFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesCurrency &&
        matchesBranch
      );
    });
  }, [accountsWithBranches, branchFilter, currencyFilter, searchQuery, statusFilter, typeFilter]);

  const summary = React.useMemo(() => {
    return filteredAccounts.reduce(
      (acc, account) => {
        acc.total += 1;
        if (account.is_active) acc.active += 1;
        if (account.is_public) acc.public += 1;
        acc.balances[account.currency] += Number(account.current_balance || 0);
        return acc;
      },
      {
        total: 0,
        active: 0,
        public: 0,
        balances: {
          DOP: 0,
          USD: 0,
        } as Record<Currency, number>,
      },
    );
  }, [filteredAccounts]);

  const hasActiveFilters =
    searchQuery.length > 0 ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    currencyFilter !== "all" ||
    branchFilter !== "all";

  const activeFilterChips = React.useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (searchQuery.trim()) {
      chips.push({
        key: "search",
        label: `Busqueda: ${searchQuery.trim()}`,
        onRemove: () => setSearchQuery(""),
      });
    }

    if (statusFilter !== "all") {
      chips.push({
        key: "status",
        label: `Estado: ${statusFilterLabel[statusFilter]}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    if (typeFilter !== "all") {
      chips.push({
        key: "type",
        label: `Tipo: ${typeFilterLabel[typeFilter]}`,
        onRemove: () => setTypeFilter("all"),
      });
    }

    if (branchFilter !== "all") {
      chips.push({
        key: "branch",
        label: `Sucursal: ${branches.find((branch) => branch.id === branchFilter)?.name ?? branchFilter}`,
        onRemove: () => setBranchFilter("all"),
      });
    }

    if (currencyFilter !== "all") {
      chips.push({
        key: "currency",
        label: `Moneda: ${currencyFilterLabel[currencyFilter]}`,
        onRemove: () => setCurrencyFilter("all"),
      });
    }

    return chips;
  }, [branches, branchFilter, currencyFilter, searchQuery, statusFilter, typeFilter]);

  const columns = React.useMemo(
    () => getColumns(invalidate, canDelete),
    [invalidate, canDelete],
  );

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "current_balance", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    status: !isMobile,
  });

  React.useEffect(() => {
    setColumnVisibility((current) => ({
      ...current,
      status: !isMobile,
    }));
  }, [isMobile]);

  const table = useReactTable({
    data: filteredAccounts,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  });

  React.useEffect(() => {
    table.setPageIndex(0);
  }, [
    branchFilter,
    currencyFilter,
    searchQuery,
    statusFilter,
    table,
    typeFilter,
  ]);

  const resetFilters = React.useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrencyFilter("all");
    setBranchFilter("all");
  }, []);

  if (!canManageSettings) {
    return (
      <div className="dashboard-grid w-full">
        <DashboardPageHeader
          eyebrow="Tesoreria"
          title="Cuentas financieras"
          description="No tienes permisos para acceder a esta sección."
        />
        <p className="text-sm text-muted-foreground">
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <AccountsPageSkeleton />;
  }

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Tesoreria"
        title="Cuentas financieras"
        description="Revisa balances, cobertura y disponibilidad de cuentas."
        stats={[
          { label: "Cuentas", value: String(summary.total) },
          { label: "Activas", value: String(summary.active), tone: "positive" },
          { label: "Publicas", value: String(summary.public), tone: "warning" },
          {
            label: "Balance",
            value: formatCurrency(summary.balances.DOP, "DOP"),
            tone: "neutral",
          },
        ]}
        actions={
          <>
            <GenerateAccountsQrDialog branches={branches} />
            <NewBankAccountDialog />
          </>
        }
      />

      <Card className="overflow-hidden rounded-[1.9rem] border-border/70 shadow-[0_20px_52px_-34px_rgba(15,23,42,0.24)]">
        <CardContent className="px-5 py-1">
          <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Busca y filtra cuentas
                </div>
                <p className="text-sm text-muted-foreground">
                  Ajusta la vista por nombre, tipo, sucursal, estado o moneda.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="h-9 w-fit px-3 text-sm">
                  {filteredAccounts.length} resultado{filteredAccounts.length === 1 ? "" : "s"}
                </Badge>
                <TableColumnToggle
                  table={table}
                  columnLabels={columnLabels}
                  className="w-auto"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
              <FilterField label="Busqueda" icon={Search} htmlFor="bank-accounts-search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="bank-accounts-search"
                    name="bank-accounts-search"
                    aria-label="Buscar cuentas financieras"
                    autoComplete="off"
                    placeholder="Cuenta, banco, codigo o numero"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 rounded-2xl border-border/70 bg-muted pl-9"
                  />
                </div>
              </FilterField>

              <FilterField label="Estado" icon={Wallet}>
                <SelectFilter
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as AccountStatusFilter)}
                  options={[
                    { value: "active", label: "Activas" },
                    { value: "inactive", label: "Inactivas" },
                  ]}
                  allLabel="Todas"
                  ariaLabel="Filtrar por estado"
                />
              </FilterField>

              <FilterField label="Tipo" icon={Landmark}>
                <SelectFilter
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as AccountTypeFilter)}
                  options={[
                    { value: "bank", label: "Cuenta bancaria" },
                    { value: "petty_cash", label: "Caja" },
                  ]}
                  allLabel="Todos los tipos"
                  ariaLabel="Filtrar por tipo de cuenta"
                />
              </FilterField>

              <FilterField label="Sucursal" icon={Building2}>
                <SelectFilter
                  value={branchFilter}
                  onValueChange={(value) => setBranchFilter(value as BranchFilter)}
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                  allLabel="Todas las sucursales"
                  ariaLabel="Filtrar por sucursal"
                />
              </FilterField>

              <FilterField label="Moneda" icon={CircleDollarSign}>
                <SelectFilter
                  value={currencyFilter}
                  onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}
                  options={[
                    { value: "DOP", label: "DOP" },
                    { value: "USD", label: "USD" },
                  ]}
                  allLabel="Todas las monedas"
                  ariaLabel="Filtrar por moneda"
                />
              </FilterField>
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterChips.length > 0 ? (
                  <>
                    {activeFilterChips.map((chip) => (
                      <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                    ))}
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 rounded-full px-4 text-muted-foreground">
                      Limpiar todo
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Sin filtros activos. Mostrando todas las cuentas disponibles.
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {hasActiveFilters ? "Filtros activos aplicados a la lista." : "Sin filtros activos."}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.9rem] border-border/70 shadow-[0_20px_52px_-34px_rgba(15,23,42,0.24)]">
        <CardContent className="px-2 pt-0 pb-2">
          {isError ? (
            <ErrorState
              title="Algo salió mal"
              description={mapError(error)}
              onRetry={refetch}
            />
          ) : table.getRowModel().rows.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={
                hasActiveFilters
                  ? "No hay cuentas con esos filtros"
                  : "Todavia no hay cuentas financieras"
              }
              description={
                hasActiveFilters
                  ? "Prueba ajustando la busqueda, sucursal o estado para ver mas resultados."
                  : "Crea una cuenta bancaria o caja para empezar a gestionar balances, transferencias y cobertura por sucursal."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                ) : (
                  <NewBankAccountDialog />
                )
              }
            />
          ) : isMobile ? (
            <div className="space-y-4">
              {table.getRowModel().rows.map((row) => (
                <Card
                  key={row.id}
                  className={cn(
                    "overflow-hidden border-border/60 shadow-sm",
                    !row.original.is_active && "bg-muted/20",
                  )}
                >
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <AccountIdentity account={row.original} />
                      </div>
                      <div className="shrink-0 text-right">
                        <BalanceCell account={row.original} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Cobertura
                        </div>
                        <div className="mt-2">
                          <BranchCoverage account={row.original} />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Estado
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="font-medium text-foreground">
                            {row.original.is_active ? "Operativa" : "Desactivada"}
                          </div>
                          <div className="text-muted-foreground">
                            {row.original.is_public ? "Visible en cuentas publicas" : "Solo uso interno"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Acciones para ${row.original.account_name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
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
                                    : "Cuenta activada",
                                );
                                invalidate();
                              } catch {
                                toast.error("No se pudo actualizar la cuenta");
                              }
                            }}
                          >
                            {row.original.is_active ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          {canDelete ? (
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
                                  toast.error("No se pudo eliminar la cuenta");
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
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm text-muted-foreground">
                  Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} · {filteredAccounts.length} cuentas en vista
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <TablePageSize table={table} />
                  <div className="flex items-center gap-2">
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
          ) : (
            <div className="overflow-hidden">
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
                  {/*
                    Loading and empty are resolved upstream (the `if (isLoading)`
                    early return and the Card-level isError/empty branches), so by
                    the time the desktop table renders, data is present and
                    non-empty. TableStateBody is a structural passthrough here
                    (isLoading/isEmpty fixed false) to keep the body-layer
                    contract consistent with the other seven pages (R18).
                  */}
                  <TableStateBody
                    isLoading={false}
                    isEmpty={false}
                    colSpan={table.getVisibleLeafColumns().length}
                    loadingRows={table.getState().pagination.pageSize}
                    empty={null}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "align-top",
                          !row.original.is_active && "bg-muted/20",
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableStateBody>
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 border-t border-border/70 px-1 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-0">
                <div className="text-sm text-muted-foreground">
                  Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} · {filteredAccounts.length} cuentas en vista
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <TablePageSize table={table} />
                  <div className="flex items-center gap-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
