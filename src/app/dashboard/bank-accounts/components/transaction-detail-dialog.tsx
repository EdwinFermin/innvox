"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { BankTransaction, BankTransactionType } from "@/types/bank-transaction.types";
import { formatDateOnly } from "@/utils/dates";

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
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

const getTransactionTypeBadgeClassName = (type: BankTransactionType): string => {
  switch (type) {
    case "deposit":
    case "transfer_in":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "withdrawal":
    case "transfer_out":
    case "lbtr_fee":
    case "transfer_tax":
      return "border-transparent bg-rose-100 text-rose-800";
    case "adjustment":
      return "border-transparent bg-amber-100 text-amber-800";
    default:
      return "border-transparent bg-slate-100 text-slate-800";
  }
};

interface TransactionDetailDialogProps {
  transaction: BankTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  branchNameById: Record<string, string>;
  userNameById: Record<string, string>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
  currency,
  branchNameById,
  userNameById,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const isNegative =
    transaction.type === "withdrawal" ||
    transaction.type === "transfer_out" ||
    transaction.type === "lbtr_fee" ||
    transaction.type === "transfer_tax" ||
    transaction.amount < 0;

  const relatedAccount = transaction.related_account_name
    ? `${transaction.related_account_name}${transaction.related_account_number_last4 ? ` ****${transaction.related_account_number_last4}` : ""}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de transaccion</DialogTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {transaction.friendly_id}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Fecha">
            {formatDateOnly(transaction.date, "d 'de' MMMM yyyy", es) ?? "—"}
          </DetailRow>
          <DetailRow label="Tipo">
            <Badge
              variant="outline"
              className={getTransactionTypeBadgeClassName(transaction.type)}
            >
              {getTransactionTypeLabel(transaction.type)}
            </Badge>
          </DetailRow>
          <DetailRow label="Monto">
            <span className={isNegative ? "text-red-500" : "text-green-600"}>
              {isNegative ? "-" : "+"}
              {formatCurrency(Math.abs(transaction.amount), currency)}
            </span>
          </DetailRow>
          <DetailRow label="Balance despues">
            {formatCurrency(transaction.balance_after, currency)}
          </DetailRow>
        </div>

        <Separator />

        <div className="space-y-3">
          <DetailRow label="Descripcion">
            {transaction.description || "—"}
          </DetailRow>
          <DetailRow label="Sucursal">
            {transaction.linked_branch_id
              ? branchNameById[transaction.linked_branch_id] ?? "—"
              : "—"}
          </DetailRow>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Ingreso vinculado">
            {transaction.linked_income_friendly_id ? (
              <span className="font-mono text-xs">
                {transaction.linked_income_friendly_id}
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Gasto vinculado">
            {transaction.linked_expense_friendly_id ? (
              <span className="font-mono text-xs">
                {transaction.linked_expense_friendly_id}
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Cuenta relacionada">
            {relatedAccount ?? "—"}
          </DetailRow>
          <DetailRow label="Transferencia relacionada">
            {transaction.related_transfer_friendly_id ? (
              <span className="font-mono text-xs">
                {transaction.related_transfer_friendly_id}
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Creado por">
            {transaction.created_by
              ? userNameById[transaction.created_by] ?? "—"
              : "—"}
          </DetailRow>
          <DetailRow label="Fecha de creacion">
            {transaction.created_at
              ? format(new Date(transaction.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })
              : "—"}
          </DetailRow>
        </div>
      </DialogContent>
    </Dialog>
  );
}
