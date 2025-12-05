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
import { ChevronDown, MoreHorizontal } from "lucide-react";

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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewInvoiceDialog } from "./components/new-invoice-dialog";
import { Invoice } from "@/types/invoice.types";
import { Client } from "@/types/client.types";
import { User } from "@/types/auth.types";
import { useInvoices } from "@/hooks/use-invoices";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { queryClient } from "@/lib/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePrintInvoice } from "@/hooks/use-print-invoice";

const getColumnLabel = (id: string): string => {
  const map: Record<string, string> = {
    id: "No. Factura",
    NCF: "NCF",
    client: "Cliente",
    description: "Descripción",
    amount: "Monto",
    ITBIS: "ITBIS",
    createdAt: "Fecha de Creación",
    user: "Usuario",
  };
  return map[id] || id;
};

export default function InvoicesPage() {
  const isMobile = useIsMobile();
  const { data: invoices, isLoading } = useInvoices();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const { print, PrintContainer } = usePrintInvoice();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(
    null
  );
  const [invoiceToEdit, setInvoiceToEdit] = React.useState<Invoice | null>(
    null
  );

  const fetchInvoiceWithRelations = React.useCallback(
    async (invoiceId: string): Promise<Invoice | null> => {
      const invoiceRef = doc(db, "invoices", invoiceId);
      const snapshot = await getDoc(invoiceRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();

      const [clientSnap, userSnap] = await Promise.all([
        data.client ? getDoc(data.client) : Promise.resolve(null),
        data.user ? getDoc(data.user) : Promise.resolve(null),
      ]);

      const clientData = clientSnap?.data();
      const userData = userSnap?.data();

      const client =
        clientSnap && clientSnap.exists()
          ? ({ id: clientSnap.id, ...(clientData ?? {}) } as Client)
          : null;
      const user =
        userSnap && userSnap.exists()
          ? ({ id: userSnap.id, ...(userData ?? {}) } as User)
          : null;

      return {
        id: snapshot.id,
        invoiceType: data.invoiceType,
        NCF: data.NCF ?? null,
        clientId: data.client?.id ?? "",
        client,
        description: data.description,
        amount: data.amount,
        ITBIS: data.ITBIS,
        createdAt: data.createdAt,
        userId: data.user?.id ?? "",
        user,
      };
    },
    []
  );

  const columns: ColumnDef<Invoice>[] = [
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
      header: "No. Factura",
      cell: ({ row }) => <div className="capitalize">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "NCF",
      header: "NCF",
      cell: ({ row }) => (
        <div className="capitalize font-bold">{row.getValue("NCF")}</div>
      ),
    },
    {
      accessorKey: "client",
      header: "Cliente",
      cell: ({ row }) => (
        <div className="capitalize">{row.original.client?.name}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="capitalize">{row.original.description}</div>
      ),
    },
    {
      accessorKey: "ITBIS",
      header: "ITBIS",
      cell: ({ row }) => <div>{Number(row.getValue("ITBIS")).toFixed(2)}</div>,
    },
    {
      accessorKey: "amount",
      header: "Monto",
      cell: ({ row }) => {
        return (
          <div className="font-semibold">
            {Number(row.getValue("amount")).toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "Creada por",
      cell: ({ row }) => (
        <div className="capitalize">{row.original.user?.name}</div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de Creación",
      cell: ({ row }) => {
        return (
          <div className="font-medium">
            {format(
              row.original.createdAt.toDate(),
              "d 'de' MMMM yyyy hh:mm a",
              {
                locale: es,
              }
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        async function deleteInvoice(id: string): Promise<void> {
          try {
            await deleteDoc(doc(db, "invoices", id));
            toast.success("Factura eliminada");
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
          } catch (error) {
            console.error("Error al eliminar la factura", error);
            toast.error("No se pudo eliminar la factura");
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
              <ConfirmDialog
                title="Eliminar factura"
                description="Esta acción no se puede deshacer."
                onConfirm={() => deleteInvoice(row.original.id)}
              >
                <div className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer">
                  Eliminar
                </div>
              </ConfirmDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: invoices,
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
      <h3 className="text-2xl font-semibold">Facturas</h3>
      <span className="text-muted-foreground text-sm">
        Gestiona la información de las facturas
      </span>
      <div
        className={`grid w-full py-4 mt-2 gap-4 ${
          isMobile ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        <Input
          placeholder="Buscar..."
          value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("id")?.setFilterValue(event.target.value)
          }
          className="w-full"
        />

        <div className="grid grid-cols-2 gap-2 ">
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

          <NewInvoiceDialog
            invoice={invoiceToEdit}
            onEditDone={() => setInvoiceToEdit(null)}
            onSuccess={async ({ id, mode }) => {
              if (mode === "create") {
                const printableInvoice = await fetchInvoiceWithRelations(id);
                if (printableInvoice) {
                  setSelectedInvoice(printableInvoice);
                  setTimeout(() => print(), 200);
                }
              }
            }}
          />
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
                  No se encontraron facturas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
      {selectedInvoice && <PrintContainer invoice={selectedInvoice} />}
    </div>
  );
}
