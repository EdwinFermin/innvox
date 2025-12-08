"use client";

import { Invoice } from "@/types/invoice.types";
import React, { forwardRef } from "react";

export const Receipt80mm = forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const items = invoice.items ?? [];
    const subtotal = items.reduce(
      (sum, item) => sum + (item.unitPrice ?? 0),
      0
    );
    const totalWeight = items.reduce((sum, item) => {
      const weightValue = item.weight?.replace(/[^\d.]/g, "");
      const numericWeight = weightValue ? Number(weightValue) : 0;
      return sum + (Number.isFinite(numericWeight) ? numericWeight : 0);
    }, 0);
    const total = subtotal + invoice.ITBIS;

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          padding: "10px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0 }}>COENMA SRL</h2>
          <p style={{ margin: "4px 0" }}>COMPROBANTE AUTORIZADO POR LA DGII</p>
          <hr />
        </div>
        <br />
        <div>
          <p>
            <b>Fecha:</b> {invoice.createdAt.toDate().toLocaleString()}
          </p>
          <p>
            <b>Factura #:</b> {invoice.id}
          </p>
          <p>
            <b>Cliente:</b> {invoice.client?.name} {invoice.client?.poBox}
          </p>
          <p>
            <b>NCF:</b> {invoice.NCF}
          </p>
        </div>
        <br />
        <hr />
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "4px 0" }}>
            {invoice.invoiceType === "FISCAL"
              ? "FACTURA CON VALOR FISCAL"
              : invoice.invoiceType === "FINAL"
              ? "FACTURA PARA CONSUMIDOR FINAL"
              : "PRE-CUENTA"}
          </p>
        </div>
        <hr />
        <div style={{ marginTop: "8px" }}>
          {items.length ? (
            items.map((item, index) => (
              <div
                key={item.itemId || index}
                style={{
                  borderBottom: "1px dashed #ccc",
                  paddingBottom: "6px",
                  marginBottom: "6px",
                }}
              >
                <p style={{ margin: "0 0 4px 0" }}>
                  <b>Item #{index + 1}</b>
                </p>
                <p style={{ margin: "0 0 2px 0" }}>
                  <b>Descripción:</b> {item.description}
                </p>
                <p style={{ margin: "0 0 2px 0" }}>
                  <b>Guía:</b> {item.itemId || "-"}
                </p>
                <p style={{ margin: "0 0 2px 0" }}>
                  <b>Tracking:</b> {item.tracking || "-"}
                </p>
                <p style={{ margin: "0 0 2px 0" }}>
                  <b>Peso:</b> {item.weight || "-"}
                </p>
                <p style={{ margin: 0 }}>
                  <b>Precio:</b> {item.unitPrice.toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", margin: "8px 0" }}>
              Sin items registrados
            </p>
          )}
        </div>
        <hr />
        <div style={{ textAlign: "right" }}>
          <p>
            <b>Total Items:</b> {items.length}
          </p>
          <p>
            <b>Total Libras:</b> {totalWeight.toFixed(2)}
          </p>
          <p>
            <b>Subtotal:</b> {subtotal.toFixed(2)}
          </p>
          <p>
            <b>ITBIS:</b> {invoice.ITBIS.toFixed(2)}
          </p>
          <p>
            <b>Total:</b> {total.toFixed(2)}
          </p>
        </div>
        <hr />
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <p>Gracias por preferirnos!</p>
        </div>
      </div>
    );
  }
);

Receipt80mm.displayName = "Receipt80mm";
