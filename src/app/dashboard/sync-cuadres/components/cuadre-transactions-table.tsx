"use client";

import * as React from "react";
import { es } from "date-fns/locale";

import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useBranchBankAccounts } from "@/hooks/use-bank-accounts";
import { useAuthStore } from "@/store/auth";
import type { Branch } from "@/types/branch.types";
import type { CuadreFetchResult, CuadrePreparedTransaction } from "@/types/cuadre.types";
import { formatDateOnly } from "@/utils/dates";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

interface CuadreTransactionsTableProps {
  cuadre: CuadreFetchResult;
  branch: Branch;
  assignments: Record<string, string>;
  showDateColumn?: boolean;
  onAssignmentChange: (externalRef: string, accountId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function KindBadge({ kind }: { kind: CuadrePreparedTransaction["kind"] }) {
  if (kind === "efectivo") return <Badge variant="secondary">Efectivo</Badge>;
  if (kind === "transferencia") return <Badge variant="default">Transferencia</Badge>;
  return <Badge variant="destructive">No soportado</Badge>;
}

export function CuadreTransactionsTable({
  cuadre,
  branch,
  assignments,
  showDateColumn = false,
  onAssignmentChange,
  onSubmit,
  submitting,
}: CuadreTransactionsTableProps) {
  const { user } = useAuthStore();
  const { data: bankAccounts } = useBranchBankAccounts(user?.id || "", branch.id);

  const cashAccountName = React.useMemo(() => {
    if (!branch.default_cash_account_id) return null;
    return branch.default_cash_account_id;
  }, [branch.default_cash_account_id]);

  const pendingTransfers = cuadre.prepared.filter(
    (t) => t.kind === "transferencia" && !t.alreadySynced,
  );
  const allTransfersAssigned = pendingTransfers.every(
    (t) => assignments[t.external_ref],
  );
  const hasSyncableRows = cuadre.prepared.some(
    (t) => !t.alreadySynced && t.kind !== "otro",
  );

  const columnCount = 6 + (showDateColumn ? 1 : 0);

  return (
    <div className="dashboard-panel flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">Transacciones del cuadre</h2>
          {cuadre.rangeLabel && (
            <p className="text-xs text-muted-foreground">{cuadre.rangeLabel}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Total general:{" "}
          <span className="font-medium">{currencyFormatter.format(cuadre.totalGeneral)}</span>
        </p>
      </div>

      <div className="dashboard-table-frame">
        <Table>
          <TableHeader>
            <TableRow>
              {showDateColumn && <TableHead>Fecha</TableHead>}
              <TableHead>Recibo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuadre.prepared.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-20 text-center text-muted-foreground">
                  Sin transacciones para esta fecha.
                </TableCell>
              </TableRow>
            ) : (
              cuadre.prepared.map((tx) => (
                <TableRow key={tx.external_ref}>
                  {showDateColumn && (
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateOnly(tx.date, "dd MMM yyyy", es) ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">{tx.receipt}</TableCell>
                  <TableCell>{tx.customer}</TableCell>
                  <TableCell className="text-right font-medium">
                    {currencyFormatter.format(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <KindBadge kind={tx.kind} />
                  </TableCell>
                  <TableCell>
                    {tx.alreadySynced ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : tx.kind === "efectivo" ? (
                      <span className="text-xs text-muted-foreground">
                        Caja por defecto
                      </span>
                    ) : tx.kind === "transferencia" ? (
                      <Select
                        value={assignments[tx.external_ref] || ""}
                        onValueChange={(val) => onAssignmentChange(tx.external_ref, val)}
                        disabled={submitting}
                      >
                        <SelectTrigger className="h-9 w-full rounded-xl border-border/70 bg-background">
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.length === 0 ? (
                            <SelectItem value="__none__" disabled>
                              Sin cuentas bancarias para esta sucursal
                            </SelectItem>
                          ) : (
                            bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <BankAccountOptionContent account={account} />
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">No aplica</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.alreadySynced ? (
                      <Badge variant="outline">Ya importada</Badge>
                    ) : tx.kind === "otro" ? (
                      <span className="text-xs text-destructive">
                        Método &quot;{tx.forma_pago_raw}&quot; no soportado
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendiente</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {cashAccountName === null && (
        <p className="text-sm text-destructive">
          Esta sucursal no tiene una cuenta de caja por defecto configurada.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {!allTransfersAssigned && (
          <p className="text-sm text-muted-foreground">
            Selecciona la cuenta bancaria de cada transferencia para continuar.
          </p>
        )}
        <Button
          type="button"
          variant="default"
          className="rounded-2xl"
          disabled={
            submitting || !allTransfersAssigned || !hasSyncableRows
          }
          onClick={onSubmit}
        >
          {submitting ? "Creando ingresos…" : "Crear ingresos"}
        </Button>
      </div>
    </div>
  );
}
