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
import { ArrowUpDown, ChevronDown, MoreHorizontal, ScanLine } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { TablePageSize } from "@/components/ui/table-page-size";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useLoyaltyClients } from "@/hooks/use-loyalty";
import { Client } from "@/types/client.types";
import { TokenDots } from "./components/token-dots";
import { AdjustTokensDialog } from "./components/adjust-tokens-dialog";
import { TokenHistoryDialog } from "./components/token-history-dialog";
import { GenerateLoyaltyQrDialog } from "./components/generate-loyalty-qr-dialog";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    po_box: "Casillero",
    name: "Nombre",
    phone: "Telefono",
    tokens: "Tokens",
  };
  return map[id] || id;
};

const matchesSearch = (client: Client, search: string) => {
  const s = search.toLowerCase().trim();
  if (!s) return true;

  return [client.id, client.name, client.phone, client.email]
    .map((v) => String(v ?? "").toLowerCase())
    .some((v) => v.includes(s));
};

const getColumns = (
  onAdjust: (client: Client) => void,
  onHistory: (client: Client) => void,
): ColumnDef<Client>[] => [
  {
    accessorKey: "po_box",
    header: "Casillero",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">{row.original.po_box}</div>
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
    accessorKey: "phone",
    header: "Telefono",
    cell: ({ row }) => (
      <div className="text-sm">{row.original.phone || "-"}</div>
    ),
  },
  {
    accessorKey: "tokens",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Tokens
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <TokenDots tokens={row.original.tokens} />,
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAdjust(row.original)}>
            Ajustar tokens
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onHistory(row.original)}>
            Ver historial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function LoyaltyPage() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const canAccessLoyalty = can(user?.type, PERMISSIONS.loyaltyAccess);
  const { data: clients, isLoading } = useLoyaltyClients(user?.id || "");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [adjustClient, setAdjustClient] = React.useState<Client | null>(null);
  const [historyClient, setHistoryClient] = React.useState<Client | null>(null);

  const filteredClients = React.useMemo(
    () => clients.filter((c) => matchesSearch(c, searchQuery)),
    [clients, searchQuery],
  );

  const stats = React.useMemo(() => {
    const nearReward = clients.filter((c) => c.tokens === 7).length;
    const withTokens = clients.filter((c) => c.tokens > 0).length;
    return { nearReward, withTokens };
  }, [clients]);

  const columns = React.useMemo(
    () => getColumns(setAdjustClient, setHistoryClient),
    [],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data: filteredClients,
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

  if (!canAccessLoyalty) {
    return (
      <div className="dashboard-grid w-full">
        <DashboardPageHeader
          eyebrow="Fidelidad"
          title="Tarjetas de fidelidad"
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
        eyebrow="Fidelidad"
        title="Tarjetas de fidelidad"
        description="Gestiona el programa de fidelidad de tus clientes courier. Cada cliente acumula tokens hasta completar su tarjeta."
        stats={[
          { label: "Clientes", value: String(clients.length) },
          { label: "Con tokens", value: String(stats.withTokens), tone: "positive" },
          { label: "Cerca de recompensa", value: String(stats.nearReward), tone: "warning" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <GenerateLoyaltyQrDialog />
            <Button asChild className="w-full rounded-2xl sm:w-auto">
              <Link href="/dashboard/loyalty/scanner">
                <ScanLine className="mr-2 h-4 w-4" />
                Scanner
              </Link>
            </Button>
          </div>
        }
      />

      <div
        className={`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        <Input
          aria-label="Buscar clientes"
          placeholder="Buscar por casillero, nombre, telefono o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>
      </div>

      <div className="dashboard-table-frame">
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
                  <div className="flex h-full items-center justify-center">
                    <SpinnerLabel label="Cargando..." />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
          <TablePageSize table={table} />
          <div className="flex-1 text-sm text-muted-foreground">
            {filteredClients.length} clientes
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

      <AdjustTokensDialog
        client={adjustClient}
        open={!!adjustClient}
        onOpenChange={(open) => !open && setAdjustClient(null)}
      />
      <TokenHistoryDialog
        client={historyClient}
        open={!!historyClient}
        onOpenChange={(open) => !open && setHistoryClient(null)}
      />
    </div>
  );
}
