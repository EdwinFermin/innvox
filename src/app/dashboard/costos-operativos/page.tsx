"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { TablePageSize } from "@/components/ui/table-page-size";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useOperatingCosts } from "@/hooks/use-operating-costs";
import { useOperatingCostAlerts } from "@/hooks/use-operating-cost-alerts";
import {
  deleteOperatingCost,
  generateAlerts,
  toggleOperatingCostActive,
} from "@/actions/operating-costs";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateOnly } from "@/utils/dates";
import { OperatingCost, OperatingCostAlert } from "@/types/operating-cost.types";
import { NewOperatingCostDialog } from "./components/new-operating-cost-dialog";
import { CompleteAlertDialog } from "./components/complete-alert-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

const frequencyLabel: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  custom: "Personalizado",
};

function getDaysUntil(dateValue: string) {
  const date = new Date(dateValue + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// Cost Columns
// ---------------------------------------------------------------------------

const getCostColumns = (
  branchNameById: Record<string, string>,
  expenseTypeNameById: Record<string, string>,
  canDelete: boolean,
  onToggleActive: (id: string, isActive: boolean) => void,
  onDelete: (id: string) => Promise<void>,
  onEdit: (cost: OperatingCost) => void,
): ColumnDef<OperatingCost>[] => [
  {
    accessorKey: "friendly_id",
    header: "Codigo",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[140px] truncate font-mono text-xs">
        {row.original.friendly_id}
      </div>
    ),
  },
  {
    accessorKey: "branch_id",
    header: "Sucursal",
    cell: ({ row }) => (
      <div className="truncate">{branchNameById[row.original.branch_id] || "-"}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "expense_type_id",
    header: "Tipo de gasto",
    cell: ({ row }) => (
      <div className="truncate">{expenseTypeNameById[row.original.expense_type_id] || "-"}</div>
    ),
  },
  {
    accessorKey: "default_amount",
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
        {formatAmount(row.original.default_amount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: "frequency",
    header: "Frecuencia",
    cell: ({ row }) => (
      <Badge variant="outline">{frequencyLabel[row.original.frequency] || row.original.frequency}</Badge>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Estado",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.is_active
            ? "border-transparent bg-emerald-100 text-emerald-800"
            : "border-transparent bg-slate-200 text-slate-700"
        }
      >
        {row.original.is_active ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const cost = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(cost)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(cost.id, !cost.is_active)}>
                {cost.is_active ? "Desactivar" : "Activar"}
              </DropdownMenuItem>
              {canDelete ? (
                <ConfirmDialog
                  title="Eliminar costo operativo"
                  description={`¿Estás seguro de eliminar "${cost.name}"? Se eliminarán también todas las alertas pendientes asociadas.`}
                  confirmLabel="Eliminar"
                  cancelLabel="Cancelar"
                  onConfirm={async () => await onDelete(cost.id)}
                >
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </ConfirmDialog>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Alert Columns
// ---------------------------------------------------------------------------

const getAlertColumns = (
  branchNameById: Record<string, string>,
  isAdmin: boolean,
  onComplete: (alert: OperatingCostAlert) => void,
): ColumnDef<OperatingCostAlert>[] => [
  {
    accessorKey: "friendly_id",
    header: "Codigo",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[140px] truncate font-mono text-xs">
        {row.original.friendly_id}
      </div>
    ),
  },
  {
    id: "operating_cost_name",
    header: "Costo operativo",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.operating_cost_name || "-"}</div>
    ),
  },
  {
    accessorKey: "branch_id",
    header: "Sucursal",
    cell: ({ row }) => (
      <div className="truncate">{branchNameById[row.original.branch_id] || "-"}</div>
    ),
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Vencimiento
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const daysUntil = getDaysUntil(row.original.due_date);
      const isOverdue = row.original.status === "pending" && daysUntil < 0;
      const isDueSoon = row.original.status === "pending" && daysUntil >= 0 && daysUntil <= 3;
      return (
        <div>
          <div>{formatDateOnly(row.original.due_date, "d 'de' MMMM yyyy", es) ?? "-"}</div>
          {row.original.status === "pending" && (
            <div className={`text-xs ${isOverdue ? "text-red-500 font-medium" : isDueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
              {isOverdue ? `Vencido hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) !== 1 ? "s" : ""}` : daysUntil === 0 ? "Vence hoy" : `En ${daysUntil} día${daysUntil !== 1 ? "s" : ""}`}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "default_amount",
    header: () => <div className="text-right">Monto esperado</div>,
    cell: ({ row }) => (
      <div className="text-right">{currencyFormatter.format(row.original.default_amount)}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.status === "completed"
            ? "border-transparent bg-emerald-100 text-emerald-800"
            : "border-transparent bg-amber-100 text-amber-800"
        }
      >
        {row.original.status === "completed" ? "Completada" : "Pendiente"}
      </Badge>
    ),
  },
  {
    id: "actual_amount",
    header: () => <div className="text-right">Monto real</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.actual_amount != null ? currencyFormatter.format(row.original.actual_amount) : "-"}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      if (row.original.status === "completed") {
        return <div className="text-right text-muted-foreground text-xs">-</div>;
      }
      if (!isAdmin) {
        return <div className="text-right text-muted-foreground text-xs">-</div>;
      }
      return (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => onComplete(row.original)}
          >
            Completar
          </Button>
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OperatingCostsPage() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const isAdmin = can(user?.type, PERMISSIONS.settingsManage);
  const canDeleteItems = can(user?.type, PERMISSIONS.dataDelete);
  const allowedBranchIds = user?.type === "USER" ? user?.branch_ids : undefined;

  const queryClient = useQueryClient();

  const { data: branches } = useBranches(userId, allowedBranchIds);
  const { data: expenseTypes } = useExpenseTypes(userId);
  const { data: operatingCosts, isLoading: costsLoading } = useOperatingCosts(userId);
  const { data: alerts, isLoading: alertsLoading } = useOperatingCostAlerts(userId);

  // Filters
  const [branchFilter, setBranchFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Edit state
  const [editingCost, setEditingCost] = React.useState<OperatingCost | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Complete alert state
  const [completingAlert, setCompletingAlert] = React.useState<OperatingCostAlert | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);

  // Memos
  const branchNameById = React.useMemo(
    () =>
      branches.reduce<Record<string, string>>((acc, branch) => {
        acc[branch.id] = `${branch.name} (${branch.code})`;
        return acc;
      }, {}),
    [branches],
  );

  const expenseTypeNameById = React.useMemo(
    () =>
      expenseTypes.reduce<Record<string, string>>((acc, type) => {
        acc[type.id] = type.name;
        return acc;
      }, {}),
    [expenseTypes],
  );

  // Filtered costs
  const filteredCosts = React.useMemo(() => {
    return operatingCosts.filter((cost) => {
      if (branchFilter !== "ALL" && cost.branch_id !== branchFilter) return false;
      if (statusFilter === "active" && !cost.is_active) return false;
      if (statusFilter === "inactive" && cost.is_active) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (
          !cost.name.toLowerCase().includes(s) &&
          !cost.friendly_id.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [operatingCosts, branchFilter, statusFilter, searchTerm]);

  // Filtered alerts
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((alert) => {
      if (branchFilter !== "ALL" && alert.branch_id !== branchFilter) return false;
      if (statusFilter === "active" && alert.status !== "pending") return false;
      if (statusFilter === "inactive" && alert.status !== "completed") return false;
      return true;
    });
  }, [alerts, branchFilter, statusFilter]);

  // Handlers
  const handleToggleActive = React.useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await toggleOperatingCostActive(id, isActive);
        await queryClient.invalidateQueries({ queryKey: ["operatingCosts"] });
        toast.success(isActive ? "Costo operativo activado" : "Costo operativo desactivado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cambiar estado");
      }
    },
    [queryClient],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        await deleteOperatingCost(id);
        await queryClient.invalidateQueries({ queryKey: ["operatingCosts"] });
        await queryClient.invalidateQueries({ queryKey: ["operatingCostAlerts"] });
        toast.success("Costo operativo eliminado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al eliminar");
        throw error;
      }
    },
    [queryClient],
  );

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      await generateAlerts();
    },
    onSuccess: () => {
      toast.success("Alertas generadas");
      queryClient.invalidateQueries({ queryKey: ["operatingCostAlerts"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Error al generar alertas");
    },
  });

  const handleCompleteAlert = React.useCallback((alert: OperatingCostAlert) => {
    setCompletingAlert(alert);
    setCompleteDialogOpen(true);
  }, []);

  // Cost columns
  const costColumns = React.useMemo(
    () =>
      getCostColumns(
        branchNameById,
        expenseTypeNameById,
        canDeleteItems,
        handleToggleActive,
        handleDelete,
        (cost: OperatingCost) => {
          setEditingCost(cost);
          setEditDialogOpen(true);
        },
      ),
    [branchNameById, expenseTypeNameById, canDeleteItems, handleToggleActive, handleDelete],
  );

  // Alert columns
  const alertColumns = React.useMemo(
    () => getAlertColumns(branchNameById, isAdmin, handleCompleteAlert),
    [branchNameById, isAdmin, handleCompleteAlert],
  );

  // Tables
  const [costSorting, setCostSorting] = React.useState<SortingState>([]);
  const costTable = useReactTable({
    data: filteredCosts,
    columns: costColumns,
    onSortingChange: setCostSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: costSorting },
  });

  const [alertSorting, setAlertSorting] = React.useState<SortingState>([
    { id: "due_date", desc: false },
  ]);
  const alertTable = useReactTable({
    data: filteredAlerts,
    columns: alertColumns,
    onSortingChange: setAlertSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: alertSorting },
  });

  // Stats
  const pendingAlerts = alerts.filter((a) => a.status === "pending");
  const overdueAlerts = pendingAlerts.filter((a) => getDaysUntil(a.due_date) < 0);

  const isLoading = !userId || costsLoading || alertsLoading;

  if (!isAdmin) {
    return (
      <div className="dashboard-grid w-full">
        <DashboardPageHeader
          eyebrow="Control"
          title="Costos operativos"
          description="No tienes permisos para acceder a esta sección."
        />
      </div>
    );
  }

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Control"
        title="Costos operativos"
        description="Administra los costos recurrentes por sucursal, genera alertas de pago y registra gastos automaticamente al completar."
        stats={[
          { label: "Costos activos", value: String(operatingCosts.filter((c) => c.is_active).length) },
          { label: "Alertas pendientes", value: String(pendingAlerts.length), tone: pendingAlerts.length > 0 ? "warning" : "neutral" },
          { label: "Vencidas", value: String(overdueAlerts.length), tone: overdueAlerts.length > 0 ? "warning" : "neutral" },
        ]}
        actions={<NewOperatingCostDialog />}
      />

      {/* Filters */}
      <div className="dashboard-panel grid gap-3 p-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Buscar</label>
          <Input
            aria-label="Buscar costos"
            placeholder="Buscar por nombre o codigo…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-2xl border-border/70 bg-background/80"
          />
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
                  {branch.name} ({branch.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Estado</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background px-3 text-sm data-[size=default]:h-11">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="active">Activos / Pendientes</SelectItem>
              <SelectItem value="inactive">Inactivos / Completados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="costs" className="w-full">
        <div className="dashboard-panel flex items-center justify-between p-4">
          <TabsList>
            <TabsTrigger value="costs">Costos operativos</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => generateAlertsMutation.mutate()}
            disabled={generateAlertsMutation.isPending}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${generateAlertsMutation.isPending ? "animate-spin" : ""}`} />
            Generar alertas
          </Button>
        </div>

        {/* Costs Tab */}
        <TabsContent value="costs" className="mt-0">
          <div className="dashboard-table-frame">
            <Table>
              <TableHeader>
                {costTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={costColumns.length} className="h-24">
                      <div className="flex justify-center items-center h-full">
                        <SpinnerLabel label="Cargando..." />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : costTable.getRowModel().rows?.length ? (
                  costTable.getRowModel().rows.map((row) => (
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
                    <TableCell colSpan={costColumns.length} className="h-24 text-center">
                      No se encontraron costos operativos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
              <TablePageSize table={costTable} />
              <div className="flex-1" />
              <div className="space-x-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => costTable.previousPage()} disabled={!costTable.getCanPreviousPage()}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => costTable.nextPage()} disabled={!costTable.getCanNextPage()}>
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-0">
          <div className="dashboard-table-frame">
            <Table>
              <TableHeader>
                {alertTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={alertColumns.length} className="h-24">
                      <div className="flex justify-center items-center h-full">
                        <SpinnerLabel label="Cargando..." />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : alertTable.getRowModel().rows?.length ? (
                  alertTable.getRowModel().rows.map((row) => (
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
                    <TableCell colSpan={alertColumns.length} className="h-24 text-center">
                      No se encontraron alertas. Usa &quot;Generar alertas&quot; para crear las próximas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
              <TablePageSize table={alertTable} />
              <div className="flex-1" />
              <div className="space-x-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => alertTable.previousPage()} disabled={!alertTable.getCanPreviousPage()}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => alertTable.nextPage()} disabled={!alertTable.getCanNextPage()}>
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <NewOperatingCostDialog
        editData={editingCost ?? undefined}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingCost(null);
        }}
      />

      {/* Complete alert dialog */}
      <CompleteAlertDialog
        alert={completingAlert}
        open={completeDialogOpen}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open);
          if (!open) setCompletingAlert(null);
        }}
      />
    </div>
  );
}
