"use client";

import { Invoice } from "@/types/invoice.types";
import React, { forwardRef } from "react";

export const Receipt80mm = forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
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
          <p style={{ margin: "4px 0" }}>FACTURA {invoice.isFiscalReceipt ? "CON VALOR FISCAL" : "PARA CONSUMIDOR FINAL"}</p>
        </div>
        <hr />
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Item</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{invoice.description}</td>
              <td style={{ textAlign: "right" }}>1</td>
              <td style={{ textAlign: "right" }}>
                {invoice.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <hr />
        <br />
        <div style={{ textAlign: "right" }}>
          <p>
            <b>Subtotal:</b> {invoice.amount.toFixed(2)}
          </p>
          <p>
            <b>ITBIS:</b> {invoice.ITBIS.toFixed(2)}
          </p>
          <p>
            <b>Total:</b> {(invoice.amount + invoice.ITBIS).toFixed(2)}
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
