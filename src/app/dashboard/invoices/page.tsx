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
import { ArrowUpDown, Inbox, MoreHorizontal, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TableStateBody } from "@/components/ui/table-state-body";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewInvoiceDialog } from "./components/new-invoice-dialog";
import { Invoice } from "@/types/invoice.types";
import { useInvoices } from "@/hooks/use-invoices";
import { deleteInvoice } from "@/actions/invoices";
import { toast } from "sonner";
import { queryClient } from "@/lib/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePrintInvoice } from "@/hooks/use-print-invoice";
import { useAuthStore } from "@/store/auth";
import { can } from "@/lib/auth/can";
import { mapError } from "@/lib/error-messages";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import {
  ListVisibilityControl,
  type VisibilityScope,
} from "@/components/ui/list-visibility-control";

const columnLabels: Record<string, string> = {
  id: "No. Factura",
  ncf: "NCF",
  client_name: "Cliente",
  description: "Descripcion",
  amount: "Monto",
  monto_exento: "Monto Exento",
  monto_gravado: "Monto Gravado",
  itbis: "ITBIS",
  created_at: "Fecha de Creacion",
  user_name: "Usuario",
};

const getDateTime = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
};

export default function InvoicesPage() {
  const { user: currentUser } = useAuthStore();
  const canDelete = can(currentUser?.type, PERMISSIONS.dataDelete);
  const isMobile = useIsMobile();
  const [visibilityScope, setVisibilityScope] =
    React.useState<VisibilityScope>("all");
  const { data: invoices, isLoading, isError, error, refetch } = useInvoices(
    currentUser?.id || "",
  );

  React.useEffect(() => {
    if (currentUser?.type === "ADMIN") {
      setVisibilityScope("all");
      return;
    }

    setVisibilityScope("mine");
  }, [currentUser?.type]);

  const filteredInvoices = React.useMemo(() => {
    if (visibilityScope !== "mine") {
      return invoices;
    }

    return invoices.filter(
      (invoice) =>
        (invoice.created_by ?? invoice.user_id) === currentUser?.id,
    );
  }, [invoices, currentUser?.id, visibilityScope]);

  const invoiceSummary = React.useMemo(() => {
    const total = filteredInvoices.reduce((acc, invoice) => acc + Number(invoice.amount || 0), 0);
    const withNcf = filteredInvoices.filter((invoice) => Boolean(invoice.ncf)).length;

    return { total, withNcf };
  }, [filteredInvoices]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const { print, PrintContainer } = usePrintInvoice();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(
    null,
  );
  const [invoiceToEdit, setInvoiceToEdit] = React.useState<Invoice | null>(
    null,
  );

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "No. Factura",
      cell: ({ row }) => <div className="capitalize">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "ncf",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          NCF
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize font-bold">{row.getValue("ncf")}</div>
      ),
    },
    {
      id: "client_name",
      accessorFn: (row) => row.client_name?.toLowerCase() ?? "",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize">{row.original.client_name}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Descripcion",
      cell: ({ row }) => <div>{row.getValue("description")}</div>,
    },
    {
      accessorKey: "itbis",
      header: "ITBIS",
      cell: ({ row }) => (
        <div>{Number(row.getValue("itbis")).toFixed(2)}</div>
      ),
    },
    {
      accessorKey: "monto_exento",
      header: "Monto Exento",
      cell: ({ row }) => (
        <div>{Number(row.getValue("monto_exento")).toFixed(2)}</div>
      ),
    },
    {
      accessorKey: "monto_gravado",
      header: "Monto Gravado",
      cell: ({ row }) => (
        <div>{Number(row.getValue("monto_gravado")).toFixed(2)}</div>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Monto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return (
          <div className="font-semibold">
            {Number(row.getValue("amount")).toFixed(2)}
          </div>
        );
      },
    },
    {
      id: "user_name",
      accessorFn: (row) => row.user_name ?? "",
      header: "Creada por",
      cell: ({ row }) => (
        <div className="capitalize">{row.original.user_name}</div>
      ),
    },
    {
      id: "created_at",
      accessorFn: (row) => getDateTime(row.created_at),
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fecha de Creacion
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return (
          <div className="font-medium">
            {format(
              new Date(row.original.created_at),
              "d 'de' MMMM yyyy hh:mm a",
              {
                locale: es,
              },
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        async function handleDeleteInvoice(id: string): Promise<void> {
          try {
            await deleteInvoice(id);
            toast.success("Factura eliminada");
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
          } catch (error) {
            console.error("Error al eliminar la factura", error);
            toast.error("No se pudo eliminar la factura");
            throw error;
          }
        }

        return (
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
              <DropdownMenuItem onSelect={() => setInvoiceToEdit(row.original)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(row.original);
                  setTimeout(() => print(), 200);
                }}
              >
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canDelete && (
                <ConfirmDialog
                  title="Eliminar factura"
                  description="Esta accion no se puede deshacer."
                  onConfirm={() => handleDeleteInvoice(row.original.id)}
                >
                  <div className="px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md cursor-pointer">
                    Eliminar
                  </div>
                </ConfirmDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredInvoices,
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
        eyebrow="Ventas"
        title="Facturas"
        description="Gestiona emision, impresion y seguimiento comercial con una bandeja mas clara para ventas y comprobantes fiscales."
        stats={[
          { label: "Facturas", value: String(filteredInvoices.length) },
          { label: "Con NCF", value: String(invoiceSummary.withNcf), tone: "positive" },
          {
            label: "Total facturado",
            value: new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(invoiceSummary.total),
          },
        ]}
        actions={
          <NewInvoiceDialog
            invoice={invoiceToEdit}
            onEditDone={() => setInvoiceToEdit(null)}
            onSuccess={({ id, mode }) => {
              if (mode === "create") {
                const printableInvoice = invoices.find((inv) => inv.id === id);
                if (printableInvoice) {
                  setSelectedInvoice(printableInvoice);
                  setTimeout(() => print(), 200);
                } else {
                  queryClient.invalidateQueries({ queryKey: ["invoices"] });
                }
              }
            }}
          />
        }
      />
      <TableToolbar
        table={table}
        columnLabels={columnLabels}
        isMobile={isMobile}
        searchValue={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
        onSearchChange={(event) =>
          table.getColumn("id")?.setFilterValue(event.target.value)
        }
        searchPlaceholder="Buscar facturas…"
        searchAriaLabel="Buscar facturas"
      />
      {isError ? (
        <ErrorState
          title="Algo salió mal"
          description={mapError(error)}
          onRetry={refetch}
        />
      ) : (
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
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableStateBody
              isLoading={isLoading}
              isEmpty={table.getRowModel().rows?.length === 0}
              colSpan={table.getVisibleLeafColumns().length}
              loadingRows={table.getState().pagination.pageSize}
              empty={
                invoices.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Sin facturas"
                    description="Registra la primera para verla aquí."
                    action={
                      <NewInvoiceDialog
                        onSuccess={() =>
                          queryClient.invalidateQueries({
                            queryKey: ["invoices"],
                          })
                        }
                      />
                    }
                  />
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    description="Ajusta o limpia el filtro."
                    action={
                      <Button
                        onClick={() =>
                          table.getColumn("id")?.setFilterValue("")
                        }
                      >
                        Limpiar búsqueda
                      </Button>
                    }
                  />
                )
              }
            >
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableStateBody>
          </TableBody>
        </Table>
        <TablePagination
          table={table}
          totalFiltered={table.getFilteredRowModel().rows.length}
          visibilityControl={
            <ListVisibilityControl
              role={currentUser?.type}
              value={visibilityScope}
              onChange={setVisibilityScope}
            />
          }
        />
      </div>
      )}
      {selectedInvoice && <PrintContainer invoice={selectedInvoice} />}
    </div>
  );
}
