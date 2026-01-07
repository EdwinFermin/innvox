"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type DailyRow = {
  key: string;
  label: string;
  ingresos: number;
  gastos: number;
  cxc: number;
  cxp: number;
  utilidad: number;
};

export type TransactionRow = {
  id: string;
  type: string;
  date: Date;
  branch?: string;
  name: string;
  description: string;
  amount: number;
};

export type ProfitReportPrintProps = {
  title: string;
  description: string;
  dateRangeLabel: string;
  branchLabel: string;
  totals: {
    ingresos: number;
    gastos: number;
    cxc: number;
    cxp: number;
    utilidad: number;
  };
  daily: DailyRow[];
  transactions: TransactionRow[];
  currency: Intl.NumberFormat;
};

export const ProfitReportPrint = forwardRef<
  HTMLDivElement,
  ProfitReportPrintProps
>(
  (
    {
      title,
      description,
      dateRangeLabel,
      branchLabel,
      totals,
      daily,
      transactions,
      currency,
    },
    ref
  ) => {
    const colorByLabel: Record<string, string> = {
      Ingresos: "#0f9d58",
      Gastos: "#d32f2f",
      CxC: "#1e88e5",
      CxP: "#f59e0b",
      "Utilidad neta": totals.utilidad >= 0 ? "#0f9d58" : "#d32f2f",
    };

    const colorByType: Record<string, string> = {
      Ingreso: "#0f9d58",
      Gasto: "#d32f2f",
      CxC: "#1e88e5",
      CxP: "#f59e0b",
    };
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
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "16px" }}>{title}</h2>
          <p style={{ margin: "2px 0", color: "#555" }}>{description}</p>
          <p style={{ margin: "2px 0", color: "#555" }}>
            Rango: {dateRangeLabel} · Sucursal: {branchLabel}
          </p>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          {[
            { label: "Ingresos", value: totals.ingresos },
            { label: "Gastos", value: totals.gastos },
            { label: "CxC", value: totals.cxc },
            { label: "CxP", value: totals.cxp },
            { label: "Utilidad neta", value: totals.utilidad },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "8px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#666" }}>
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: colorByLabel[card.label] ?? "#111",
                }}
              >
                {currency.format(card.value)}
              </div>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            Resumen diario
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {["Fecha", "Ingresos", "Gastos", "CxC", "CxP", "Utilidad"].map(
                  (h, idx) => (
                    <th
                      key={h}
                      style={{
                        textAlign: idx === 0 ? "left" : "right",
                        borderBottom: "1px solid #ddd",
                        padding: "4px",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {daily.length ? (
                daily.map((row) => (
                  <tr key={row.key}>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        color: "#0f9d58",
                      }}
                    >
                      {currency.format(row.ingresos)}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        color: "#d32f2f",
                      }}
                    >
                      {currency.format(row.gastos)}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        color: "#1e88e5",
                      }}
                    >
                      {currency.format(row.cxc)}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        color: "#f59e0b",
                      }}
                    >
                      {currency.format(row.cxp)}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        fontWeight: 600,
                        textAlign: "right",
                        color: row.utilidad >= 0 ? "#0f9d58" : "#d32f2f",
                      }}
                    >
                      {currency.format(row.utilidad)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", padding: "8px" }}
                  >
                    Sin datos en el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            Transacciones
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {[
                  "Tipo",
                  "Fecha",
                  "Sucursal",
                  "Nombre",
                  "Descripción",
                  "Monto",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Monto" ? "right" : "left",
                      borderBottom: "1px solid #ddd",
                      padding: "4px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length ? (
                transactions.map((row) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {row.type}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {format(row.date, "d 'de' MMM yyyy", { locale: es })}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {row.branch || "Sin sucursal"}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {row.name}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      {row.description}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        fontWeight: 600,
                        color:
                          colorByType[row.type] ??
                          (row.type === "Gasto" || row.type === "CxP"
                            ? "#d32f2f"
                            : "#0f9d58"),
                      }}
                    >
                      {currency.format(
                        row.type === "Gasto" || row.type === "CxP"
                          ? -row.amount
                          : row.amount
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", padding: "8px" }}
                  >
                    Sin transacciones en el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    );
  }
);

ProfitReportPrint.displayName = "ProfitReportPrint";
