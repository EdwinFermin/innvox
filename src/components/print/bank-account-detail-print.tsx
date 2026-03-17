"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { BankAccount } from "@/types/bank-account.types";
import type {
  BankTransaction,
  BankTransactionType,
} from "@/types/bank-transaction.types";

export type BankAccountDetailPrintProps = {
  account: BankAccount;
  branchNames: string;
  transactions: BankTransaction[];
  generatedAt: Date;
};

const getTransactionTypeLabel = (type: BankTransactionType): string => {
  const labels: Record<BankTransactionType, string> = {
    deposit: "Deposito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrante",
    transfer_out: "Transferencia saliente",
    adjustment: "Ajuste",
  };

  return labels[type];
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const BankAccountDetailPrint = forwardRef<
  HTMLDivElement,
  BankAccountDetailPrintProps
>(({ account, branchNames, transactions, generatedAt }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        padding: "16px",
        color: "#111",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        fontSize: "12px",
        lineHeight: 1.5,
        width: "100%",
        boxSizing: "border-box",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>Detalle de cuenta</h1>
        <p style={{ margin: "4px 0", color: "#555" }}>
          Impreso el {format(generatedAt, "d 'de' MMMM yyyy, h:mm a", { locale: es })}
        </p>
      </div>

      <section style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>{account.account_name}</div>
        <p style={{ margin: "4px 0", color: "#555", fontFamily: "monospace" }}>
          {account.friendly_id}
        </p>
        <p style={{ margin: "4px 0", color: "#555" }}>
          {account.account_type === "bank"
            ? `${account.bank_name || "Cuenta bancaria"}${account.account_number ? ` - ${account.account_number}` : ""}`
            : "Caja"}
        </p>
        <p style={{ margin: "4px 0", color: "#555" }}>
          Sucursales: {branchNames || "-"}
        </p>
        <p style={{ margin: "4px 0", color: "#555" }}>
          Balance actual: {formatCurrency(account.current_balance, account.currency)}
        </p>
      </section>

      <section>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "15px" }}>
          Historial de movimientos
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              {[
                "Codigo transaccion",
                "Codigo ingreso/gasto",
                "Fecha",
                "Tipo",
                "Descripcion",
                "Monto",
                "Balance",
              ].map((label, index) => (
                <th
                  key={label}
                  style={{
                    padding: "6px",
                    textAlign: index >= 5 ? "right" : "left",
                    borderBottom: "1px solid #d4d4d8",
                    fontSize: "11px",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length ? (
              transactions.map((transaction) => {
                const movementId =
                  transaction.linked_income_friendly_id ??
                  transaction.linked_expense_friendly_id ??
                  "-";
                const isNegative =
                  transaction.type === "withdrawal" ||
                  transaction.type === "transfer_out" ||
                  transaction.amount < 0;

                return (
                  <tr key={transaction.id}>
                    <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                      <span style={{ color: "#71717a", fontFamily: "monospace" }}>
                        {transaction.friendly_id}
                      </span>
                    </td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                      <span style={{ color: "#71717a", fontFamily: "monospace" }}>
                        {movementId}
                      </span>
                    </td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                      {format(new Date(transaction.date), "d/MM/yyyy", { locale: es })}
                    </td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                      {getTransactionTypeLabel(transaction.type)}
                    </td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                      {transaction.description || "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                        color: isNegative ? "#dc2626" : "#16a34a",
                        fontWeight: 600,
                      }}
                    >
                      {isNegative ? "-" : "+"}
                      {formatCurrency(Math.abs(transaction.amount), account.currency)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(transaction.balance_after, account.currency)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    color: "#71717a",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  No hay movimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
});

BankAccountDetailPrint.displayName = "BankAccountDetailPrint";
