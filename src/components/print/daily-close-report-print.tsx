"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import type {
  DailyCloseExpenseRow,
  DailyCloseIncomeRow,
  DailyCloseMovementRow,
  DailyCloseSummary,
} from "@/hooks/use-daily-close-report";
import type { Currency } from "@/types/bank-account.types";

export type DailyCloseReportPrintProps = {
  title: string;
  description: string;
  dateLabel: string;
  branchLabel: string;
  currency: Currency;
  summary: DailyCloseSummary;
  cashIncomeRows: DailyCloseIncomeRow[];
  transferIncomeRows: DailyCloseIncomeRow[];
  expenseRows: DailyCloseExpenseRow[];
  movementRows: DailyCloseMovementRow[];
};

function formatMoney(currency: Currency, amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function movementTypeLabel(row: DailyCloseMovementRow) {
  if (row.kind === "expense") return "Gasto";
  return row.method === "cash" ? "Ingreso efectivo" : "Ingreso transferencia";
}

export const DailyCloseReportPrint = forwardRef<
  HTMLDivElement,
  DailyCloseReportPrintProps
>(
  (
    {
      title,
      description,
      dateLabel,
      branchLabel,
      currency,
      summary,
      cashIncomeRows,
      transferIncomeRows,
      expenseRows,
      movementRows,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        style={{
          padding: "16px",
          color: "#000",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontSize: "12px",
          lineHeight: 1.4,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          boxSizing: "border-box",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "16px" }}>{title}</h2>
          <p style={{ margin: "2px 0", color: "#555" }}>{description}</p>
          <p style={{ margin: "2px 0", color: "#555" }}>
            Fecha: {dateLabel} · Sucursal: {branchLabel}
          </p>
        </div>

        <section style={{ marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            Consolidado del día
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              ["Ingreso por transferencia", summary.transferIncome],
              ["Ingreso en efectivo", summary.cashIncome],
              ["Gastos del día", summary.expenses],
              ["Neto del día", summary.net],
            ].map(([label, value]) => (
              <div
                key={label as string}
                style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px" }}
              >
                <div style={{ fontSize: "11px", color: "#666" }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{formatMoney(currency, Number(value))}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            Divisiones del día
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "4px" }}>
                  División
                </th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "4px" }}>
                  Cantidad de movimientos
                </th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "4px" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Ingresos por transferencia", transferIncomeRows.length, summary.transferIncome],
                ["Ingresos en efectivo", cashIncomeRows.length, summary.cashIncome],
                ["Gastos", expenseRows.length, summary.expenses],
              ].map(([label, count, total]) => (
                <tr key={label as string}>
                  <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0" }}>{label}</td>
                  <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                    {count}
                  </td>
                  <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0", textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(currency, Number(total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            Movimientos del día
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {[
                  "Hora",
                  "Tipo",
                  "Descripción",
                  "Cuenta",
                  "Monto",
                ].map((header, index) => (
                  <th
                    key={header}
                    style={{
                      textAlign: index === 4 ? "right" : "left",
                      borderBottom: "1px solid #ddd",
                      padding: "4px",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movementRows.length ? (
                movementRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0" }}>
                      {format(row.date, "hh:mm a", { locale: es })}
                    </td>
                    <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0" }}>
                      {movementTypeLabel(row)}
                    </td>
                    <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0" }}>
                      {row.description}
                    </td>
                    <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0" }}>
                      {row.bankAccountName || (row.kind === "income" && row.method === "cash" ? "Efectivo" : "Sin cuenta")}
                    </td>
                    <td style={{ padding: "4px", borderBottom: "1px solid #f0f0f0", textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(currency, row.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "8px" }}>
                    Sin movimientos en la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    );
  },
);

DailyCloseReportPrint.displayName = "DailyCloseReportPrint";
